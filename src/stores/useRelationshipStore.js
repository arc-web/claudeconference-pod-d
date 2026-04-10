import { create } from 'zustand';
import db from '../db/database';

const useRelationshipStore = create((set, get) => ({
  relationships: [],
  isHydrated: false,

  hydrate: async () => {
    const data = await db.relationships
      .filter(r => !r.is_archived)
      .toArray();
    set({ relationships: data, isHydrated: true });
  },

  addRelationship: async (relationship) => {
    const now = new Date().toISOString();
    const record = {
      ...relationship,
      user_id: 1,
      is_archived: false,
      created_at: now,
      updated_at: now
    };
    const id = await db.relationships.add(record);
    const newRecord = { ...record, id };
    set(state => ({
      relationships: [...state.relationships, newRecord]
    }));
    return id;
  },

  updateRelationship: async (id, updates) => {
    const now = new Date().toISOString();
    set(state => ({
      relationships: state.relationships.map(r =>
        r.id === id ? { ...r, ...updates, updated_at: now } : r
      )
    }));
    await db.relationships.update(id, { ...updates, updated_at: now });
  },

  archiveRelationship: async (id) => {
    const now = new Date().toISOString();
    set(state => ({
      relationships: state.relationships.filter(r => r.id !== id)
    }));
    await db.relationships.update(id, { is_archived: true, updated_at: now });
  },

  getRelationshipById: (id) => {
    return get().relationships.find(r => r.id === id);
  }
}));

export default useRelationshipStore;
