require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');

const researchGifts = require('./workers/research-gifts');
const bookReservation = require('./workers/book-reservation');
const orderFlowers = require('./workers/order-flowers');
const customTask = require('./workers/custom-task');

// ---- Config ----
const PORT = process.env.PORT || 3001;
const AGENT_SECRET = process.env.AGENT_SECRET;
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_BROWSERS, 10) || 1;
const TASK_TIMEOUT = parseInt(process.env.TASK_TIMEOUT_MS, 10) || 300000;

// ---- Redis ----
const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

// ---- Supabase (service role — server-side only) ----
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ---- Task Queue ----
const taskQueue = new Queue('agent-tasks', { connection: redis });

// ---- Express App ----
const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

// ---- Auth Middleware ----
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || token !== AGENT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ---- Routes ----

// Health check — no auth required
app.get('/health', async (req, res) => {
  try {
    const waiting = await taskQueue.getWaitingCount();
    const active = await taskQueue.getActiveCount();
    const completed = await taskQueue.getCompletedCount();
    const failed = await taskQueue.getFailedCount();

    res.json({
      status: 'ok',
      uptime: process.uptime(),
      queue: { waiting, active, completed, failed },
      memory: {
        rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Queue a new task
app.post('/tasks', authenticate, async (req, res) => {
  const { task_type, instructions, context, supabase_task_id } = req.body;

  if (!task_type || !instructions) {
    return res.status(400).json({ error: 'task_type and instructions are required' });
  }

  const validTypes = ['research_gifts', 'book_reservation', 'order_flowers', 'custom'];
  if (!validTypes.includes(task_type)) {
    return res.status(400).json({ error: `Invalid task_type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const job = await taskQueue.add(task_type, {
      task_type,
      instructions,
      context: context || {},
      supabase_task_id
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600 * 24 },
      removeOnFail: { age: 3600 * 24 * 7 }
    });

    res.status(201).json({
      job_id: job.id,
      status: 'queued'
    });
  } catch (err) {
    console.error('Failed to queue task:', err);
    res.status(500).json({ error: 'Failed to queue task' });
  }
});

// Check task status
app.get('/tasks/:id', authenticate, async (req, res) => {
  try {
    const job = await taskQueue.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const state = await job.getState();
    res.json({
      id: job.id,
      status: state,
      data: {
        task_type: job.data.task_type,
        supabase_task_id: job.data.supabase_task_id
      },
      result: job.returnvalue,
      error: job.failedReason,
      progress: job.progress,
      created_at: new Date(job.timestamp).toISOString(),
      finished_at: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel a task
app.post('/tasks/:id/cancel', authenticate, async (req, res) => {
  try {
    const job = await taskQueue.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const state = await job.getState();
    if (state === 'completed' || state === 'failed') {
      return res.status(409).json({ error: `Task already ${state}` });
    }

    await job.remove();

    // Update Supabase if we have a task ID
    if (job.data.supabase_task_id) {
      await updateSupabaseTask(job.data.supabase_task_id, {
        status: 'cancelled',
        completed_at: new Date().toISOString()
      });
    }

    res.json({ status: 'cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Supabase Helper ----
async function updateSupabaseTask(taskId, updates) {
  try {
    const { error } = await supabase
      .from('agent_tasks')
      .update(updates)
      .eq('id', taskId);
    if (error) console.error('Supabase update error:', error);
  } catch (err) {
    console.error('Failed to update Supabase task:', err);
  }
}

// ---- Task Worker ----
const worker = new Worker('agent-tasks', async (job) => {
  const { task_type, instructions, context, supabase_task_id } = job.data;

  console.log(`[Worker] Starting ${task_type} job ${job.id}`);

  // Update Supabase status to in_progress
  if (supabase_task_id) {
    await updateSupabaseTask(supabase_task_id, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
  }

  let result;
  try {
    switch (task_type) {
      case 'research_gifts':
        result = await researchGifts(instructions, context, job);
        break;
      case 'book_reservation':
        result = await bookReservation(instructions, context, job);
        break;
      case 'order_flowers':
        result = await orderFlowers(instructions, context, job);
        break;
      case 'custom':
        result = await customTask(instructions, context, job);
        break;
      default:
        throw new Error(`Unknown task type: ${task_type}`);
    }

    // Update Supabase with results
    if (supabase_task_id) {
      await updateSupabaseTask(supabase_task_id, {
        status: 'completed',
        result,
        completed_at: new Date().toISOString()
      });
    }

    console.log(`[Worker] Completed ${task_type} job ${job.id}`);
    return result;

  } catch (err) {
    // Update Supabase with failure
    if (supabase_task_id) {
      await updateSupabaseTask(supabase_task_id, {
        status: 'failed',
        error: err.message,
        completed_at: new Date().toISOString()
      });
    }
    throw err;
  }
}, {
  connection: redis,
  concurrency: MAX_CONCURRENT,
  limiter: { max: MAX_CONCURRENT, duration: 1000 }
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Worker] Error:', err);
});

// ---- Start ----
app.listen(PORT, '127.0.0.1', () => {
  console.log(`GiftMaster Agent API running on 127.0.0.1:${PORT}`);
  console.log(`Max concurrent browsers: ${MAX_CONCURRENT}`);
  console.log(`Task timeout: ${TASK_TIMEOUT}ms`);
});
