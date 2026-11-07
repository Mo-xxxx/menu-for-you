# Spoken mood: negative = Low, positive/optimistic = Good, everything else = Okay

## What changes for the user
When someone says how they feel instead of tapping a mood button:
- **Negative feelings become Low** — e.g. sad, tired, stressed, anxious, down, upset, lonely, worried, exhausted, ill, rough, fed up, "not great", "not good", "bad day".
- **Positive or optimistic feelings become Good** — e.g. happy, great, excited, cheerful, relaxed, energetic, hopeful, optimistic, fantastic, "feeling better", "looking forward", "not bad".
- **Anything else becomes Okay** — neutral words ("fine", "alright", "so-so"), mixed feelings, or just a food request with no feeling.
- The heard words are confirmed on screen and read aloud, e.g. "I heard you're feeling low", so the user can tap Back/Undo if it's wrong.

## Fixes to current behaviour
- "Not good" / "not happy" currently count as Good; negation (not, don't, never, isn't) will flip positive words to Low.
- "Cold" is weather, not a feeling, and is removed from mood words (weather is already handled separately).
- Words are matched whole, so "lowfat" or "goodies" don't trigger a mood. "Hungry" alone no longer means Good.
- If both negative and positive feelings are heard, the result is Okay.

Mood still only reorders safe dishes; allergy, diet, budget and distance checks are unchanged.

## Technical details
- Move `moodFromWords` from `request.tsx` into `src/lib/dining.ts` (browser-safe) with negative/positive word and phrase lists, whole-word matching, and a 3-word negation window.
- `request.tsx` imports it and speaks/shows the detected mood.
- Add tests in `src/lib/dining.test.ts`: one per rule (negative→low, positive→good, neutral/food-only→okay, "not good"→low, "not bad"→good, mixed→okay, "cold"→okay).
