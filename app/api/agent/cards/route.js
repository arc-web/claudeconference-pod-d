import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/db'

// VPS agent calls this endpoint with an API key to push cards into a person's chat
export async function POST(request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AGENT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { person_id, user_id, title, content } = await request.json()
  if (!person_id || !user_id || !title || !content) {
    return NextResponse.json({ error: 'person_id, user_id, title, and content are required' }, { status: 400 })
  }

  const { data, error } = await adminClient()
    .from('chat_messages')
    .insert({ person_id, user_id, type: 'agent_card', title, content, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
