import Dexie from 'dexie';

const db = new Dexie('GiftMasterDB');

db.version(1).stores({
  user: '++id',
  relationships: '++id, user_id, relationship_type, name, created_at',
  events: '++id, relationship_id, event_type, next_occurrence, is_active',
  preferences: '++id, relationship_id, category',
  gifts: '++id, relationship_id, event_id, status, given_date',
  suggestions: '++id, relationship_id, trigger_type, status, suggested_date',
  settings: '++id, key'
});

export default db;
