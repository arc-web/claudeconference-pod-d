import { createClient } from '@supabase/supabase-js'

export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function getPersons(userId) {
  const { data } = await adminClient()
    .from('persons')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createPerson(userId, name) {
  const { data } = await adminClient()
    .from('persons')
    .insert({ user_id: userId, name })
    .select()
    .single()
  return data
}

export async function updatePerson(id, userId, name) {
  const { data } = await adminClient()
    .from('persons')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  return data
}

export async function deletePerson(id, userId) {
  await adminClient().from('persons').delete().eq('id', id).eq('user_id', userId)
}

export async function getNotes(personId, userId) {
  const { data } = await adminClient()
    .from('person_notes')
    .select('*')
    .eq('person_id', personId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createNote(personId, userId, content) {
  const { data } = await adminClient()
    .from('person_notes')
    .insert({ person_id: personId, user_id: userId, content })
    .select()
    .single()
  return data
}

export async function updateNote(id, userId, content) {
  const { data } = await adminClient()
    .from('person_notes')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  return data
}

export async function deleteNote(id, userId) {
  await adminClient().from('person_notes').delete().eq('id', id).eq('user_id', userId)
}
