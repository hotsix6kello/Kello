# Planner-only Provenance Display Policy

## Purpose

This note defines how planner-only recommendation items should be treated in
planner/detail-adjacent UI.

The goal is not to expose provenance to users directly. The goal is to avoid
showing catalog-detail affordances for items that do not have a safe catalog
detail target.

## Policy

- Treat planner-only items as normal itinerary stops in user-facing UI.
- Do not add a dedicated "planner-only" badge or explanatory label by default.
- Only show catalog detail CTA when the itinerary item can safely resolve to an
  explore detail target.
- If an item cannot safely resolve to explore detail, keep support/help/phrases
  flows available, but do not show "View place details".

## Practical Rule

- Recommended plan provenance:
  - `sourceType: "catalog"` means the item came from a reusable explore catalog
    service id.
  - `sourceType: "planner"` means the item is a planner-only stop or placeholder.
- Itinerary display rule:
  - use `canShowCatalogDetailForItineraryItem(item)` when deciding whether to
    show a catalog detail CTA
  - do not infer catalog detail availability from title/time/type text

## Why This Stays Internal

Users usually only need to know:

- this is part of the plan
- this item has or does not have more place detail available

They do not usually need to see provenance terminology.

## Current Shared Helpers

- `isCatalogRecommendedPlanItem(item)`
- `isPlannerRecommendedPlanItem(item)`
- `canShowCatalogDetailForItineraryItem(item)`

These helpers are the preferred basis for future planner/detail CTA decisions.
