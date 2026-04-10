import { create } from 'zustand';
import db from '../db/database';

const useGiftStore = create((set, get) => ({
  gifts: [],
  isHydrated: false,

  hydrate: async () => {
    const data = await db.gifts.toArray();
    set({ gifts: data, isHydrated: true });
  },

  addGift: async (gift) => {
    const now = new Date().toISOString();
    const record = {
      ...gift,
      status: gift.status || 'idea',
      created_at: now,
      updated_at: now
    };
    const id = await db.gifts.add(record);
    const newRecord = { ...record, id };
    set(state => ({
      gifts: [...state.gifts, newRecord]
    }));
    return id;
  },

  updateGift: async (id, updates) => {
    const now = new Date().toISOString();
    set(state => ({
      gifts: state.gifts.map(g =>
        g.id === id ? { ...g, ...updates, updated_at: now } : g
      )
    }));
    await db.gifts.update(id, { ...updates, updated_at: now });
  },

  updateGiftStatus: async (id, status) => {
    const now = new Date().toISOString();
    const updates = { status, updated_at: now };
    if (status === 'given') {
      updates.given_date = now;
    }
    set(state => ({
      gifts: state.gifts.map(g =>
        g.id === id ? { ...g, ...updates } : g
      )
    }));
    await db.gifts.update(id, updates);
  },

  deleteGift: async (id) => {
    set(state => ({
      gifts: state.gifts.filter(g => g.id !== id)
    }));
    await db.gifts.delete(id);
  },

  getGiftsByRelationship: (relationshipId) => {
    return get().gifts.filter(g => g.relationship_id === relationshipId);
  }
}));

export default useGiftStore;
