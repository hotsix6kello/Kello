# Safe Explore Detail Deep-link Rule

## Scope

This note defines when an itinerary item or booking context can safely open
`/explore/[id]` without risking a false-positive detail page.

This is intentionally conservative.

- No backend or schema changes
- No booking detail route changes
- No UI behavior changes in this step

## Files Reviewed

- `src/app/explore/[id]/page.tsx`
- `src/app/explore/page.tsx`
- `src/app/explore/mock/data.ts`
- `src/app/page.tsx`
- `src/lib/contexts/TripContext.tsx`
- `src/lib/bookingContext.ts`
- `src/app/planner/page.tsx`
- `src/app/my/bookings/page.tsx`

## What `/explore/[id]` Expects

`/explore/[id]` currently behaves like a service-detail route.

It reads `params.id` as a service-like id and uses that id for:

- `explore_items.${id}.title`
- `explore_items.${id}.desc`
- `explore_items.${id}.price`

This means the route is only reliable when `id` is already known by the current
explore catalog.

## Source ID Types Observed

### Safe candidates

These ids match the current static explore catalog in `MOCK_ITEMS`.

- `a1`, `a2`
- `b1`, `b2`
- `e1`, `e2`
- `f1`, `f2`, `f3`
- `fs1`, `fs2`

These ids are used by:

- static explore cards
- some recommended plan items
- `sourceItemId` stored from explore add-to-plan

### Unsafe or unknown candidates

These should not be sent to `/explore/[id]` yet.

- local itinerary ids such as `plan_b1_...`
- recommended-plan-only ids such as `p1-1`, `p2-2`, `p3-1`
- nearby API ids mapped from `places/nearby`
- any `sourceItemId` that is not present in the current explore catalog set

## Safe Rule

Direct deep-link to `/explore/[id]` is safe only when:

1. the itinerary item has `sourceItemId`
2. `sourceItemId` is in the current explore catalog id set

If either condition fails, keep the existing `/planner` fallback.

## Why This Is Conservative

`sourceItemId` does not always mean a reusable explore detail id.

- explore add-to-plan can store Google Places-style ids
- recommended plans mix real explore ids with planner-only ids
- `/explore/[id]` does not currently verify the id against a backend source

False-positive detail links are worse than keeping the planner fallback.

## Minimal Code Guard Added

`src/lib/exploreDetail.ts` now exposes:

- `isSafeExploreDetailId(sourceItemId)`
- `getSafeExploreDetailIdFromItineraryItem(item)`
- `getSafeExploreDetailHrefFromItineraryItem(item)`

These helpers only allow ids that exist in `MOCK_ITEMS`.

## Current Recommendation

Do not switch `/my/bookings` or `/planner` to direct `/explore/[id]` yet.

Use the safe helper only when a caller explicitly wants an optional detail link
and can fall back to `/planner` when the helper returns `null`.

## Next Safe Consumer Pattern

When a future surface wants a direct detail action:

1. try `getSafeExploreDetailHrefFromItineraryItem(item)`
2. if it returns a path, open `/explore/[id]`
3. otherwise keep the current `/planner` or booking-aware fallback
