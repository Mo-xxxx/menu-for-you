<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Safe-food filtering and ranking live in the `find_safe_items` Postgres function, called only via the `findSafeItems` server function; the UI never filters for safety itself.
- Learned preferences are updated by a trigger on `events`; rows with `user_override` are not changed by learning.
- Speech parsing and summary formatting live in `src/lib/dining.ts` (browser-safe, unit-tested).
- Google Places and Weather calls go through signed-in server functions in `src/lib/maps.functions.ts`; the browser key is used only to draw the map. Places without checked menus are never presented as safe.
- Menus are read by AI from photos (`menu-photo.functions.ts`) or the place's website (`menu-website.functions.ts`), saved via `menu-store.server.ts` as ai_inferred + review_status pending; only person-confirmed dishes reach `find_safe_items`. AI "possible allergens" become "may contain" ingredient rows.

- Menu browsing is separate from recommendations: preserve the request context through uploads and reviews, and invalidate menu/status/recommendation queries after changes so the journey stays current without bypassing database safety checks.
- Include stored real-menu restaurants within the map radius independently of Places search results; their markers open full menus, while recommendation eligibility remains exclusively in the database.
- Carry the selected map marker through menu links as display-only search data so menu headings and transcription status identify the same restaurant without changing eligibility.
- Restaurant menu favourites are private per-user bookmarks with owner-scoped access and profile-delete cascade; they add only a small database ranking boost after all hard filters and never confirm dishes.
- Group safe dishes into restaurants using each restaurant's highest database score, with distance only as a tie-breaker, so mood and learned ranking survive grouping.
- Search centre comes only from device location or a user-chosen place (shared via localStorage in use-location.ts); never a hidden fixed-city fallback, so results match where the user really is.
- Accessibility settings are owned at runtime by the browser store in `src/lib/accessibility.ts` (applied as data attributes on `<html>`); the saved profile only seeds a device that has no choices of its own, and the accessibility toolkit adapters in `src/lib/toolkit/` switch that same store rather than a copy, so any change is visible immediately and never touches safety filtering.
- Final personal records use owner-scoped, paginated reads and a deterministic browser-safe summary shared by display, speech, and export; include only explicitly selected device settings, never toolkit tokens or session storage, to keep exports complete and private.
- Restaurant choices are explicit consent-gated actions, not menu views; owner-scoped rows preserve restaurant, date, and request context with removal and profile-delete cascade so browsing is not mistaken for intent.
- Menu-specific recommendations restrict the output of findSafeItems on the server to the selected restaurant; never rerank or determine safety in menu UI, so shared ranking and safety stay authoritative.
