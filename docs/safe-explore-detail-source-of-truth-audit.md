# Safe Explore Detail Source-of-Truth Audit

## Scope

This note audits whether the current safe explore detail rule should keep using
`MOCK_ITEMS`, or whether the codebase already has a better source of truth for
supported `/explore/[id]` detail ids.

This is an audit only.

- No route changes
- No backend or schema changes
- No UI changes

## Files Reviewed

- `src/app/explore/mock/data.ts`
- `src/app/explore/page.tsx`
- `src/app/explore/[id]/page.tsx`
- `src/app/page.tsx`
- `src/app/my/saved/page.tsx`
- `src/lib/exploreDetail.ts`
- `public/locales/en/common.json`
- `public/locales/ko/common.json`

## Current Explore Data Sources

### 1. `MOCK_ITEMS`

`src/app/explore/mock/data.ts` defines the only typed, shared catalog-like list
of supported explore services.

It provides:

- stable ids such as `a1`, `b1`, `f2`, `fs1`
- service category/type
- title and area defaults
- price defaults
- coordinates
- other service metadata used in explore cards and detail pages

This same data is reused in:

- `/explore`
- `/explore/[id]`
- home recommended/search surfaces
- planner mock references
- saved hub fallback lookup
- `src/lib/exploreDetail.ts`

### 2. `explore_items` locale keys

`public/locales/*/common.json` contains `explore_items.*` keys, but this is not
a reliable service catalog source.

Reasons:

- it only contains translated text fields, not full service metadata
- it mixes service ids with non-detail keys such as:
  - `airport_arrival`
  - `hotel_checkin`
- it also contains entries like `t1` that are not currently represented in
  `MOCK_ITEMS`

This makes locale keys useful for copy, but unsafe as the authority for
supported `/explore/[id]` detail ids.

### 3. Nearby API items

`/explore` can switch from `MOCK_ITEMS` to nearby results from
`/api/places/nearby`.

These items are mapped into `ServiceItem` shape in `src/app/explore/page.tsx`,
but their ids are Google Places-like ids, not current explore detail ids.

They are valid for:

- map/list rendering
- save/add-to-plan

They are not currently valid as `/explore/[id]` detail ids.

### 4. Recommended plan items

Recommended plan items in `src/app/page.tsx` are mixed:

- some reuse real catalog ids like `a1`, `b1`, `f2`
- some are planner-only ids like `p1-1`, `p2-2`, `p3-1`
- some translation keys like `airport_arrival` and `hotel_checkin` are used for
  labels but do not represent supported explore detail pages

This makes recommended plan data a consumer of catalog ids, not a safe source
of truth for them.

## Why `MOCK_ITEMS` Is the Current Safe Rule Basis

`src/lib/exploreDetail.ts` currently builds the safe id set from `MOCK_ITEMS`.

That is conservative, but correct for the current codebase because:

1. `/explore/[id]` reads its detail metadata from `MOCK_ITEMS`
2. `/explore/[id]` also expects locale keys using those same ids
3. no other shared module currently defines the supported detail-id set more
   accurately

In other words:

- for the **Explore list experience**, there is no single source of truth
- for the **supported Explore detail-id set**, `MOCK_ITEMS` is currently the
  de facto source of truth

## Candidate Replacements

### Candidate A: Locale `explore_items` keys

Verdict: not suitable

Pros:

- already shared across screens
- includes text for many visible services

Cons:

- not typed as a catalog
- missing non-text metadata needed by detail pages
- contains non-detail keys (`airport_arrival`, `hotel_checkin`)
- may contain ids that do not map to a supported detail page

### Candidate B: `/explore` page `baseItems`

Verdict: not suitable

Pros:

- represents what the user currently sees in Explore
- includes both static and nearby results

Cons:

- not a shared source outside the page
- can be populated by nearby API items with unsupported ids
- changes at runtime based on location/category

### Candidate C: Recommended plan ids

Verdict: not suitable

Pros:

- some items reuse catalog ids already

Cons:

- mixed with planner-only ids
- not a catalog module
- not guaranteed to cover all supported detail services

### Candidate D: A future shared service catalog module

Verdict: best long-term direction, not present yet

Pros:

- could unify detail id support, metadata, and search/list/detail consumers
- could replace `MOCK_ITEMS` without changing calling code much

Cons:

- does not exist in the current codebase
- would require deliberate extraction or backend-backed catalog work later

## Final Conclusion

For the current branch, the correct conclusion is:

- there is **not** a better existing single source of truth to replace
  `MOCK_ITEMS` with right now
- for supported `/explore/[id]` detail ids specifically, `MOCK_ITEMS` should
  continue to be treated as the source of truth for now

So the current rule should remain:

- keep `MOCK_ITEMS` as the safe detail-id set
- keep nearby ids, planner-only ids, and translation-only ids out of direct
  detail routing

## Practical Migration Path Later

If a better catalog source becomes available later, the migration can stay
small because the safety rule is already centralized.

Primary switch points:

1. `src/lib/exploreDetail.ts`
2. `src/app/explore/[id]/page.tsx`

Secondary consumers already rely on the helper:

- `/planner`
- `/my/saved`
- `/explore`

That means a future migration can be:

1. replace `SAFE_EXPLORE_DETAIL_IDS` with the new catalog source
2. keep helper function signatures the same
3. let existing consumers inherit the new rule automatically

## What Would Need To Exist Before Replacing `MOCK_ITEMS`

At least one of the following:

- a shared, typed service catalog module that clearly defines supported detail
  ids
- a backend/catalog API with stable service ids used consistently by Explore and
  planner-related surfaces
- a normalized source where nearby items and recommended plan items can be
  mapped to a real detail-capable service id

Until then, replacing `MOCK_ITEMS` would increase false positives more than it
would improve coverage.
