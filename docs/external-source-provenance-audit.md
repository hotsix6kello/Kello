# External-source Provenance Audit

## Scope

This note checks whether the current provenance model needs a third source type
besides:

- `catalog`
- `planner`

The main question is whether runtime/external items already exist in the
codebase in a way that should be modeled explicitly.

## Files Reviewed

- `src/app/explore/page.tsx`
- `src/app/api/places/nearby/route.ts`
- `src/lib/savedHub.ts`
- `src/lib/bookingContext.ts`
- `src/lib/exploreDetail.ts`
- `src/lib/recommendedPlans.ts`
- `src/app/my/saved/page.tsx`

## External-source Items That Actually Exist

### Nearby API results

`/api/places/nearby` returns Google Places nearby search results.

In `src/app/explore/page.tsx`, those results are mapped into `ServiceItem`-like
objects with:

- `id: p.id`
- `title`
- `area`
- `type`
- `lat/lng`
- rating/reviews

These items are real runtime sources, but their ids are not current explore
catalog detail ids.

### How those ids propagate today

Nearby/runtime ids can already flow into:

- `saved_items`
  - Explore save button stores raw item ids
- `sourceItemId`
  - Add to Plan stores `selectedItemForPlan.id` even when the item came from the
    nearby API list
- recent place entries
  - Explore writes a recent place entry using the current item id

So yes: an external/runtime source is not hypothetical. It already exists.

## Why `catalog | planner` Still Works For Recommended Plans

The current provenance model in `recommendedPlans.ts` is about recommended plan
data only.

That model is still correct there:

- `catalog` means reusable explore catalog service
- `planner` means planner-only placeholder/stop

Recommended plan data does not currently contain nearby API/runtime items, so it
does not need `external` today.

## Gap Analysis

There is a real provenance gap at the broader itinerary/runtime level:

- some itinerary items originate from catalog services
- some originate from planner-only recommended stops
- some originate from external runtime search/nearby results

However, the current itinerary model only stores:

- local itinerary `id`
- optional `sourceItemId`

It does **not** store a source kind/provider field.

That means we can detect "safe catalog detail" conservatively, but we cannot
reliably distinguish:

- planner-only source
- external nearby/runtime source

once the item has been normalized into itinerary form, unless extra metadata is
stored.

## Safe Detail Implication

External/runtime items are not currently safe detail candidates.

Reasons:

- nearby ids are Google Places ids, not explore detail ids
- `sourceItemId` may hold an external id, but safe detail helper correctly
  rejects it
- no mapping exists from nearby/external id to a supported `/explore/[id]`
  detail id

So adding `external` today would improve provenance clarity, but not actual
detail capability yet.

## Conclusion

The correct conclusion is:

- external-source items **do** exist in the current codebase
- but for now, the current provenance model is still sufficient in
  `recommendedPlans.ts`
- at the broader itinerary/source modeling level, external-source is a valid
  future candidate

So this fits:

- **C. external-source exists, but there is not enough stable cross-surface
  evidence to add it to the shared provenance model yet**

## When `external` Would Become Worth Adding

It would become justified when at least one of these becomes true:

1. itinerary stores source kind/provider explicitly
2. nearby/runtime items gain a stable mapping to catalog detail ids
3. UI needs to distinguish external-origin items from planner-only items in a
   real user-facing way

## Minimal Future Shape

If this expands later, the smallest credible addition would be something like:

- `sourceType: "catalog" | "planner" | "external"`
- optional `sourceProvider?: "nearby"`
- optional `sourceExternalId?: string`

But this should only happen when itinerary/source pipelines can persist that
meaning consistently, not just in one screen.
