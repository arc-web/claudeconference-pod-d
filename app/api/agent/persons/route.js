import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/db'

// ZeroClaw calls this to get all persons across all users to proactively push cards
export async function GET(request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AGENT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await adminClient()
    .from('persons')
    .select('id, user_id, name, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
