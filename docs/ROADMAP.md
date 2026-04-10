# GiftMaster — Roadmap

## Phase Overview

```
Phase 1: Foundation        ██░░░░░░░░░░░░░░  ~2 days with Claude Code
Phase 2: Onboarding        ████░░░░░░░░░░░░  ~1-2 days
Phase 3: Core Features     ████████░░░░░░░░  ~3-4 days
Phase 4: Intelligence      ██████████░░░░░░  ~2 days
Phase 5: Premium & Polish  ████████████░░░░  ~2-3 days
Phase 6: Rev 2 Prep        ██████████████░░  ~2 days (architecture only)
                                              ─────────
                                              ~12-15 days total
```

> Time estimates assume focused Claude Code sessions. Actual calendar time depends on review cycles, design iteration, and testing.

---

## Phase 1: Foundation

**Goal**: Runnable PWA shell with data layer and navigation.

### Deliverables
- [ ] Vite + React project scaffolded with all dependencies
- [ ] Tailwind CSS configured with custom theme tokens (colors, typography, spacing)
- [ ] shadcn/ui components installed (Button, Card, Dialog, Input, Select, Tabs, Badge, Avatar, Sheet)
- [ ] PWA manifest + service worker configured
- [ ] Dexie.js database initialized with full schema (all 7 tables)
- [ ] Zustand stores created for all entities with IndexedDB persistence
- [ ] App shell: layout component with bottom navigation
- [ ] React Router configured with all routes
- [ ] Global CSS with theme variables (light + dark mode)
- [ ] Google Fonts loaded (display + body pair)

### Definition of Done
- App installs as PWA on mobile
- Bottom nav switches between placeholder pages
- Dexie.js can write and read test data
- Dark mode toggle works
- Lighthouse PWA audit passes

---

## Phase 2: Onboarding

**Goal**: New user can complete setup and land on Dashboard.

### Deliverables
- [ ] Welcome screen with value proposition cards
- [ ] Multi-step wizard component (progress indicator, back/next, skip support)
- [ ] User profile form: name, birthday, motivation selector
- [ ] Personality selectors: MBTI toggle grid, Love Language ranking
- [ ] Preferences form: currency, theme, notification permission
- [ ] Add First Person: name, type, label, start date
- [ ] Important dates form with ability to add multiple
- [ ] Quick-add likes/dislikes with suggested categories
- [ ] Person personality optional step
- [ ] Completion summary card
- [ ] Onboarding state persisted (can resume if interrupted)
- [ ] Skip + "do it later" support for all optional steps

### Definition of Done
- Full onboarding completes and creates User + Relationship + Events + Preferences records
- Refreshing mid-onboarding resumes at correct step
- Skipping optional steps works cleanly
- Post-onboarding redirects to Dashboard with data visible

---

## Phase 3: Core Features

**Goal**: Full CRUD for all entities, usable as a standalone relationship tracker.

### Deliverables

#### Dashboard
- [ ] Greeting header with date
- [ ] Urgent alert banner for events within 3 days
- [ ] "Coming Up" section: next 14 days of events with countdown
- [ ] Quick action buttons (add gift idea, log gift, add person)
- [ ] Empty state for no events

#### Relationships
- [ ] Relationship list view with avatar, name, type badge, next event countdown
- [ ] Search/filter relationships
- [ ] Relationship detail view with tabbed layout (Overview, Preferences, Events, Gifts, Notes)
- [ ] Add new relationship (reuses onboarding person form)
- [ ] Edit relationship inline
- [ ] Archive relationship (soft delete with undo)
- [ ] Profile completeness meter

#### Events / Calendar
- [ ] Event list view (chronological, grouped by month)
- [ ] Month calendar view with event dots
- [ ] Add/edit/delete events with recurrence support
- [ ] Reminder configuration per event
- [ ] Event detail with relationship context
- [ ] Next occurrence auto-calculation for recurring events

#### Gift Tracker
- [ ] Three-tab view: Ideas, In Progress, History
- [ ] Add gift idea (title, description, URL, price, person, occasion)
- [ ] Status progression: idea → planned → purchased → given
- [ ] Rate reaction after marking as given (1-5 + notes)
- [ ] Filter by person, occasion, price range
- [ ] Gift detail/edit view

### Definition of Done
- All CRUD operations persist across app restarts
- Calendar correctly shows recurring events
- Gift status can be progressed through full lifecycle
- All list views sort and filter correctly
- App remains fully functional in airplane mode

---

## Phase 4: Intelligence Layer

**Goal**: App proactively helps users be thoughtful (no AI required).

### Deliverables
- [ ] Suggestion engine service with all rule types implemented
- [ ] Time-based rules: events approaching at configurable windows
- [ ] Frequency-based rules: gap detection since last gift/gesture
- [ ] Personality-based rules: love language → gesture suggestions
- [ ] Seasonal rules: holiday detection from built-in calendar
- [ ] Milestone rules: relationship anniversary milestones
- [ ] Suggestion deduplication and prioritization logic
- [ ] Suggestion cards on Dashboard with Accept/Dismiss/Snooze actions
- [ ] Personality-based communication tips (static content per type)
- [ ] In-app notification queue for missed suggestions
- [ ] Suggestion history (what was accepted/dismissed)

### Definition of Done
- Opening the app generates relevant suggestions based on stored data
- Dismissing a suggestion prevents it from resurfacing for 30 days
- Snoozing a suggestion makes it reappear on the specified date
- Accepting a suggestion creates a gift idea or prompts an action
- Communication tips display correctly for all MBTI × Love Language combinations

---

## Phase 5: Premium & Polish

**Goal**: Production-ready app with premium tier and polished UX.

### Deliverables

#### Premium
- [ ] Premium feature flag system
- [ ] Feature gates on: relationship count, personality frameworks, suggestions, budget tracking, export
- [ ] Premium upgrade page with feature comparison
- [ ] Subscription selection UI (monthly/annual)
- [ ] "Premium" badge in UI for gated features
- [ ] Budget tracking view: spending by person, by month, by occasion (Premium)
- [ ] Relationship pulse scores (Premium)

#### Data Management
- [ ] JSON export of all data
- [ ] CSV export of gift history
- [ ] Data clearing with confirmation
- [ ] Import from JSON backup (stretch goal)

#### Polish
- [ ] Loading skeletons for all data-dependent views
- [ ] All empty states with illustrations and CTAs
- [ ] Page transition animations (Framer Motion)
- [ ] Micro-interactions: card press, toggle animations, success celebrations
- [ ] Error boundaries with friendly messages
- [ ] PWA install prompt with custom UI
- [ ] Responsive testing: small phone, large phone, tablet
- [ ] Dark mode complete coverage audit
- [ ] Accessibility audit: keyboard nav, screen reader, contrast

#### Settings
- [ ] Profile editing
- [ ] Notification preferences with quiet hours
- [ ] Theme toggle
- [ ] Date format + currency preferences
- [ ] App version + support link
- [ ] Privacy policy placeholder

### Definition of Done
- Premium gates prevent free users from exceeding limits
- Export produces valid, re-importable files
- All animations respect `prefers-reduced-motion`
- Zero layout shifts on any screen
- Lighthouse scores: Performance >90, Accessibility >95, PWA 100
- Manual QA checklist 100% passed on iOS Safari + Android Chrome

---

## Phase 6: Rev 2 Preparation

**Goal**: Architecture ready for cloud features without implementing them.

### Deliverables
- [ ] Supabase project initialized with Postgres schema (mirrors Dexie)
- [ ] Row-level security policies drafted
- [ ] Auth UI components (login/register/forgot password) — non-functional
- [ ] Sync service interface defined (methods stubbed, not implemented)
- [ ] Environment variable structure (.env.example with all Rev 2 vars)
- [ ] Claude API service interface with prompt templates
- [ ] Stripe integration plan documented
- [ ] External API integration plan (restaurants, flowers, products)

### Definition of Done
- Supabase schema can be deployed via migration scripts
- Auth UI renders but shows "Coming Soon" state
- All Rev 2 service files exist with JSDoc-documented interfaces
- A developer could pick up Rev 2 implementation with clear contracts

---

## Success Metrics

### Rev 1 Launch Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion rate | >70% | Track step completion in analytics |
| Daily active users (DAU) | Track baseline | PWA analytics |
| Avg. relationships per user | >2 | Aggregate from data |
| Suggestion acceptance rate | >30% | Accept / (Accept + Dismiss) |
| PWA install rate | >40% of 2nd-visit users | Install prompt analytics |
| Gift logging frequency | >1 per month per active user | Gift records created |

### Rev 2 Target Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Free → Premium conversion | >5% | Stripe subscription data |
| AI suggestion acceptance rate | >50% | Higher quality than rule-based |
| Multi-device users | >20% of premium | Auth + sync analytics |
| Monthly recurring revenue | Track growth | Stripe dashboard |
| User retention (30-day) | >40% | Cohort analysis |

---

## Future Considerations (Beyond Rev 2)

These are not planned but worth keeping in mind architecturally:

1. **Shared wishlists**: Let gift recipients share what they want (requires invite/link system)
2. **Couple mode**: Both partners use the app, see shared calendar (requires multi-user data model)
3. **Group gifting**: Coordinate group gifts with contribution tracking
4. **Receipt scanning**: OCR receipts to auto-log gifts (camera API + AI)
5. **Calendar sync**: Import events from Google/Apple Calendar
6. **Smart home integration**: "Alexa, remind me what Sarah likes" (stretch)
7. **Native app**: React Native rebuild using same component logic (share hooks/stores)
8. **Gift card / reward points integration**: Redeem points for gifts within the app
9. **Social features**: Anonymous gift recommendations from friends/family
10. **Internationalization**: Multi-language support, cultural holiday calendars
