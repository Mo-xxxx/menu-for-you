# Dining Assistant — Version 1 Plan

Voice-first, accessible app that finds safe, affordable, nearby food and explains the best 3 options in plain language.

## Phase 1 — Screens, navigation, data (this build)
1. Enable Lovable Cloud: email sign-in, database, server functions.
2. Tables: profiles, restaurants, menu_items, ingredients, menu_item_ingredients, events, context_snapshots, plus learned_preferences (for viewing, correcting and resetting learning). Row-level security: users read/write only their own profile, events, context and preferences; restaurants/menus readable by signed-in users.
3. Sample data: ~10 London restaurants with ~40 menu items, ingredients with allergen groups, mixed confidence badges.
4. Screens (one decision per screen, progress bar, Back/Undo on every step):
   - Sign in, then consent screen (UK GDPR) before storing diet/allergy/mood data.
   - Profile setup: diet tags, allergies, budget, distance — each a step with big mic, "heard" confirmation row, large Next.
   - Request: Low / Okay / Good mood buttons, "Speak instead", one-line weather note.
   - Map and list: list of nearby restaurants within distance (map placeholder until Phase 2); select to see menu.
   - Top 3: fixed-order cards; tap to hear.
   - Details: full ingredients, confidence badge, allergen warning, Listen / Like / Skip / Save.
   - My data: view, edit, export (JSON), delete profile and learned preferences.
5. Hard filters in a server function: allergies, diet, budget, distance removed in the query before ranking.
6. Voice: browser speech recognition + browser text-to-speech. Audio order always: name, price, distance, diet match, key ingredients.
7. Ranking v1: preference score from past likes/skips/saves (cuisine, dish, price range) plus mood and weather; only reorders safe items.

## Phase 2 — Map, weather, real places
- Google Maps connector: real map with markers, nearby restaurant search (signed-in calls only, capped, cached), weather note from Google weather.

## Phase 3 — AI menus and explanations
- Lovable AI: read menus from websites/photos into dishes, ingredients, tags — always marked AI-inferred, never shown as guaranteed safe.
- AI-written one-line summaries and "why this fits" reasons.

## Design
- Calm, high contrast by default, large text (scalable), generous spacing, 56px+ tap targets, visible focus rings, icons + words (never colour alone). Settings for text size and contrast.
- Distinctive warm palette (deep ink on cream, one strong accent), readable font like Atkinson Hyperlegible.

## Technical details
- TanStack Start routes per screen; protected screens under the signed-in area.
- Filtering + ranking in a Postgres function called from an authenticated server function (distance via haversine).
- Events stored with a context snapshot id; learned preferences derived from events, user can override/reset; never touch allergies/diet.
- Keys stay server-side; browser map key is the restricted one.

## Not in v1
Payments, ordering, native apps, medical/nutrition advice.
