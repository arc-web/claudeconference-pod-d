# GiftMaster — Data Model

## Overview

All data is stored locally in IndexedDB via Dexie.js. The schema is designed to be directly portable to Postgres (Supabase) for Rev 2 cloud sync. Field names use `snake_case` for DB compatibility.

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌───────────────────┐
│     User     │       │   Relationship    │
│  (singleton) │──1:N──│                   │
└──────┬───────┘       └────────┬──────────┘
       │                        │
       │                   1:N  │  1:N
       │                  ┌─────┴─────┐
       │                  │           │
       │           ┌──────▼───┐ ┌─────▼──────┐
       │           │  Event   │ │ Preference │
       │           │(milestone│ │ (likes/    │
       │           │ & dates) │ │  dislikes) │
       │           └──────┬───┘ └────────────┘
       │                  │
       │             1:N  │
       │           ┌──────▼──────┐
       │           │    Gift     │
       │           │ (history &  │
       │           │   ideas)    │
       │           └─────────────┘
       │
       │           ┌─────────────┐
       └───1:N─────│ Suggestion  │
                   │  (queue)    │
                   └─────────────┘
```

---

## Dexie.js Schema Definition

```javascript
// db/database.js
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
```

> **Note**: Dexie indexes (after `++id`) define which fields are queryable/sortable. All other fields are stored but not indexed.

---

## Entity Schemas

### 1. User (Singleton)

The app owner's profile. Only one record exists.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | auto | Primary key |
| `name` | string | yes | User's display name |
| `email` | string | no | For Rev 2 account creation |
| `avatar_url` | string | no | Profile photo (base64 data URL or future cloud URL) |
| `birthday` | string (ISO) | no | User's own birthday |
| `personality` | object | no | See Personality sub-schema below |
| `onboarding_completed` | boolean | yes | Whether initial setup is done |
| `premium_status` | string | yes | `'free'` \| `'premium'` \| `'trial'` |
| `premium_expires_at` | string (ISO) | no | Subscription expiry date |
| `notification_preferences` | object | no | See Notification Preferences sub-schema |
| `theme` | string | yes | `'light'` \| `'dark'` \| `'system'` |
| `created_at` | string (ISO) | yes | Account creation timestamp |
| `updated_at` | string (ISO) | yes | Last profile update |

### 2. Relationship

A person in the user's life.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | auto | Primary key |
| `user_id` | number | yes | FK → User (always 1 in Rev 1) |
| `name` | string | yes | Person's full name |
| `nickname` | string | no | Preferred name / pet name |
| `avatar_url` | string | no | Photo (base64 data URL) |
| `relationship_type` | string | yes | `'romantic'` \| `'family'` \| `'friend'` \| `'colleague'` \| `'other'` |
| `relationship_label` | string | no | Custom label (e.g., "Wife", "Best Friend", "Mom") |
| `relationship_start_date` | string (ISO) | no | When relationship began |
| `birthday` | string (ISO) | no | Their birthday |
| `phone` | string | no | Phone number |
| `email` | string | no | Email address |
| `address` | string | no | Mailing address (for gift shipping) |
| `employer` | string | no | Where they work |
| `personality` | object | no | See Personality sub-schema |
| `parents` | object | no | `{ mother_name, father_name, mother_birthday, father_birthday }` |
| `children` | array | no | `[{ name, birthday, age }]` |
| `pets` | array | no | `[{ name, type, breed }]` |
| `notes` | string | no | Freeform notes |
| `is_archived` | boolean | yes | Soft delete |
| `created_at` | string (ISO) | yes | Record creation |
| `updated_at` | string (ISO) | yes | Last update |

### 3. Event (Milestone)

Recurring or one-time events tied to a relationship.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | auto | Primary key |
| `relationship_id` | number | yes | FK → Relationship |
| `event_type` | string | yes | See Event Types enum below |
| `custom_label` | string | no | Custom name (e.g., "First Date Anniversary") |
| `date` | string (ISO) | yes | The event date |
| `recurrence` | string | yes | `'none'` \| `'yearly'` \| `'monthly'` \| `'weekly'` |
| `next_occurrence` | string (ISO) | yes | Computed next occurrence (indexed for queries) |
| `reminder_days` | array | yes | Days before to remind, e.g., `[30, 14, 7, 3, 1]` |
| `is_active` | boolean | yes | Whether reminders are enabled |
| `notes` | string | no | Context for this event |
| `created_at` | string (ISO) | yes | Record creation |
| `updated_at` | string (ISO) | yes | Last update |

**Event Types Enum:**
```
birthday, anniversary, valentines_day, mothers_day, fathers_day,
christmas, hanukkah, eid, diwali, lunar_new_year, thanksgiving,
graduation, promotion, wedding, baby_shower, housewarming,
first_date, engagement_anniversary, custom
```

### 4. Preference

Likes, dislikes, sizes, and interests for a relationship.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | auto | Primary key |
| `relationship_id` | number | yes | FK → Relationship |
| `category` | string | yes | See Preference Categories below |
| `type` | string | yes | `'like'` \| `'dislike'` \| `'neutral'` |
| `value` | string | yes | The preference (e.g., "Dark chocolate", "Size M") |
| `specificity` | string | no | Additional detail (e.g., brand, variety) |
| `confidence` | string | yes | `'stated'` \| `'observed'` \| `'guessed'` |
| `source` | string | no | How you learned this (e.g., "She mentioned it at dinner") |
| `created_at` | string (ISO) | yes | Record creation |

**Preference Categories:**
```
food, drink, music, movies_tv, books, hobbies, sports,
fashion, colors, flowers, scents, experiences, brands,
clothing_sizes, ring_size, allergies, dietary_restrictions,
home_decor, tech, travel_destinations, restaurants
```

### 5. Gift

Gift ideas and gift history.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | auto | Primary key |
| `relationship_id` | number | yes | FK → Relationship |
| `event_id` | number | no | FK → Event (if tied to specific occasion) |
| `status` | string | yes | `'idea'` \| `'planned'` \| `'purchased'` \| `'given'` \| `'returned'` |
| `title` | string | yes | Gift name/description |
| `description` | string | no | Additional details |
| `url` | string | no | Link to purchase |
| `image_url` | string | no | Product image (base64 or URL) |
| `price` | number | no | Cost in user's currency |
| `currency` | string | no | ISO currency code (default from settings) |
| `given_date` | string (ISO) | no | When it was given |
| `reaction_rating` | number | no | 1-5 how well received |
| `reaction_notes` | string | no | How they reacted |
| `is_surprise` | boolean | no | Whether it was a surprise |
| `tags` | array | no | Custom tags for categorization |
| `ai_suggested` | boolean | no | Whether this came from AI (Rev 2) |
| `created_at` | string (ISO) | yes | Record creation |
| `updated_at` | string (ISO) | yes | Last update |

### 6. Suggestion

System-generated suggestions for gifts, gestures, or affirmations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | auto | Primary key |
| `relationship_id` | number | yes | FK → Relationship |
| `trigger_type` | string | yes | `'time_based'` \| `'frequency'` \| `'personality'` \| `'seasonal'` \| `'ai'` |
| `trigger_context` | string | no | What triggered this (e.g., "Birthday in 14 days") |
| `suggestion_type` | string | yes | `'gift'` \| `'gesture'` \| `'affirmation'` \| `'experience'` \| `'message'` |
| `title` | string | yes | Short headline |
| `body` | string | yes | Full suggestion text |
| `suggested_date` | string (ISO) | no | When to act on this |
| `priority` | string | yes | `'low'` \| `'medium'` \| `'high'` \| `'urgent'` |
| `status` | string | yes | `'pending'` \| `'accepted'` \| `'dismissed'` \| `'snoozed'` \| `'completed'` |
| `snoozed_until` | string (ISO) | no | Snooze date if snoozed |
| `created_at` | string (ISO) | yes | When generated |

### 7. Settings (Key-Value)

App-level configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | auto | Primary key |
| `key` | string | yes | Setting key (unique, indexed) |
| `value` | any | yes | Setting value (JSON-serializable) |

**Default Settings Keys:**
```
default_currency          → "USD"
default_reminder_days     → [14, 7, 3, 1]
suggestion_frequency      → "daily"
notification_enabled      → true
notification_quiet_hours  → { start: "22:00", end: "08:00" }
first_day_of_week         → "sunday"
date_format               → "MM/DD/YYYY"
has_seen_install_prompt   → false
last_suggestion_check     → ISO timestamp
```

---

## Sub-Schemas

### Personality Object

Used in both User and Relationship entities.

```javascript
{
  mbti: {
    type: "INTJ",           // 4-letter code
    assessed: true           // whether formally assessed or self-identified
  },
  love_languages: {
    primary: "acts_of_service",
    secondary: "quality_time",
    ranked: ["acts_of_service", "quality_time", "physical_touch", "words_of_affirmation", "receiving_gifts"]
  },
  enneagram: {
    type: 5,                 // 1-9
    wing: 4,                 // adjacent number
    tritype: "549"           // optional
  },
  disc: {
    primary: "C",            // D, I, S, C
    secondary: "S",          // optional blend
    scores: { D: 25, I: 15, S: 35, C: 45 }  // optional percentages
  },
  astrology: {
    sun_sign: "virgo",
    moon_sign: "scorpio",    // optional
    rising_sign: "leo"       // optional
  },
  custom: [                  // extensible for other frameworks
    { framework: "Strengths Finder", result: "Achiever, Learner, Strategic" },
    { framework: "Attachment Style", result: "Secure" }
  ]
}
```

### Notification Preferences Object

```javascript
{
  push_enabled: true,
  email_enabled: false,         // Rev 2
  quiet_hours: {
    enabled: true,
    start: "22:00",
    end: "08:00"
  },
  reminder_windows: {
    birthday: [30, 14, 7, 1],
    anniversary: [30, 14, 7, 1],
    holiday: [14, 7, 1],
    custom: [7, 3, 1]
  },
  suggestion_frequency: "daily",  // "daily" | "weekly" | "off"
  suggestion_types: {
    gift: true,
    gesture: true,
    affirmation: true,
    experience: true
  }
}
```

---

## Computed Views (Hooks / Queries)

These are not stored — they're computed from the raw data:

### Upcoming Events (next 30 days)
```javascript
// Query: events WHERE next_occurrence BETWEEN today AND today+30, ORDER BY next_occurrence
// Join with relationship for display name
```

### Relationship Completeness Score
```javascript
// Calculate percentage of filled fields:
// Required: name, relationship_type (baseline = 20%)
// High value: birthday (+15%), personality.love_languages (+15%), personality.mbti (+10%)
// Medium: preferences count > 5 (+10%), events count > 0 (+10%)
// Other fields: +2-5% each up to 100%
```

### Gift Spending by Relationship (Premium)
```javascript
// Query: gifts WHERE status IN ('purchased', 'given') GROUP BY relationship_id
// SUM(price), COUNT(*), AVG(reaction_rating)
```

### Suggestion Generation Queue
```javascript
// Run on app open and daily via service worker:
// 1. Check events approaching within reminder windows
// 2. Check last gift date per relationship vs. frequency threshold
// 3. Check love language → generate gesture suggestion
// 4. Check seasonal calendar for upcoming holidays
// 5. Deduplicate against existing pending suggestions
```

---

## Data Migration Strategy (Rev 1 → Rev 2)

When cloud sync is added:

1. **Schema parity**: Supabase Postgres tables mirror Dexie schema exactly
2. **UUID migration**: Auto-increment IDs get mapped to UUIDs for cloud
3. **Sync fields added**: `synced_at`, `is_dirty`, `cloud_id` on every table
4. **Conflict resolution**: Timestamps + last-write-wins, with user prompt for genuine conflicts
5. **First sync**: Full upload of local data → cloud, deduplicate by content hash
6. **Ongoing**: Dexie remains primary. Background sync pushes dirty records to Supabase.
