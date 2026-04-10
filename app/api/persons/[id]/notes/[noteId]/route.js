import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateNote, deleteNote } from '@/lib/db'

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
  const { content } = await request.json()
  return NextResponse.json(await updateNote(params.noteId, userId, content))
}

export async function DELETE(request, { params }) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await deleteNote(params.noteId, userId)
  return NextResponse.json({ ok: true })
}
