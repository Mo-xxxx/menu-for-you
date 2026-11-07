# Real-location menus, menu import, and editable saved menus

Built in 4 stages so each one can be tried before the next.

## Stage 1 - Your real location
- Use the phone's location as the search centre (today it falls back to central London when you are far away; that fallback goes).
- If location is refused: a "Say or type a place or postcode" step (voice first, typing optional), looked up through Google.
- Restaurant search re-runs when the location or distance changes, with a calm "Updating nearby places..." state that keeps the layout still.
- Every place found is saved once (Google place id, name, position, website, menu date) and reused. Menus older than 30 days, or after "Refresh menu", get re-read.

## Stage 2 - Menus from restaurant websites, filled in the background
- The map loads first; nearby places with a website join a queue and their menus fill in as they finish ("Reading menu..." then "Menu on file").
- Reader: homepage, then links that look like menus (menu, food, drinks, order, PDF), including PDF menus. Checks robots.txt, waits between requests to the same site, caches results.
- Each dish saved with its source link and type (website / pdf / photo / user) and "AI-read" confidence unless the restaurant states allergens.
- No menu found: "No menu found yet" with an Upload menu button.

## Stage 3 - Upload menu photos, screenshots or PDFs
- Camera, gallery, screenshot or PDF. Originals stored privately for you only.
- AI reads them, then an editable review screen (one dish per screen, voice "keep / change / remove") before anything is saved. Nothing AI-read is ever shown as safe without being reviewed.

## Stage 4 - Favourites become your own editable menu file
- Tapping Favourite creates your personal menu file for that restaurant: details, all dishes, ingredients, prices, confidence badges, source links, version number.
- "My favourites" screen: open the file, edit dishes, prices, ingredients, allergens, notes; add or delete dishes; re-upload a photo to update it.
- Every save is a new version with Undo and "Last edited by you". Your edited dishes are marked "You checked".
- Download as a file, or delete it any time.
- When the restaurant's shared menu is refreshed, your edits are never overwritten; you see "Menu changed, review updates" and choose what to take.

## Safety (unchanged rules)
- Allergy, diet, budget and distance checks still happen on the server before ranking.
- AI-read dishes always say "Confirm allergens with the restaurant".
- Your files, uploads and edits are private to you.
- Decision to confirm: dishes you check in your own file count as checked for your own suggestions only, never for other people.
- Voice, large buttons, one decision per screen and the fixed read-aloud order apply to every new screen.

## Technical details
- Stack note: the brief asks for edge functions; this app uses TanStack server functions and `/api/public/*` routes instead (same server-side key safety).
- Location: rewrite `use-location.ts` (status: asking/granted/denied/manual), new `geocodePlace` server fn in `maps.functions.ts`; query keys include lat/lng/radius.
- DB: `restaurants` gains unique `google_place_id`, `last_checked_at`; `menu_items` gains `source_url`, `source_type`, `description`. Places upserted by place id.
- Queue: `menu_jobs` table (restaurant, status, attempts, next_run_at, unique per restaurant), lease-row single-flight lock, small batch per run, circuit breaker on 402/403/429, managed HTTP schedule every few minutes calling `/api/public/jobs/menu-queue`. Robots.txt check + per-host delay in `menu-website.server.ts`; PDFs passed to the AI as files.
- Uploads: private bucket `menu-uploads`, owner-folder RLS; `menu-photo.functions.ts` returns drafts, saving only after review.
- Menu files: `menu_files` (user, restaurant, current_version, base_menu_hash, has_upstream_changes) and `menu_file_versions` (version, json, created_at); JSON copy in private `menu-files` bucket. Owner-only RLS, cascade on profile delete, included in My data export/delete.
- `find_safe_items` extended to also accept the caller's own user-verified dishes from their latest file version (still applying all hard filters); others never see them.
- Tests: location fallback, robots rule, version/undo, "never overwrite user edits", own-only verified dishes.
