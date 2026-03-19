# External Provenance Introduction Criteria

## Purpose

This note defines when the codebase should introduce an explicit `external`
provenance type into itinerary/source models, and what the minimum contract
should look like when that happens.

This is a planning note only.

- no current runtime behavior changes
- no safe-detail rule changes
- no automatic nearby-to-catalog mapping

## Current State

The current branch already distinguishes two stable provenance types in
recommended plans:

- `catalog`
- `planner`

At the broader itinerary/runtime level, a third source already exists in
practice:

- external/runtime items from nearby search

However, current itinerary storage only preserves:

- local itinerary `id`
- optional `sourceItemId`

It does **not** preserve:

- source kind
- source provider
- source external id
- whether the source is detail-eligible

That is why current safe detail behavior stays conservative.

## When External Provenance Should Be Introduced

External provenance should be added only when at least one real product need
depends on preserving external source identity beyond a raw `sourceItemId`.

Good introduction triggers:

1. An itinerary item from nearby/runtime search must be persisted and later
   distinguished from catalog and planner-only items.
2. A downstream consumer needs source provider awareness, for example:
   - planner/detail surface
   - saved/recent normalization
   - booking/detail recovery
3. A screen must make a provenance-sensitive decision that cannot be answered by
   `sourceItemId` alone.
4. A trusted mapping source exists between external ids and supported catalog
   ids, and that mapping needs to be preserved.

If none of the above are true, adding `external` is premature.

## Minimal Contract Draft

If external provenance is introduced later, the minimum credible shape should be
small and explicit.

Suggested fields:

- `sourceType: "catalog" | "planner" | "external"`
  - why: preserves the main decision boundary in one field
- `sourceProvider?: "nearby" | "google_places"`
  - why: external ids are meaningless without provider context
- `sourceExternalId?: string`
  - why: preserves the provider-native identifier
- `sourceCatalogId?: string | null`
  - why: supports future mapped cases without pretending all external items are
    catalog items
- `detailEligible?: boolean`
  - why: prevents UI from inferring detail capability from provenance text alone

## Field Intent

- `sourceType`
  - required when provenance is meaningful across surfaces
- `sourceProvider`
  - required for external items
- `sourceExternalId`
  - required for external items
- `sourceCatalogId`
  - optional
  - should only be present when a trusted mapping source exists
- `detailEligible`
  - optional convenience flag
  - can be derived, but is useful when UI decisions must stay simple

## Storage Rules Draft

If external provenance is introduced, storage should follow these rules:

- catalog item
  - store `sourceType: "catalog"`
  - store catalog identifier in `sourceItemId` or `sourceCatalogId`
- planner-only item
  - store `sourceType: "planner"`
  - do not invent a catalog id
- external item
  - store `sourceType: "external"`
  - store `sourceProvider`
  - store `sourceExternalId`
  - do not store `sourceCatalogId` unless a trusted mapping exists

## Consumption Rules Draft

If external provenance exists later:

- planner focus
  - may use local itinerary id first
  - may use provider-aware external identity for recovery if explicitly needed
  - should not open catalog detail from external provenance alone
- safe detail CTA
  - still requires trusted catalog detail eligibility
  - external provenance alone is not enough
- support / help / phrases
  - can remain provenance-agnostic
  - these flows depend on booking context, not catalog detail capability
- saved / recent
  - provenance-based recomputation is safer than trusting old href strings when
    source identity is mixed

## Non-goals

Introducing external provenance should **not** be used to justify:

- automatic nearby-to-catalog mapping
- unsafe `/explore/[id]` deep-links
- treating external items as catalog items by default
- adding provider-specific UI badges without a user need
- adding external provenance without provider identity

## Why It Is Not Needed Yet

Current codebase constraints still make a full introduction premature:

- nearby items exist, but they do not have a trusted catalog mapping
- itinerary currently stores too little provenance metadata to distinguish all
  cases reliably
- current user-facing decisions are already handled conservatively by:
  - safe detail helper
  - planner fallback
  - guarded explore entrypoints

So for now:

- `catalog | planner` remains enough for recommended plan modeling
- external provenance is a future contract, not a current runtime requirement

## Recommended Next Trigger

Revisit this contract only when one of these becomes real work:

- itinerary starts persisting source provider metadata
- nearby items need stable re-entry beyond raw id storage
- a trusted external-to-catalog mapping source appears
- a booking/detail surface needs to distinguish planner-only from external items
