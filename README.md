# Menu for you

Build a responsive, mobile-first web app called "Dining Assistant": an accessible, voice-first app that finds food around the user that is safe, affordable and nearby, and explains the best 3 options in plain language. It is built for visually impaired users and users with dyspraxia. It also learns each user's preferences over time using AI.

CORE RULES
- Allergies, diet, budget and distance are HARD filters. Remove any non-matching item before anything is ranked. Enforce this in the database query / server function, never only in the UI.
- Every action must work without typing: voice, large tap targets, or mood buttons.
- One decision per screen, visible progress indicator, an Undo/Back on every step, no surprise layout movement.

TECH
- Use Supabase for auth, database and server functions. Use a maps/places service for a real map and nearby restaurants (ask me for API keys when needed; keep keys server-side). No separate adapter or middleware.
- Use browser speech recognition for voice input and browser text-to-speech (or a TTS service) to read summaries aloud.

SCREENS
1. Profile setup (voice or tap): diet tags (vegan, halal, gluten-free, etc.), allergies, budget maximum per meal, maximum distance. Large mic button, rows that confirm what was heard, a big Next button.
2. Request: three large mood buttons (Low, Okay, Good), a "Speak instead" button, and a one-line weather note. Example request: "Something warm and light, under £12".
3. Map and list: show a real map of restaurants around the user's location within their chosen distance, with a matching list below. Selecting a restaurant shows its menu items.
4. Top 3 results: three large cards in a fixed order: name, price, distance, diet match, key ingredients, and a one-line reason it fits (for example "You liked this last week and it's cold today"). Tap a card to hear it read aloud.
5. Details: full ingredient list, allergen confidence badge (Verified, Restaurant-stated or AI-inferred), a clear "Confirm allergens with the restaurant" warning, and big Listen, Like, Skip and Save buttons.
6. My data: view, edit, export and delete profile data and learned preferences.

DATA MODEL (Supabase tables)
- profiles: user_id, diet_tags, allergies, budget_max, max_distance_m, accessibility settings (voice-first, text size, high contrast), consent flag
- restaurants: id, name, lat/long, opening_hours, price_band, source, menu_updated_at
- menu_items: id, restaurant_id, name, price, diet_tags, summary_text, audio_summary_text, allergen_confidence (verified / restaurant_stated / ai_inferred)
- ingredients and menu_item_ingredients (join table), each ingredient with an allergen_group
- events: user_id, item_id, type (liked / skipped / saved), timestamp, context_id
- context_snapshots: mood, weather, time_of_day, distance_m
Add row-level security so users can only read and write their own profile, events and context data.

MENUS AND AI
- Map services rarely include full menus, so gather menu data for restaurants in the area from restaurant websites, delivery platforms or menu photos, and use AI to read dishes, ingredients and dietary tags. Mark every AI-read item as "ai_inferred" and never present it as guaranteed safe.
- Use AI to write the one-line summaries and the "why this fits" reasons in plain language.

AI PREFERENCE LEARNING
- Record likes, skips and saves with mood, weather and time of day.
- After the hard filters, rank the remaining items with a preference score based on past events (favoured cuisines, dishes, price range) plus current mood and weather.
- Learning only reorders safe options and must never change the user's allergies or diet.
- Let users see why an option was suggested, correct a learned preference, and reset it.

ACCESSIBILITY
- Meet WCAG 2.2 AA: semantic HTML, ARIA labels, full screen-reader support, visible focus states, high contrast by default, scalable text, and colour never the only signal.
- Audio summaries always use this order: name, price, distance, diet match, key ingredients.
- Calm, simple design with generous spacing and plain language.

PRIVACY
- Ask for explicit consent before storing diet, allergy or mood data (UK GDPR). Provide data export and delete.

NOT IN VERSION 1
- Payments or in-app ordering, native apps, medical or nutrition advice.

Start by building the screens, navigation and Supabase tables with sample data, then connect the map, voice and AI features.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/98858653-78c1-46d0-a795-eda0fbb5300a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
