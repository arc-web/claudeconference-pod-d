# GiftMaster — Team Roles & Execution Plan

## Pick Your Stream

We have 4 parallel workstreams. Each person picks one. Read the descriptions below and claim yours.

| Stream | Role | Tools | Starts When |
|--------|------|-------|-------------|
| 🎨 **Stream 1** | Design & Brand | Figma | Immediately |
| 🏗️ **Stream 2** | Foundation & Data Layer | Claude Code + Terminal | Immediately |
| 📱 **Stream 3** | Pages & UI Components | Claude Code + Terminal | After Stream 2 pushes scaffold (~45 min) |
| 🧠 **Stream 4** | Logic, Content & Services | Claude Code + Terminal | Immediately |

---

## 🎨 Stream 1 — Design & Brand

**What you do**: You're the art director. You design everything in Figma and hand off assets + design decisions to the coders.

**You are NOT blocked by anyone. Start now.**

### Your deliverables (in priority order):

**1. Brand System (first 30 min)**
Pick and document these decisions — the coders need them ASAP:
- **Display font** (for headings): Something with personality. Suggestions: Playfair Display, Fraunces, Lora, or DM Serif Display
- **Body font** (for everything else): Clean and readable. Suggestions: DM Sans, Plus Jakarta Sans, Manrope, or Outfit
- **Color palette**: We need these defined:
  - Primary color (deep, warm — burgundy, wine, or deep teal)
  - Primary light (tinted background version)
  - Accent color (gold, amber, or warm highlight)
  - Success/Warning/Error colors
  - Neutral scale (warm grays, not cool)
  - Background colors (warm cream for light mode, warm charcoal for dark mode)
- **Export this as a simple list** (hex values) and share in Discord or paste into `docs/BRAND.md`

**2. Onboarding Flow Wireframes (next 60 min)**
Design all 9 steps of the onboarding wizard:
1. Welcome screen (3 swipeable value proposition cards)
2. Your name + birthday
3. "What brings you here?" motivation selector
4. Your personality (MBTI toggles + Love Language selector)
5. Preferences (currency, notifications, theme)
6. Add first person — name, relationship type, custom label
7. Add first person — important dates (birthday, anniversary)
8. Add first person — likes & dislikes quick-add
9. Completion summary → "Go to Dashboard"

Key patterns to design:
- Progress indicator (dots or bar across top)
- "Skip" button placement
- Card-style selector (for relationship type)
- Drag-to-rank interaction (for love languages)

**3. Dashboard Layout (next 45 min)**
- Greeting header with date
- Urgent event alert banner (red/amber)
- "Coming Up" event timeline cards with countdown badges
- Suggestion cards (dismissable, with Accept/Snooze/Dismiss buttons)
- Bottom navigation bar (5 tabs: Home, People, Calendar, Gifts, Settings)

**4. Component Library (ongoing)**
- Relationship card (avatar + name + type badge + next event countdown)
- Gift idea card (title, price, status badge, person tag)
- Personality badge (small pill showing "INTJ" or "Acts of Service")
- Empty state illustrations (simple, warm, encouraging)

**5. App Icons (when ready)**
- App icon: 192x192 and 512x512 PNG
- Maskable version (with safe zone padding)
- Export and push to `public/icons/` in the repo

### How to hand off your work:
- Share Figma link in Discord for the coders to reference
- For the brand system: create `docs/BRAND.md` with hex values and font names
- For icons: export PNGs and push to `public/icons/`

---

## 🏗️ Stream 2 — Foundation & Data Layer

**What you do**: You build the entire project scaffold that everyone else builds on top of. You own the data layer and app shell.

**You are NOT blocked by anyone. Start now. You must push your scaffold ASAP so Stream 3 can begin.**

### Your files (only touch these):
```
package.json
vite.config.js
tailwind.config.js
postcss.config.js
index.html
src/main.jsx
src/App.jsx
src/db/database.js
src/db/seed.js
src/stores/useUserStore.js
src/stores/useRelationshipStore.js
src/stores/useEventStore.js
src/stores/useGiftStore.js
src/stores/useAppStore.js
src/components/layout/AppShell.jsx
src/components/layout/BottomNav.jsx
src/components/ui/*  (shadcn installs)
src/styles/globals.css
public/manifest.json
```

### Claude Code starter prompt:

Paste this into Claude Code to get started:

```
Read CLAUDE.md and docs/DATA_MODEL.md and docs/ARCHITECTURE.md first.

Then execute Phase 1 from CLAUDE.md — Foundation:

1. Initialize a Vite + React project in this repo root (don't create a subdirectory — scaffold into the current directory alongside the existing docs/ folder and markdown files)
2. Install all dependencies: react, react-router-dom, tailwindcss, postcss, autoprefixer, dexie, dexie-react-hooks, zustand, date-fns, framer-motion, react-hook-form, zod, @hookform/resolvers, lucide-react, vite-plugin-pwa
3. Configure Tailwind with a custom theme (use warm color palette from CLAUDE.md design direction — placeholder hex values are fine, the designer will refine them)
4. Configure the PWA plugin in vite.config.js per docs/ARCHITECTURE.md
5. Set up Dexie.js database with ALL 7 tables from docs/DATA_MODEL.md (user, relationships, events, preferences, gifts, suggestions, settings)
6. Create Zustand stores for user, relationships, events, gifts, and app state — each with hydrate() method that reads from Dexie on startup, and CRUD methods that do optimistic updates to state + async persist to Dexie
7. Build the app shell: AppShell layout component with a header area and BottomNav with 5 tabs (Home, People, Calendar, Gifts, Settings) using lucide-react icons
8. Set up React Router with all routes from docs/ARCHITECTURE.md (placeholder page components are fine)
9. Create globals.css with CSS variables for the theme (light + dark mode)
10. Install shadcn/ui components: Button, Card, Dialog, Input, Select, Tabs, Badge, Avatar, Sheet

After scaffolding, commit and push to main so other team members can pull the foundation.
```

### Key rules:
- Scaffold into the repo root, not a subdirectory
- Don't delete or modify CLAUDE.md, README.md, notes.md, or docs/
- Push to main as soon as the scaffold builds and runs (`npm run dev` works)
- Notify the team in Discord when you push — Stream 3 is waiting for this

---

## 📱 Stream 3 — Pages & UI Components

**What you do**: You build every screen the user sees — all the pages, forms, and interactive components.

**⏳ You are blocked by Stream 2 for ~45 minutes.** While waiting, you can:
- Help Stream 1 with wireframes
- Write pseudocode/component skeletons in a scratch file
- Review docs/PRD.md to understand every user flow in detail

### Your files (only touch these):
```
src/pages/Onboarding.jsx
src/pages/Dashboard.jsx
src/pages/Relationships.jsx
src/pages/RelationshipDetail.jsx
src/pages/Calendar.jsx
src/pages/GiftTracker.jsx
src/pages/Settings.jsx
src/pages/Premium.jsx
src/components/onboarding/*
src/components/relationships/*
src/components/calendar/*
src/components/gifts/*
src/components/suggestions/*
```

### Claude Code starter prompt (use AFTER pulling Stream 2's scaffold):

```
Read CLAUDE.md and docs/PRD.md first. Look at the existing project structure, stores, and database schema that have been set up.

Build the pages in this order:

FIRST — Onboarding (src/pages/Onboarding.jsx + src/components/onboarding/):
Build the 9-step onboarding wizard from docs/PRD.md "Flow 1: First-Time Onboarding". Create:
- A multi-step wizard wrapper with progress indicator, Back/Next/Skip buttons
- Step components for each of the 9 steps
- Wire all form data to the Zustand stores (useUserStore, useRelationshipStore, useEventStore)
- On completion, set onboarding_completed=true and redirect to Dashboard
- Use React Hook Form + Zod for validation
- Use shadcn/ui components (Input, Select, Card, Button) for all form elements
- Make the MBTI selector a 4-row toggle (E/I, S/N, T/F, J/P) with visual feedback
- Make the Love Language selector a ranked list (drag or tap to rank)

SECOND — Dashboard (src/pages/Dashboard.jsx):
- Greeting header with user's name and today's date
- Urgent alert banner for events within 3 days
- "Coming Up" section showing next 14 days of events with countdown
- Suggestion cards section (reads from suggestion store)
- Quick action floating button (add gift idea, log gift, add person)
- Empty states for each section

THIRD — Relationship pages:
- List view with search/filter
- Detail view with tabbed layout (Overview, Preferences, Events, Gifts, Notes)
- Add/Edit forms

FOURTH — Gift Tracker and Calendar (if time permits)

For all pages: use Framer Motion for page transitions, handle loading states with skeletons, implement all empty states from docs/PRD.md.
```

---

## 🧠 Stream 4 — Logic, Content & Services

**What you do**: You build the brain of the app — all the business logic, personality data, suggestion rules, and utility functions. Your code is pure JavaScript with zero UI dependencies, so you can work in complete isolation.

**You are NOT blocked by anyone. Start now.**

### Your files (only touch these):
```
src/utils/personality.js
src/utils/dates.js
src/utils/constants.js
src/services/suggestions.js
src/services/notifications.js
src/hooks/useUpcomingEvents.js
src/hooks/useSuggestions.js
src/hooks/useInstallPrompt.js
```

### Claude Code starter prompt:

```
Read CLAUDE.md, docs/PRD.md (especially the "Suggestion Engine Specification" section), and docs/DATA_MODEL.md first.

Build the logic layer for GiftMaster. These are pure JavaScript modules with no React UI code — they export functions and data that the UI pages will import.

Create these files in order:

1. src/utils/constants.js
   - All enums: relationship_types, event_types, preference_categories, gift_statuses, suggestion_types, suggestion_priorities, personality_frameworks
   - Default settings values
   - Holiday calendar (major US + international holidays with dates)

2. src/utils/personality.js
   This is the biggest file. It contains ALL personality framework data:
   - MBTI: All 16 types with description (2-3 sentences), communication style, gift-giving tips (3 suggestions), and what they appreciate receiving
   - Love Languages: All 5 with description, example gestures (5 each), and gift ideas that align
   - Enneagram: All 9 types with description, core desire, gift-giving approach, and what resonates
   - DISC: All 4 primary types with description, communication preferences, and gift style
   - Astrology: All 12 sun signs with key traits, element, gift affinities
   Export helper functions:
   - getPersonalityDescription(framework, type)
   - getGiftTips(framework, type) → returns array of tip strings
   - getCommunicationTips(framework, type) → returns array of tip strings
   - getCompatibilityNotes(framework, typeA, typeB) → basic compatibility insight

3. src/utils/dates.js
   - calculateNextOccurrence(date, recurrence) → next date for recurring events
   - getDaysUntil(date) → number of days from today
   - isWithinWindow(date, days) → boolean, is date within N days from now
   - getUpcomingInRange(events, startDate, endDate) → filtered + sorted events
   - formatCountdown(days) → human-readable string ("tomorrow", "in 3 days", "in 2 weeks")
   - getAgeFromBirthday(birthday) → current age
   - getRelationshipDuration(startDate) → { years, months, days }
   - isAnniversaryMilestone(startDate) → checks if this year is 1, 5, 10, 15, 20, 25, 50

4. src/services/suggestions.js
   The rule-based suggestion engine from docs/PRD.md:
   - generateSuggestions(relationships, events, gifts, existingSuggestions) → new suggestions array
   - Implement ALL 5 rule types:
     a. Time-based: events approaching at [30, 14, 7, 3, 1] day windows
     b. Frequency-based: no gift logged in 60+ days (romantic) or 90+ days (family)
     c. Personality-based: love language → gesture suggestions (use templates from PRD)
     d. Seasonal: upcoming holidays from the holiday calendar
     e. Milestone: relationship anniversary milestones (1yr, 5yr, etc.)
   - Implement deduplication rules from PRD (max 3 per relationship, 7-day gap per trigger type, 30-day cooldown on dismissed)
   - Include ALL suggestion templates from PRD for each love language
   - Each suggestion should include: relationship_id, trigger_type, trigger_context, suggestion_type, title, body, priority, suggested_date

5. src/services/notifications.js
   - requestNotificationPermission() → asks user, returns status
   - checkNotificationSupport() → { push: bool, periodicSync: bool }
   - scheduleEventReminder(event, relationship) → creates notification payload
   - getInAppNotificationQueue(suggestions) → sorted by priority for in-app display
   - registerPeriodicSync() → sets up daily background check if supported

6. src/hooks/useUpcomingEvents.js
   - Custom hook that reads from event store
   - Returns events in next N days, sorted by date, with relationship data attached
   - Memoized with useMemo, recalculates when events change

7. src/hooks/useSuggestions.js
   - Custom hook that runs the suggestion engine on mount and when data changes
   - Returns active suggestions sorted by priority
   - Provides accept/dismiss/snooze handlers that update the suggestion store

8. src/hooks/useInstallPrompt.js
   - Captures the beforeinstallprompt event
   - Returns { canInstall, promptInstall, isInstalled }
   - Tracks install state in app settings

Make sure every module has JSDoc comments on all exported functions. Use date-fns for all date operations. No React component code — just pure functions and hooks.
```

---

## Coordination Rules

### Git workflow
- Everyone works on `main` (we're moving fast, no time for branches)
- **Pull before you start working** (`git pull`)
- **Pull before you push** (`git pull` then `git push`)
- If you get a merge conflict, ask for help — don't force push
- Each stream owns specific files (listed above) — **don't edit files outside your stream**

### Communication
- When Stream 2 pushes the scaffold: announce in Discord so Stream 3 can pull and start
- When Stream 1 finishes the brand system: share the Figma link / hex values so Stream 2 can update CSS variables
- When Stream 4 finishes personality.js: announce it — Stream 3 will need it for the onboarding personality selectors

### Definition of "Done" for today
At minimum, we want a working demo that shows:
1. ✅ PWA that installs on a phone
2. ✅ Complete onboarding flow (all 9 steps)
3. ✅ Dashboard with upcoming events and at least 1 suggestion card
4. ✅ Ability to view a relationship profile with personality data
5. ✅ Personality descriptions and gift tips rendering from real data

Stretch goals (if time permits):
- Gift tracker with idea → given lifecycle
- Calendar view
- Working notification reminders
- Premium upgrade page

---

## Claim Your Role

Edit this section and push to mark which stream you've picked:

| Stream | Claimed By |
|--------|-----------|
| 🎨 Stream 1 — Design | _________________ |
| 🏗️ Stream 2 — Foundation | _________________ |
| 📱 Stream 3 — Pages & UI | _________________ |
| 🧠 Stream 4 — Logic & Content | _________________ |
