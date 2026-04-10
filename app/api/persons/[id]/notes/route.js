import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getNotes, createNote } from '@/lib/db'

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
  return NextResponse.json(await getNotes(params.id, userId))
}

export async function POST(request, { params }) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })
  return NextResponse.json(await createNote(params.id, userId, content.trim()), { status: 201 })
}
