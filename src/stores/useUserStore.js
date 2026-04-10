import { create } from 'zustand';
import db from '../db/database';

const useUserStore = create((set, get) => ({
  user: null,
  isHydrated: false,

  hydrate: async () => {
    const users = await db.user.toArray();
    set({ user: users[0] || null, isHydrated: true });
  },

  setUser: async (userData) => {
    const now = new Date().toISOString();
    const existing = get().user;

    if (existing) {
      const updated = { ...existing, ...userData, updated_at: now };
      set({ user: updated });
      await db.user.update(existing.id, { ...userData, updated_at: now });
    } else {
      const record = {
        ...userData,
        onboarding_completed: false,
        premium_status: 'free',
        theme: 'system',
        created_at: now,
        updated_at: now
      };
      const id = await db.user.add(record);
      set({ user: { ...record, id } });
    }
  },

  updateUser: async (updates) => {
    const user = get().user;
    if (!user) return;

    const now = new Date().toISOString();
    const updated = { ...user, ...updates, updated_at: now };
    set({ user: updated });
    await db.user.update(user.id, { ...updates, updated_at: now });
  },

  completeOnboarding: async () => {
    const user = get().user;
    if (!user) return;

    const now = new Date().toISOString();
    const updated = { ...user, onboarding_completed: true, updated_at: now };
    set({ user: updated });
    await db.user.update(user.id, { onboarding_completed: true, updated_at: now });
  }
}));

export default useUserStore;
