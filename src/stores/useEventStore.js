import { create } from 'zustand';
import { addYears, addMonths, addWeeks, isPast, startOfDay } from 'date-fns';
import db from '../db/database';

function calculateNextOccurrence(dateStr, recurrence) {
  const date = new Date(dateStr);
  const today = startOfDay(new Date());

  if (recurrence === 'none') {
    return dateStr;
  }

  let next = new Date(date);
  const advanceFn = {
    yearly: (d) => addYears(d, 1),
    monthly: (d) => addMonths(d, 1),
    weekly: (d) => addWeeks(d, 1)
  }[recurrence];

  if (!advanceFn) return dateStr;

  while (isPast(next) && startOfDay(next) < today) {
    next = advanceFn(next);
  }

  return next.toISOString();
}

const useEventStore = create((set, get) => ({
  events: [],
  isHydrated: false,

  hydrate: async () => {
    const data = await db.events
      .where('is_active').equals(1)
      .toArray();
    set({ events: data, isHydrated: true });
  },

  addEvent: async (event) => {
    const now = new Date().toISOString();
    const next_occurrence = calculateNextOccurrence(event.date, event.recurrence || 'yearly');
    const record = {
      ...event,
      next_occurrence,
      reminder_days: event.reminder_days || [14, 7, 3, 1],
      is_active: true,
      created_at: now,
      updated_at: now
    };
    const id = await db.events.add(record);
    const newRecord = { ...record, id };
    set(state => ({
      events: [...state.events, newRecord]
    }));
    return id;
  },

  updateEvent: async (id, updates) => {
    const now = new Date().toISOString();
    const existing = get().events.find(e => e.id === id);
    const merged = { ...existing, ...updates };

    if (updates.date || updates.recurrence) {
      merged.next_occurrence = calculateNextOccurrence(
        merged.date,
        merged.recurrence
      );
    }

    set(state => ({
      events: state.events.map(e =>
        e.id === id ? { ...e, ...merged, updated_at: now } : e
      )
    }));
    await db.events.update(id, { ...merged, updated_at: now });
  },

  deleteEvent: async (id) => {
    set(state => ({
      events: state.events.filter(e => e.id !== id)
    }));
    await db.events.update(id, { is_active: false, updated_at: new Date().toISOString() });
  },

  getEventsByRelationship: (relationshipId) => {
    return get().events.filter(e => e.relationship_id === relationshipId);
  }
}));

export default useEventStore;
