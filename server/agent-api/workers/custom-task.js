/**
 * Custom task runner — Claude-guided browser automation.
 * STUB — to be implemented with a Claude agent loop.
 */
async function customTask(instructions, context, job) {
  await job.updateProgress(10);

  const { description, steps, constraints } = instructions;

  // TODO: Implement Claude agent loop
  // 1. Send task description to Claude with available browser actions
  // 2. Claude returns a plan of steps
  // 3. Execute each step with Playwright
  // 4. After each step, send screenshot + page state back to Claude
  // 5. Claude decides next action or declares task complete
  // 6. Return results

  await job.updateProgress(100);

  return {
    status: 'stub',
    message: 'Custom task execution is not yet implemented. This is a placeholder.',
    request: {
      description,
      steps,
      constraints
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = customTask;
