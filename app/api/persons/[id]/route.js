import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updatePerson, deletePerson } from '@/lib/db'

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
  const { name } = await request.json()
  return NextResponse.json(await updatePerson(params.id, userId, name))
}

export async function DELETE(request, { params }) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await deletePerson(params.id, userId)
  return NextResponse.json({ ok: true })
}
