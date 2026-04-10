'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [persons, setPersons] = useState([])
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

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

  const loadPersons = useCallback(async () => {
    const res = await authFetch('/api/persons')
    if (!res) return
    setPersons(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setUserEmail(session.user.email)
      loadPersons()
    })
  }, [router, loadPersons])

  async function addPerson(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const res = await authFetch('/api/persons', {
      method: 'POST',
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res?.ok) {
      const person = await res.json()
      setPersons(prev => [person, ...prev])
      setNewName('')
    }
  }

  async function savePerson(id) {
    const res = await authFetch(`/api/persons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: editName }),
    })
    if (res?.ok) {
      const updated = await res.json()
      setPersons(prev => prev.map(p => p.id === id ? updated : p))
      setEditId(null)
    }
  }

  async function removePerson(id) {
    if (!confirm('Delete this person and all their notes?')) return
    const res = await authFetch(`/api/persons/${id}`, { method: 'DELETE' })
    if (res?.ok) setPersons(prev => prev.filter(p => p.id !== id))
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return <div className="container"><p>Loading…</p></div>

  return (
    <div className="container">
      <div className="top-bar">
        <h1 style={{ marginBottom: 0 }}>People</h1>
        <div className="row gap-2">
          <span style={{ fontSize: '0.85rem', color: '#666' }}>{userEmail}</span>
          <button className="btn-secondary btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div className="card">
        <form onSubmit={addPerson} className="row">
          <input
            className="flex-1"
            placeholder="Add a person…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <button className="btn-primary" type="submit">Add</button>
        </form>
      </div>

      {persons.length === 0 && <p className="empty">No people yet. Add one above.</p>}

      {persons.map(person => (
        <div key={person.id}>
          {editId === person.id ? (
            <div className="card row">
              <input
                className="flex-1"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
              />
              <button className="btn-primary btn-sm" onClick={() => savePerson(person.id)}>Save</button>
              <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
            </div>
          ) : (
            <div className="person-item" onClick={() => router.push(`/dashboard/${person.id}`)}>
              <span style={{ fontWeight: 500 }}>{person.name}</span>
              <div className="row gap-2" onClick={e => e.stopPropagation()}>
                <button className="btn-secondary btn-sm" onClick={() => { setEditId(person.id); setEditName(person.name) }}>Edit</button>
                <button className="btn-danger btn-sm" onClick={() => removePerson(person.id)}>Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
