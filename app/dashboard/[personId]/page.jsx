'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PersonPage() {
  const router = useRouter()
  const { personId } = useParams()
  const [notes, setNotes] = useState([])
  const [personName, setPersonName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [editId, setEditId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(true)

  async function authFetch(path, options = {}) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return null }
    return fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...options.headers,
      },
    })
  }

  const load = useCallback(async () => {
    const [personsRes, notesRes] = await Promise.all([
      authFetch('/api/persons'),
      authFetch(`/api/persons/${personId}/notes`),
    ])
    if (!personsRes || !notesRes) return
    const persons = await personsRes.json()
    const found = persons.find(p => p.id === personId)
    if (found) setPersonName(found.name)
    setNotes(await notesRes.json())
    setLoading(false)
  }, [personId])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      load()
    })
  }, [router, load])

  async function addNote(e) {
    e.preventDefault()
    if (!newContent.trim()) return
    const res = await authFetch(`/api/persons/${personId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content: newContent.trim() }),
    })
    if (res?.ok) {
      const note = await res.json()
      setNotes(prev => [note, ...prev])
      setNewContent('')
    }
  }

  async function saveNote(id) {
    const res = await authFetch(`/api/persons/${personId}/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: editContent }),
    })
    if (res?.ok) {
      const updated = await res.json()
      setNotes(prev => prev.map(n => n.id === id ? updated : n))
      setEditId(null)
    }
  }

  async function removeNote(id) {
    if (!confirm('Delete this note?')) return
    const res = await authFetch(`/api/persons/${personId}/notes/${id}`, { method: 'DELETE' })
    if (res?.ok) setNotes(prev => prev.filter(n => n.id !== id))
  }

  if (loading) return <div className="container"><p>Loading…</p></div>

  return (
    <div className="container">
      <button className="back" onClick={() => router.push('/dashboard')}>← Back</button>
      <h1>{personName}</h1>

      <div className="card">
        <h2 style={{ marginBottom: '0.75rem' }}>Add note</h2>
        <form onSubmit={addNote}>
          <textarea
            placeholder="Write anything about this person…"
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
          <div className="mt-1">
            <button className="btn-primary" type="submit">Save note</button>
          </div>
        </form>
      </div>

      {notes.length === 0 && <p className="empty">No notes yet.</p>}

      {notes.map(note => (
        <div key={note.id} className="note-item">
          {editId === note.id ? (
            <>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                autoFocus
              />
              <div className="row gap-2 mt-1">
                <button className="btn-primary btn-sm" onClick={() => saveNote(note.id)}>Save</button>
                <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <p className="note-content">{note.content}</p>
              <div className="row gap-2 mt-1" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="note-meta">{new Date(note.created_at).toLocaleString()}</span>
                <div className="row gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => { setEditId(note.id); setEditContent(note.content) }}>Edit</button>
                  <button className="btn-danger btn-sm" onClick={() => removeNote(note.id)}>Delete</button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
