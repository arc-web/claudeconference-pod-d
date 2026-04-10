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

export async function PATCH(request, { params }) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { status } = await request.json()
  if (!['done', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const { data } = await adminClient()
    .from('chat_messages')
    .update({ status })
    .eq('id', params.msgId)
    .eq('user_id', userId)
    .select()
    .single()
  return NextResponse.json(data)
}
