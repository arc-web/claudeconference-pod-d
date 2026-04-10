import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getNotes, adminClient } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

async function getUserId(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ).auth.getUser(token)
  return user?.id ?? null
}

export async function POST(request, { params }) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: personId } = await params
  const notes = await getNotes(personId, userId)

  console.log(`[suggest] personId=${personId} userId=${userId} notes=${notes.length}`)

  if (!notes.length) {
    return NextResponse.json({ suggestion: '• Add some notes about this person first to get personalized suggestions!' })
  }

  const notesText = notes.map(n => `- ${n.content}`).join('\n')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    messages: [{
      role: 'user',
      content: `You are a thoughtful gift advisor. Based on the following notes about a person, suggest specific, actionable gift ideas grouped by category.\n\nNotes:\n${notesText}\n\nFormat your response as categorized sections. Each section has a bold header (e.g. **Art & creative life**) followed by bullet points starting with "• ". 3-5 categories, 2-3 items each. Be specific and personal to the notes. No intro sentence, start directly with the first category.`
    }]
  })

  const response = await stream.finalMessage()
  const suggestion = response.content.find(b => b.type === 'text')?.text ?? 'No suggestion generated.'

  const { data: saved } = await adminClient()
    .from('chat_messages')
    .insert({ person_id: personId, user_id: userId, type: 'suggestion', content: suggestion })
    .select()
    .single()

  return NextResponse.json({ suggestion, message: saved })
}
