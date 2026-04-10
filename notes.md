# Pod D - Build Notes

## Problem We're Solving

People care about their relationships but forget important dates, struggle to pick the right gifts, and don't know how to consistently show thoughtfulness. They need a system that remembers the details and nudges them at the right moments.

## Our Approach

Building **GiftMaster** — a PWA (Progressive Web App) that acts as a Relationship Intelligence Platform. It stores rich profiles about the people in your life (personality types, love languages, preferences, important dates) and proactively suggests gifts, affirmations, and meaningful gestures at the right moments.

**Tech stack**: React + Vite, Tailwind CSS, shadcn/ui, Dexie.js (offline-first IndexedDB), Zustand, Workbox PWA

**Key features (Rev 1)**:
- Onboarding wizard that captures your profile + your first relationship
- Rich relationship profiles with personality data (MBTI, Love Languages, Enneagram, DISC, Astrology)
- Milestone/event calendar with smart reminders
- Gift idea tracker with full lifecycle (idea → planned → purchased → given → rated)
- Rule-based suggestion engine that nudges you based on upcoming events, love languages, and frequency gaps
- Works fully offline after first load — installable on phone home screen

**Rev 2 vision**: AI-powered gift suggestions via Claude API, cloud sync via Supabase, and integrated gift planning (restaurant reservations, flower delivery, etc.)

## What We Built



## How to Use It



## What We'd Do Next

- Supabase backend for cloud sync and multi-device support
- Claude API integration for AI-powered gift suggestions
- Stripe integration for premium subscriptions
- External API integrations (OpenTable, 1-800-Flowers, Amazon)
- Shared wishlists and couple mode

## Prompts That Worked Well

*(paste any prompts here that got great results - useful for the presentation)*
