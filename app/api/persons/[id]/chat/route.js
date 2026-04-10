import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adminClient } from '@/lib/db'

async function getUserId(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ).auth.getUser(token)
  return user?.id ?? null
}

export async function GET(request, { params }) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await adminClient()
    .from('chat_messages')
    .select('*')
    .eq('person_id', params.id)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return NextResponse.json(data ?? [])
}

export async function POST(request, { params }) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })
  const { data } = await adminClient()
    .from('chat_messages')
    .insert({ person_id: params.id, user_id: userId, type: 'user_message', content: content.trim() })
    .select()
    .single()
  return NextResponse.json(data, { status: 201 })
}
