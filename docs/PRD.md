# GiftMaster — Product Requirements Document

## Vision

GiftMaster transforms forgetful or uncertain gift-givers into consistently thoughtful partners, family members, and friends — by turning relationship knowledge into timely, personalized action.

---

## User Personas

### Primary: "The Well-Intentioned Forgetter"
- Cares deeply but loses track of dates and details
- Has been burned by last-minute gift scrambles
- Wants to be more thoughtful but doesn't know how to operationalize it
- Comfortable with apps, uses phone for everything

### Secondary: "The Overthinker"
- Stresses about picking the *perfect* gift
- Spends hours browsing without deciding
- Wants guidance and confidence in their choices
- Values personality-based reasoning ("this is perfect for an INFP")

### Tertiary: "The Relationship Builder"
- Manages many relationships (large family, big friend group)
- Needs a system to keep track of everyone's details
- Wants to make each person feel special without it being overwhelming

---

## User Flows

### Flow 1: First-Time Onboarding

```
Welcome Screen → About You (3 steps) → Add First Person (4 steps) → Dashboard
```

**Step 1: Welcome**
- App value proposition (3 cards, swipeable)
- "Get Started" CTA

**Step 2: Your Profile — Basics**
- Name (required)
- Birthday (optional but encouraged)
- "What brings you here?" — select primary motivation:
  - "I keep forgetting important dates"
  - "I want to give better gifts"
  - "I want to be more thoughtful in my relationships"
  - "All of the above"

**Step 3: Your Profile — Personality (Optional, Skippable)**
- MBTI type selector (4 toggles: E/I, S/N, T/F, J/P + "I don't know")
- Love Language ranking (drag-to-rank or tap-to-select top 2)
- "You can always add more later" reassurance

**Step 4: Your Profile — Preferences**
- Default currency selector
- Notification permission request (contextual: "We'll remind you before important dates")
- Theme selection (light/dark/system)

**Step 5: Add First Person — Who?**
- Name (required)
- Relationship type (card selector: Partner, Family, Friend, Colleague, Other)
- Custom label (auto-suggested based on type: "Wife", "Husband", "Mom", "Best Friend")
- Relationship start date (optional, date picker)

**Step 6: Add First Person — Important Dates**
- Birthday (date picker)
- Anniversary/special dates (add multiple)
- Auto-create Event records with default reminder windows

**Step 7: Add First Person — What Do They Love?**
- Quick-add likes: suggested categories with common items
  - "Flowers? Which kind?"
  - "Chocolate? Dark, milk, or white?"
  - "Coffee or tea?"
  - Freeform text entry for anything
- Quick-add dislikes: same pattern
- "You can always add more as you learn"

**Step 8: Add First Person — Personality (Optional)**
- Same personality selectors as user profile but for this person
- "Not sure? Skip for now and add it later"

**Step 9: Onboarding Complete**
- Summary card showing what's been set up
- "Your first reminder is set for [date]"
- "Go to Dashboard" CTA

---

### Flow 2: Dashboard (Daily Use)

The Dashboard is the home screen — designed to be glanceable and actionable.

**Sections (top to bottom):**

1. **Header**: Greeting + date ("Good morning, Chris — Thursday, April 10")

2. **Urgent Alert Banner** (conditional):
   - Shows only when an event is within 3 days
   - Red/amber styling: "Sarah's birthday is TOMORROW! 🎂"
   - Tap → Relationship detail with gift ideas

3. **Coming Up** (next 14 days):
   - Timeline cards showing upcoming events
   - Each card: person avatar + event name + countdown ("in 5 days")
   - Tap → Event detail

4. **Suggestions** (rotates daily):
   - 1-3 suggestion cards based on rule engine
   - Each card: icon + title + body + action buttons (Accept / Dismiss / Snooze)
   - Examples:
     - 🎁 "Time to start thinking about Mom's birthday (March 15)"
     - 💬 "Alex values Words of Affirmation — send an encouraging text today"
     - 🌹 "It's been 45 days since you surprised Sarah with something"

5. **Quick Actions** (sticky or floating):
   - "Add a gift idea" (floating button or quick-add)
   - "Log a gift given"
   - "Add a new person"

6. **Relationship Pulse** (Premium):
   - Small card per relationship showing "thoughtfulness score"
   - Based on: gift frequency, event coverage, last gesture date
   - "You're crushing it with Sarah 🔥" or "Mom could use some attention 💛"

---

### Flow 3: Relationship Profile

Deep profile view for each person.

**Tabs:**
1. **Overview**: Name, photo, relationship info, personality summary, completeness meter
2. **Preferences**: Organized by category (food, fashion, hobbies, etc.) with like/dislike/neutral tags
3. **Events**: All milestones and dates with countdown + reminder settings
4. **Gifts**: History of gifts given + active ideas list
5. **Notes**: Freeform journal for things they've mentioned, overheard details, etc.

**Key interactions:**
- Edit any field inline (tap to edit)
- "Quick Add" floating button on Preferences tab for fast entry
- Swipe gift ideas to change status (idea → planned → purchased → given)
- Rate reaction after marking gift as "given"

---

### Flow 4: Calendar View

Visual timeline of all events across all relationships.

**Views:**
- **Month view**: Dot indicators on dates with events, tap to expand
- **List view**: Chronological list of events with relationship context
- **Filter**: By relationship, by event type

**Add event from calendar:**
- Tap a date → "Add Event" sheet
- Select relationship, event type, set reminders

---

### Flow 5: Gift Tracker

Central hub for all gift ideas and history.

**Tabs:**
1. **Ideas** (status: idea): Brainstorming board, sortable by person/price/date added
2. **In Progress** (status: planned/purchased): Active gift pipeline
3. **History** (status: given): Past gifts with reaction ratings

**Features:**
- Filter by relationship, price range, occasion
- "Inspire Me" button → generates suggestion based on personality + preferences (rule-based Rev 1, AI Rev 2)
- Budget tracker: monthly/yearly spending by person (Premium)
- Gift performance: average reaction rating by category (Premium)

---

### Flow 6: Settings & Premium

**Sections:**
1. **Profile**: Edit your info
2. **Notifications**: Toggle push, set quiet hours, customize reminder windows
3. **Appearance**: Theme toggle, date format, currency
4. **Premium**: Feature comparison, upgrade flow
5. **Data**: Export (JSON/CSV), import, clear all data
6. **About**: Version, privacy policy, support link

**Premium Upgrade Flow:**
- Feature comparison table (free vs. premium)
- Subscription options (monthly vs. annual with savings callout)
- Payment integration (Stripe via Rev 2 backend, or platform-specific IAP)
- 7-day free trial for annual plan

---

## Suggestion Engine Specification (Rev 1 — Rule-Based)

### Trigger Rules

| Rule | Condition | Suggestion Type | Priority |
|------|-----------|----------------|----------|
| Event approaching (30d) | Event in 25-30 days | gift | low |
| Event approaching (14d) | Event in 12-14 days | gift | medium |
| Event approaching (7d) | Event in 5-7 days | gift | high |
| Event approaching (3d) | Event in 1-3 days | gift/gesture | urgent |
| Frequency gap | No gift logged in 60+ days (romantic) | gesture | medium |
| Frequency gap | No gift logged in 90+ days (family) | gesture | low |
| Love Language nudge | Random, max 1x/week | affirmation/gesture | low |
| Holiday approaching | Known holidays in 14d window | gift | medium |
| Anniversary milestone | Relationship year milestone (1yr, 5yr, 10yr) | experience | high |

### Suggestion Templates (Love Language Based)

**Words of Affirmation:**
- "Send [name] a text telling them something specific you appreciate about them"
- "Write a short note and leave it where they'll find it"
- "Tell [name] about a specific moment when they made you proud"

**Acts of Service:**
- "Take one of [name]'s regular chores off their plate today"
- "Prepare something they usually have to do themselves"
- "Offer to help with something they've been putting off"

**Receiving Gifts:**
- "Pick up something small that reminded you of [name]"
- "[name]'s love language is Receiving Gifts — even a $5 surprise counts"
- "Have you noticed something they've mentioned wanting lately?"

**Quality Time:**
- "Schedule dedicated, distraction-free time with [name] this week"
- "Suggest a new activity to try together"
- "Put your phone away during your next meal with [name]"

**Physical Touch:**
- "Greet [name] with an extra-long hug today"
- "Offer a shoulder/back rub without being asked"
- "Hold hands during your next walk together"

### Deduplication Rules
- Max 3 active suggestions per relationship at any time
- Same trigger_type for same relationship: minimum 7-day gap
- Dismissed suggestions for same trigger: don't resurface for 30 days
- Completed suggestions: never resurface same template for same person

---

## Premium Feature Gate Specification

| Feature | Free | Premium |
|---------|------|---------|
| Relationships | 3 max | Unlimited |
| Milestone types | Birthday, Anniversary, Custom (3) | All types + unlimited custom |
| Gift ideas per person | 10 max | Unlimited |
| Personality frameworks | MBTI + Love Languages | All frameworks |
| Suggestions | 1 per day | Unlimited |
| Gift budget tracking | — | ✓ |
| Relationship pulse score | — | ✓ |
| Data export | — | ✓ |
| Communication tips | Basic | Detailed + personality-specific |
| Cloud sync (Rev 2) | — | ✓ |
| AI suggestions (Rev 2) | — | ✓ |

### Premium Gate Implementation
- Feature flags stored in `user.premium_status`
- Gate at the UI level: show feature with lock icon + "Upgrade" prompt
- No server validation needed in Rev 1 (honor system, local storage)
- Rev 2: server-validated subscription status via Supabase + Stripe

---

## Empty States

Every list view needs a thoughtful empty state:

| Screen | Empty State |
|--------|-------------|
| Dashboard (no events) | "No upcoming events — add some important dates to get started!" + Add Person CTA |
| Dashboard (no suggestions) | "You're all caught up! Check back tomorrow for new ideas." |
| Relationships | "Add the important people in your life" + illustration + Add Person CTA |
| Gift Ideas | "Jot down gift ideas as they come to you — you'll thank yourself later!" + Add Idea CTA |
| Gift History | "No gifts logged yet — after you give a gift, log it here to track reactions!" |
| Preferences | "What does [name] love? Add their favorites to get better suggestions." |
| Calendar (month with no events) | Small dot-less state, no special handling needed |

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| IndexedDB unavailable | Show error screen: "Storage unavailable. Try using a supported browser." |
| Notification permission denied | Graceful fallback: in-app notification queue, no push |
| PWA install declined | Don't re-prompt for 30 days, track in settings |
| Data export fails | Retry with error message, offer smaller export |
| Image too large (avatar) | Client-side resize to max 500x500, compress to <200KB |
| Offline + Rev 2 sync attempt | Queue changes, sync when connection returns |
