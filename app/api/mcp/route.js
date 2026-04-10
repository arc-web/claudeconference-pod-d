import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { adminClient } from '@/lib/db'

function createServer() {
  const server = new McpServer({
    name: 'people-app',
    version: '1.0.0',
  })

  // List all persons across all users
  server.tool('list_persons', 'Get all persons in the system', {}, async () => {
    const { data } = await adminClient()
      .from('persons')
      .select('id, user_id, name, created_at')
      .order('created_at', { ascending: true })
    return { content: [{ type: 'text', text: JSON.stringify(data ?? []) }] }
  })

  // Get notes for a person
  server.tool(
    'get_person_notes',
    'Get all notes for a specific person',
    { person_id: z.string().describe('UUID of the person') },
    async ({ person_id }) => {
      const { data } = await adminClient()
        .from('person_notes')
        .select('*')
        .eq('person_id', person_id)
        .order('created_at', { ascending: false })
      return { content: [{ type: 'text', text: JSON.stringify(data ?? []) }] }
    }
  )

  // Get chat history for a person
  server.tool(
    'get_chat_messages',
    'Get chat messages and agent cards for a specific person',
    { person_id: z.string().describe('UUID of the person') },
    async ({ person_id }) => {
      const { data } = await adminClient()
        .from('chat_messages')
        .select('*')
        .eq('person_id', person_id)
        .order('created_at', { ascending: false })
        .limit(50)
      return { content: [{ type: 'text', text: JSON.stringify(data ?? []) }] }
    }
  )

  // Get a full person context snapshot (persons + notes + recent cards)
  server.tool(
    'get_person_context',
    'Get full context for a person: profile, notes, and recent agent cards',
    { person_id: z.string().describe('UUID of the person') },
    async ({ person_id }) => {
      const [personRes, notesRes, chatRes] = await Promise.all([
        adminClient().from('persons').select('*').eq('id', person_id).single(),
        adminClient().from('person_notes').select('*').eq('person_id', person_id).order('created_at', { ascending: false }),
        adminClient().from('chat_messages').select('*').eq('person_id', person_id).order('created_at', { ascending: false }).limit(20),
      ])
      const context = {
        person: personRes.data,
        notes: notesRes.data ?? [],
        recent_cards: chatRes.data ?? [],
      }
      return { content: [{ type: 'text', text: JSON.stringify(context) }] }
    }
  )

  // Push a proactive card into a person's chat
  server.tool(
    'push_card',
    'Push a proactive suggestion card into a person\'s chat UI',
    {
      person_id: z.string().describe('UUID of the person'),
      user_id: z.string().describe('UUID of the user who owns this person'),
      title: z.string().describe('Short title for the card, e.g. "Gift idea for Chris"'),
      content: z.string().describe('Full suggestion text shown on the card'),
    },
    async ({ person_id, user_id, title, content }) => {
      const { data, error } = await adminClient()
        .from('chat_messages')
        .insert({ person_id, user_id, type: 'agent_card', title, content, status: 'pending' })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return { content: [{ type: 'text', text: JSON.stringify(data) }] }
    }
  )

  // Mark a card as done or rejected
  server.tool(
    'update_card_status',
    'Mark an agent card as done or rejected',
    {
      card_id: z.string().describe('UUID of the chat_message card'),
      status: z.enum(['done', 'rejected']).describe('New status'),
    },
    async ({ card_id, status }) => {
      const { data } = await adminClient()
        .from('chat_messages')
        .update({ status })
        .eq('id', card_id)
        .select()
        .single()
      return { content: [{ type: 'text', text: JSON.stringify(data) }] }
    }
  )

  return server
}

export async function POST(request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AGENT_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const server = createServer()
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)

  const body = await request.json()
  const response = await transport.handleRequest(request, new Response(), body)
  return response
}

export async function GET(request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AGENT_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const server = createServer()
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  const response = await transport.handleRequest(request, new Response(), null)
  return response
}
