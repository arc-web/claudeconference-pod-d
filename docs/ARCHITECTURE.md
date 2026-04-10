# GiftMaster — Technical Architecture

## PWA Configuration

### Vite PWA Plugin Config

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'GiftMaster',
        short_name: 'GiftMaster',
        description: 'Never miss a moment that matters',
        theme_color: '#7C2D3E',     // Deep burgundy
        background_color: '#FBF7F4', // Warm cream
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['lifestyle', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ]
});
```

### PWA Install Prompt Strategy

```
First visit → Cache app shell, no prompt
Second visit (or post-onboarding) → Show subtle banner: "Add GiftMaster to your home screen for reminders"
User dismisses → Don't re-prompt for 30 days
User installs → Track in settings, celebrate with confetti animation
```

---

## Offline-First Data Architecture

### Data Flow

```
User Action
    │
    ▼
Zustand Store (immediate UI update)
    │
    ▼
Dexie.js (async persist to IndexedDB)
    │
    ▼ (Rev 2 only)
Sync Queue (mark record as dirty)
    │
    ▼ (when online)
Supabase (background push)
```

### Store Hydration on App Launch

```javascript
// Pattern for each store
const useRelationshipStore = create((set, get) => ({
  relationships: [],
  isHydrated: false,

  hydrate: async () => {
    const data = await db.relationships
      .where('is_archived').equals(0)
      .toArray();
    set({ relationships: data, isHydrated: true });
  },

  addRelationship: async (relationship) => {
    const record = {
      ...relationship,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_archived: false
    };
    const id = await db.relationships.add(record);
    set(state => ({
      relationships: [...state.relationships, { ...record, id }]
    }));
    return id;
  },

  // ... other CRUD methods follow same pattern:
  // 1. Optimistic update to Zustand
  // 2. Async write to Dexie
}));
```

### App Initialization Sequence

```
1. React app mounts
2. Check: is onboarding complete? (read from Dexie settings)
   → No: route to /onboarding
   → Yes: continue
3. Hydrate all stores in parallel:
   - useUserStore.hydrate()
   - useRelationshipStore.hydrate()
   - useEventStore.hydrate()
   - useGiftStore.hydrate()
4. Run suggestion engine (async, non-blocking)
5. Check notification permission status
6. Render Dashboard with hydrated data
```

---

## Notification Architecture

### Rev 1: In-App + Limited Push

Web Push notifications require a server to send them, which Rev 1 doesn't have. Strategy:

**In-App Notification Queue:**
- On each app open, the suggestion engine runs and generates a local queue
- Notifications display as a badge on Dashboard + in-app notification tray
- This is the primary notification channel for Rev 1

**Periodic Background Sync (best-effort):**
```javascript
// Register periodic sync (Chrome-only, requires installed PWA)
if ('periodicSync' in registration) {
  const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
  if (status.state === 'granted') {
    await registration.periodicSync.register('check-events', {
      minInterval: 24 * 60 * 60 * 1000 // 1 day
    });
  }
}

// In service worker:
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-events') {
    event.waitUntil(checkUpcomingEventsAndNotify());
  }
});
```

**Fallback: Registration-time scheduling:**
- When user creates an event, use the Notification API to show immediate confirmation
- For future reminders, rely on app-open checks

### Rev 2: Server-Sent Push

```
Supabase Edge Function (cron: every morning at user's preferred time)
  → Query events approaching within reminder windows
  → Generate push payloads
  → Send via Web Push protocol
  → User's service worker receives and displays notification
```

---

## Suggestion Engine Architecture

### Engine Pipeline

```
┌──────────────────────────────────────────────────────┐
│                  Suggestion Engine                    │
│                                                      │
│  ┌──────────┐  ┌───────────┐  ┌─────────────────┐   │
│  │  Event   │  │ Frequency │  │  Personality    │   │
│  │  Rules   │  │   Rules   │  │    Rules        │   │
│  └────┬─────┘  └─────┬─────┘  └───────┬─────────┘   │
│       │              │                │              │
│       ▼              ▼                ▼              │
│  ┌─────────────────────────────────────────────┐     │
│  │           Candidate Pool                    │     │
│  └─────────────────────┬───────────────────────┘     │
│                        │                             │
│                        ▼                             │
│  ┌─────────────────────────────────────────────┐     │
│  │        Deduplication & Prioritization       │     │
│  │  - Remove duplicates of existing pending    │     │
│  │  - Enforce per-relationship caps            │     │
│  │  - Sort by priority, then date              │     │
│  └─────────────────────┬───────────────────────┘     │
│                        │                             │
│                        ▼                             │
│  ┌─────────────────────────────────────────────┐     │
│  │          Write to Suggestions Table         │     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

### Engine Trigger Points
1. **App open** (after hydration)
2. **After adding/editing a relationship**
3. **After adding/editing an event**
4. **After completing/dismissing a suggestion**
5. **Daily via periodic background sync** (if available)

---

## Routing Structure

```
/                     → Dashboard (requires onboarding complete)
/onboarding           → Multi-step onboarding wizard
/onboarding/:step     → Specific onboarding step (1-9)
/people               → Relationship list
/people/:id           → Relationship detail
/people/:id/edit      → Edit relationship
/people/new           → Add new relationship
/calendar             → Calendar view
/gifts                → Gift tracker (ideas + history)
/gifts/new            → Add gift idea
/gifts/:id            → Gift detail/edit
/settings             → Settings page
/settings/premium     → Premium upgrade flow
/settings/export      → Data export
```

### Navigation Structure

Bottom tab bar (5 tabs):
```
[ 🏠 Home ]  [ 👥 People ]  [ 📅 Calendar ]  [ 🎁 Gifts ]  [ ⚙️ Settings ]
```

Active tab indicator: pill-shaped highlight with brand color.

---

## Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| First Contentful Paint | < 1.5s | Precached app shell, code splitting |
| Time to Interactive | < 3s | Lazy load non-critical routes |
| Lighthouse PWA score | 100 | Full manifest, service worker, HTTPS |
| Lighthouse Performance | > 90 | Image optimization, tree shaking |
| IndexedDB read (hydration) | < 200ms | Indexed queries, parallel reads |
| Bundle size (initial) | < 150KB gzipped | Code splitting, tree shaking |
| Offline capability | Full | All assets precached after first visit |

### Code Splitting Strategy
```
- Entry: App shell + routing + Dashboard (critical path)
- Lazy: Onboarding, Calendar, Gift Tracker, Settings, Premium
- Deferred: Suggestion engine, personality data, export utilities
```

---

## Security Considerations (Rev 1)

- All data stored locally in IndexedDB (same-origin policy protects it)
- No network requests in Rev 1 (nothing to intercept)
- Photo/avatar storage: compress and store as base64 data URLs (no external hosting)
- Export feature: generates file client-side, no server involvement
- Premium status: local flag only (honor system in Rev 1, server-validated in Rev 2)

### Rev 2 Security Additions
- Supabase Auth (email/password + social OAuth)
- Row-level security (RLS) on all Postgres tables
- API keys in environment variables, never in client bundle
- HTTPS enforced on all endpoints
- Data encryption at rest (Supabase default)
- User data deletion on account cancellation (GDPR compliance)

---

## Testing Strategy

### Unit Tests (Vitest)
- All Zustand store actions
- Suggestion engine rules
- Date utility functions (recurrence calculation, countdown)
- Personality type mapping functions

### Integration Tests (Testing Library)
- Onboarding flow completion
- CRUD operations on relationships, events, gifts
- Suggestion generation and display
- Premium gate enforcement

### E2E Tests (Playwright — stretch goal)
- Full onboarding → Dashboard flow
- Add person → see upcoming event → log gift → rate reaction
- PWA install flow
- Offline functionality verification

### Manual QA Checklist
- [ ] Install as PWA on iOS Safari
- [ ] Install as PWA on Android Chrome
- [ ] Full offline functionality after install
- [ ] Notification permission flow
- [ ] All onboarding steps complete
- [ ] All empty states display correctly
- [ ] Dark mode full coverage
- [ ] Keyboard navigation (accessibility)
- [ ] Screen reader compatibility

---

## Rev 2 Architecture Preview

```
┌─────────────────────────────────────────────────┐
│                GiftMaster PWA                   │
│  (same as Rev 1 + sync layer + AI features)    │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────┐
│                   Supabase                       │
│                                                  │
│  ┌────────────┐  ┌──────────────────────────┐    │
│  │    Auth    │  │       Postgres            │    │
│  │  (social   │  │  (same schema as Dexie    │    │
│  │   login)   │  │   + user_id FK + RLS)     │    │
│  └────────────┘  └──────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │         Edge Functions                    │    │
│  │                                           │    │
│  │  /suggest    → Claude API call            │    │
│  │              → personality + prefs +       │    │
│  │                history → AI gift recs      │    │
│  │                                           │    │
│  │  /notify     → Daily cron                 │    │
│  │              → Check events approaching   │    │
│  │              → Send Web Push              │    │
│  │                                           │    │
│  │  /plan       → Gift planning agent        │    │
│  │              → Search products            │    │
│  │              → Book reservations          │    │
│  │              → Order flowers              │    │
│  │              → (via external APIs)        │    │
│  │                                           │    │
│  │  /sync       → Conflict resolution       │    │
│  │              → Merge local ↔ cloud        │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │         Realtime (Postgres Changes)       │    │
│  │  → Multi-device sync                     │    │
│  │  → Live suggestion updates               │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│              External Services (Rev 2)           │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐     │
│  │  Claude  │ │  Stripe  │ │  OpenTable / │     │
│  │   API    │ │(payments)│ │   Resy API   │     │
│  └──────────┘ └──────────┘ └──────────────┘     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐     │
│  │ 1-800-   │ │  Amazon  │ │   Google     │     │
│  │ Flowers  │ │ Product  │ │   Places     │     │
│  │   API    │ │   API    │ │     API      │     │
│  └──────────┘ └──────────┘ └──────────────┘     │
└──────────────────────────────────────────────────┘
```

### AI Suggestion Flow (Rev 2)

```
User opens Dashboard
    │
    ▼
Client sends context to /suggest edge function:
  - Relationship profile (personality, preferences, history)
  - Upcoming events in next 30 days
  - Past gift history with reaction ratings
  - Budget preferences
    │
    ▼
Edge function constructs Claude API prompt:
  "Given this person's profile [context], suggest 3 gift ideas
   for their upcoming [event] on [date]. Consider their love
   language is [X], they're an [MBTI type], and they recently
   enjoyed [past gift]. Budget range: $[min]-$[max]."
    │
    ▼
Claude responds with structured suggestions:
  [{ title, description, estimated_price, reasoning, purchase_url }]
    │
    ▼
Client displays as premium suggestion cards with "Why this gift"
reasoning tied to personality data
```
