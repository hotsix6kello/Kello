# Nearby-to-Catalog Mapping Audit

## Scope
- Audit whether nearby API items can be reliably mapped to current `/explore/[id]` detail ids.
- Focus on existing codebase signals only.
- No product behavior change in this pass.

## Files Reviewed
- `src/app/api/places/nearby/route.ts`
- `src/app/explore/page.tsx`
- `src/app/explore/mock/data.ts`
- `src/app/explore/[id]/page.tsx`
- `src/lib/exploreDetail.ts`
- `src/lib/savedHub.ts`
- `src/app/my/saved/page.tsx`
- `src/lib/recommendedPlans.ts`

## Nearby Item Fields
Nearby items are fetched from Google Places nearby search in `src/app/api/places/nearby/route.ts`.

Requested fields:
- `places.id`
- `places.displayName`
- `places.formattedAddress`
- `places.location`
- `places.rating`
- `places.userRatingCount`
- `places.types`
- `places.photos`

Mapped into `ServiceItem`-like objects in `src/app/explore/page.tsx`:
- `id: p.id`
- `title: p.displayName.text`
- `area: p.formattedAddress.split(',')[1]?.trim() || p.formattedAddress`
- `type: current category`
- `lat/lng`
- `rating`
- `reviews`
- `description: p.formattedAddress`
- `badges: []`

## Current Catalog Detail Fields
Current detail-capable catalog items come from `src/app/explore/mock/data.ts` via `MOCK_ITEMS`.

Relevant fields:
- `id`
- `city_id`
- `type`
- `title`
- `area`
- `lat/lng` on some items
- extra display metadata such as price, badges, image color, duration, theme

`/explore/[id]` currently treats a detail id as valid only when it can be found in `MOCK_ITEMS`.

## Field Comparison
Potential matching signals:
- `id`
- `title`
- `area`
- `type`
- `lat/lng`

Signal quality:
- `id`
  - Nearby: Google Places runtime id
  - Catalog: local mock catalog id like `a1`, `b1`, `f2`
  - Result: no direct compatibility
- `title`
  - Nearby: provider display name
  - Catalog: curated product-facing title
  - Result: partial clue only
- `area`
  - Nearby: parsed from `formattedAddress`, sometimes lossy
  - Catalog: curated short area label
  - Result: partial clue only
- `type`
  - Nearby: coarse category derived from current filter
  - Catalog: coarse category
  - Result: too broad to identify an item
- `lat/lng`
  - Nearby: provider coordinates
  - Catalog: optional, sometimes missing
  - Result: useful only as weak proximity hint

## Existing Mapping Source Audit
No reliable nearby-to-catalog mapping source was found in the current codebase.

Checked and not found:
- explicit mapping table from Google Places id to catalog id
- shared service registry with both provider ids and catalog ids
- translation key layer that maps nearby ids to `explore/[id]`
- planner or saved metadata that stores catalog id alongside nearby id
- any normalization helper that resolves nearby items into current detail ids

Related existing sources are insufficient:
- `MOCK_ITEMS`
  - good source for supported detail ids
  - does not contain provider ids for nearby places
- `explore_items.*` locale keys
  - text source only
  - includes non-detail keys
- `saved_items`
  - stores raw ids only
- `sourceItemId`
  - can hold nearby ids, but currently without source kind/provider metadata

## Feasibility Assessment
Conclusion: **C. There is no reliable existing mapping source in the current codebase.**

There are partial clues, but automatic mapping would have high false-positive risk.

Why auto-mapping is unsafe right now:
- Google Places id is not a catalog detail id.
- title matching can drift because provider names and curated titles differ.
- area matching is weak because `formattedAddress` is normalized loosely.
- category/type is too broad to identify a unique item.
- location proximity alone is not enough to avoid wrong matches.

## Impact on Current Safe Detail Policy
Current policy remains correct:
- safe catalog detail ids should continue to be based on the known supported detail source
- nearby/runtime items should remain outside direct `/explore/[id]` linking unless a real mapping source appears

This supports the current behavior:
- safe detail CTA only when safe helper passes
- `/planner` remains the main fallback for mixed or unknown provenance
- `/my/saved` and `/explore` should continue guarding unsafe direct detail links

## Recommendation
Treat nearby items as external/runtime items for now.

Do not auto-promote nearby ids into catalog detail ids unless one of the following becomes available:
- a shared service catalog with provider ids and catalog ids together
- a deterministic mapping table
- stored provenance on itinerary items that includes source provider plus trusted catalog mapping

Until then:
- keep `MOCK_ITEMS` as the source for supported explore detail ids
- keep external nearby items on fallback flows
- avoid name/area/type based automatic mapping

## Practical Next Step
If future work needs nearby-to-catalog resolution, the minimum safe prerequisite is a real mapping source such as:
- `sourceProvider: "nearby"` plus `sourceExternalId`
- a catalog record containing provider ids
- a dedicated lookup table from provider ids to supported catalog ids
