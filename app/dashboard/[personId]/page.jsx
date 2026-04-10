'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PersonPage() {
  const router = useRouter()
  const { personId } = useParams()
  const [tab, setTab] = useState('chat')
  const [personName, setPersonName] = useState('')
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [editNoteId, setEditNoteId] = useState(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(true)
  const chatBottomRef = useRef(null)

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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const [personsRes, notesRes, chatRes] = await Promise.all([
      authFetch('/api/persons'),
      authFetch(`/api/persons/${personId}/notes`),
      authFetch(`/api/persons/${personId}/chat`),
    ])
    if (!personsRes) return

    const persons = await personsRes.json()
    const found = persons.find(p => p.id === personId)
    if (found) setPersonName(found.name)
    setNotes(await notesRes.json())
    setMessages(await chatRes.json())
    setLoading(false)
  }, [personId])

  useEffect(() => {
    load()
  }, [load])

  // Supabase Realtime subscription for new chat messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${personId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `person_id=eq.${personId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `person_id=eq.${personId}`,
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [personId])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // --- Chat ---
  async function sendMessage(e) {
    e.preventDefault()
    if (!chatInput.trim()) return
    const res = await authFetch(`/api/persons/${personId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ content: chatInput.trim() }),
    })
    if (res?.ok) {
      const msg = await res.json()
      setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg])
      setChatInput('')
    }
  }

  async function updateCardStatus(msgId, status) {
    const res = await authFetch(`/api/persons/${personId}/chat/${msgId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    if (res?.ok) {
      const updated = await res.json()
      setMessages(prev => prev.map(m => m.id === msgId ? updated : m))
    }
  }

  // --- Notes ---
  async function addNote(e) {
    e.preventDefault()
    if (!newNote.trim()) return
    const res = await authFetch(`/api/persons/${personId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content: newNote.trim() }),
    })
    if (res?.ok) {
      setNotes(prev => [await res.json(), ...prev])
      setNewNote('')
    }
  }

  async function saveNote(id) {
    const res = await authFetch(`/api/persons/${personId}/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: editNoteContent }),
    })
    if (res?.ok) {
      const updated = await res.json()
      setNotes(prev => prev.map(n => n.id === id ? updated : n))
      setEditNoteId(null)
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

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${tab === 'chat' ? ' active' : ''}`} onClick={() => setTab('chat')}>Chat</button>
        <button className={`tab-btn${tab === 'notes' ? ' active' : ''}`} onClick={() => setTab('notes')}>Notes</button>
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <div className="chat-wrap">
          <div className="chat-messages">
            {messages.length === 0 && <p className="empty">No messages yet.</p>}
            {messages.map(msg => (
              msg.type === 'agent_card'
                ? <AgentCard key={msg.id} msg={msg} onAction={updateCardStatus} />
                : <UserBubble key={msg.id} msg={msg} />
            ))}
            <div ref={chatBottomRef} />
          </div>
          <form className="chat-input-row" onSubmit={sendMessage}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message…"
              autoComplete="off"
            />
            <button className="btn-primary" type="submit">Send</button>
          </form>
        </div>
      )}

      {/* Notes Tab */}
      {tab === 'notes' && (
        <>
          <div className="card">
            <h2 style={{ marginBottom: '0.75rem' }}>Add note</h2>
            <form onSubmit={addNote}>
              <textarea
                placeholder="Write anything about this person…"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
              />
              <div className="mt-1">
                <button className="btn-primary" type="submit">Save note</button>
              </div>
            </form>
          </div>
          {notes.length === 0 && <p className="empty">No notes yet.</p>}
          {notes.map(note => (
            <div key={note.id} className="note-item">
              {editNoteId === note.id ? (
                <>
                  <textarea value={editNoteContent} onChange={e => setEditNoteContent(e.target.value)} autoFocus />
                  <div className="row gap-2 mt-1">
                    <button className="btn-primary btn-sm" onClick={() => saveNote(note.id)}>Save</button>
                    <button className="btn-secondary btn-sm" onClick={() => setEditNoteId(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="note-content">{note.content}</p>
                  <div className="row gap-2 mt-1" style={{ justifyContent: 'space-between' }}>
                    <span className="note-meta">{new Date(note.created_at).toLocaleString()}</span>
                    <div className="row gap-2">
                      <button className="btn-secondary btn-sm" onClick={() => { setEditNoteId(note.id); setEditNoteContent(note.content) }}>Edit</button>
                      <button className="btn-danger btn-sm" onClick={() => removeNote(note.id)}>Delete</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function UserBubble({ msg }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
      <div className="bubble-user">{msg.content}</div>
    </div>
  )
}

function AgentCard({ msg, onAction }) {
  const done = msg.status === 'done'
  const rejected = msg.status === 'rejected'
  const resolved = done || rejected

  return (
    <div className={`agent-card${resolved ? ' resolved' : ''}`}>
      <div className="agent-card-header">
        <span className="agent-label">Agent</span>
        {done && <span className="badge badge-done">Done</span>}
        {rejected && <span className="badge badge-rejected">Rejected</span>}
      </div>
      <p className="agent-card-title">{msg.title}</p>
      <p className="agent-card-content">{msg.content}</p>
      {!resolved && (
        <div className="row gap-2 mt-2">
          <button className="btn-primary btn-sm" onClick={() => onAction(msg.id, 'done')}>✓ Mark as done</button>
          <button className="btn-danger btn-sm" onClick={() => onAction(msg.id, 'rejected')}>✗ Reject</button>
        </div>
      )}
    </div>
  )
}
