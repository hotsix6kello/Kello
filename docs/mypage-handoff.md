# mypage Branch Handoff

## 1. Branch Overview

The `mypage` branch expands `/my` from a simple dashboard into a connected
traveler hub with booking-aware support, phrasebook access, saved/recent
surfaces, and planner fallback flows.

The branch direction is now clear:

- `/my` acts as the main member hub
- `/my/bookings` is the entry point for booking-aware support flows
- `/my/support` is the help hub
- `/help/*` are scenario-specific detail pages
- `/my/phrases` is the on-site phrasebook
- `/planner` is the current booking-detail fallback surface
- safe explore detail behavior is intentionally conservative

Current branch state:

- main product flows are implemented
- deep-link and provenance policies are partially implemented and partially
  documented
- remaining work is mostly manual QA, policy follow-through, and future data
  stability improvements

## 2. Route Summary

### `/my`

- Refactored into a real dashboard hub
- Includes:
  - `ProfileSummaryCard`
  - `QuickActionBar`
  - `UpcomingBookingsSection`
  - `TodayPlanSection`
  - `CommunitySummarySection`
  - `PartnerStatusBanner`
  - `AdminShortcutCard`
  - `SavedHubSection`
- User-visible change:
  - direct entry into bookings, support, phrases, saved, settings, community

### `/my/bookings`

- Tabs: `Upcoming / Completed / Other`
- Booking-aware CTA hierarchy is implemented
- User-visible change:
  - Upcoming prioritizes `Booking Help`
  - Completed prioritizes `Write Review`
  - Other prioritizes `Report Issue`
  - `View Booking` was replaced with `View in Plan`
  - booking id display now uses `Reference`
- Connected routes:
  - `/my/support`
  - `/my/phrases`
  - `/planner`
  - `/my/community?tab=reviews`

### `/my/community`

- Tabs: `Posts / Reviews / Meetups`
- Connected from completed bookings to reviews
- Connected routes:
  - `/community/[id]`
  - `/my/bookings?tab=completed`

### `/my/support`

- Defined as the support hub
- Tabs: `Booking / General / FAQ / Emergency`
- User-visible change:
  - booking-aware context banner when entered from a booking flow
  - consistent CTA tone with help detail pages
  - clear relationship to `/help/*` and `/my/phrases`
- Connected routes:
  - `/help`
  - `/help/interpretation`
  - `/help/police`
  - `/help/medical`
  - `/help/lost`
  - `/my/phrases`

### `/my/phrases`

- Added as `Travel Phrasebook`
- Categories:
  - `Booking`
  - `Transport`
  - `Restaurant`
  - `Beauty`
  - `Emergency`
- User-visible change:
  - large-view phrase cards
  - local favorites/recent
  - booking-aware context card
  - booking-aware back flow
- Connected routes:
  - `/my/bookings`
  - `/my/support`
  - `/help/interpretation`

### `/my/saved`

- Added as `Places / Plans / Recent` hub
- Current sources:
  - Places: `saved_items`
  - Plans: current `trip_itinerary`
  - Recent: `saved_hub_recent`
- User-visible change:
  - safe/unsafe place detail handling is now guarded
  - recent place links are normalized before rendering
- Connected routes:
  - `/explore`
  - `/planner`
  - `/community/[id]`

### `/my/settings`

- Added as read-only settings/profile hub
- Sections:
  - `Account / Profile`
  - `Verification / Safety`
  - `Preferences`
  - `App Settings / Quick Links`
  - `Partner / Admin`
- Connected routes:
  - `/my`
  - `/my/support`
  - `/my/phrases`
  - `/my/saved`
  - `/my/bookings`
  - `/my/community`
  - `/admin` when eligible

### `/planner`

- Acts as the current booking-detail fallback surface
- User-visible change:
  - `View in Plan` can focus the matching itinerary item
  - focused booking banner includes booking-aware shortcuts
  - optional `View place details` CTA appears only for safe catalog detail cases
- Connected routes:
  - `/my/bookings`
  - `/my/support`
  - `/my/phrases`
  - `/help/interpretation`
  - optional `/explore/[id]` in safe pilot cases only

### `/help`

- Refined into the generic help hub
- User-visible change:
  - quick access to support, phrases, interpretation, police, medical, lost
  - booking-aware banner when entered from booking context
- Connected routes:
  - `/my/support`
  - `/my/phrases`
  - `/help/interpretation`
  - `/help/police`
  - `/help/medical`
  - `/help/lost`

### `/help/interpretation`

- Refined mobile-first interpretation detail page
- User-visible change:
  - booking-aware interpreter context
  - booking-aware CTA wording aligned with support/planner

### `/help/police`

- Refined emergency detail page
- User-visible change:
  - call-first CTA
  - booking-aware banner and secondary CTA when booking context exists

### `/help/medical`

- Refined emergency detail page
- User-visible change:
  - call-first CTA
  - booking-aware banner and secondary CTA when booking context exists

### `/help/lost`

- Refined lost-direction detail page
- User-visible change:
  - simple CTA set
  - light booking-aware banner when entered from booking context

### `/explore/[id]`

- Unknown / invalid / unsupported ids no longer fall through to a misleading
  generic detail
- User-visible change:
  - invalid ids show fallback state instead of wrong place detail

## 3. Shared Modules / Reusable Pieces

### `src/lib/bookingContext.ts`

- Role:
  - creates, reads, resolves, and re-applies booking query context
- Used by:
  - `/my/bookings`
  - `/my/support`
  - `/my/phrases`
  - `/planner`
  - `/help`
  - `/help/interpretation`
  - `/help/police`
  - `/help/medical`
  - `/help/lost`

### `src/components/booking/BookingContextBanner.tsx`

- Role:
  - common booking-aware banner / chip / action renderer
- Used by:
  - `/my/support`
  - `/planner`
  - `/help`
  - `/help/interpretation`
  - `/help/police`
  - `/help/medical`
  - `/help/lost`

### `src/lib/i18n/runtimeFormatters.ts`

- Role:
  - common runtime text formatting
- Covers:
  - relative time
  - trip day / time labels
  - count labels
  - itinerary status labels

### `src/lib/savedHub.ts`

- Role:
  - local saved/recent storage helpers
- Implemented policy:
  - `saved_items` stores ids only
  - `saved_hub_recent` stores entry metadata including raw `href`
  - place recent hrefs are normalized through:
    - `normalizeSavedHubRecentHref()`
    - `normalizeSavedHubRecentEntry()`

### `src/lib/exploreDetail.ts`

- Role:
  - conservative safe-detail helpers
- Implemented helpers:
  - `isSafeExploreDetailId`
  - `getSafeExploreDetailId`
  - `getSafeExploreDetailHref`
  - `getSafeExploreDetailIdFromItineraryItem`
  - `getSafeExploreDetailHrefFromItineraryItem`
  - `canShowCatalogDetailForItineraryItem`
- Current rule:
  - safe detail ids are currently derived from `MOCK_ITEMS`

### `src/lib/recommendedPlans.ts`

- Role:
  - typed recommended plan model and provenance helpers
- Current provenance model:
  - `catalog`
  - `planner`
- Implemented helpers:
  - `catalogPlanItem()`
  - `plannerPlanItem()`
  - `isCatalogRecommendedPlanItem()`
  - `isPlannerRecommendedPlanItem()`

### `src/lib/contexts/TripContext.tsx`

- Role:
  - persists `trip_itinerary` and trip state
- Current deep-link related state:
  - `ItineraryItem.sourceItemId?: string`

## 4. Core User Flows

### Booking-aware Support Flow

`/my/bookings`
-> `Booking Help`
-> `/my/support?...booking query...`
-> `Interpreter Help`
-> `/help/interpretation?...booking query...`
-> `Show booking phrases`
-> `/my/phrases?category=booking...`

Shared query context currently carries:

- `bookingId`
- `title`
- `area`
- `time`
- `status`

### Booking -> Planner Focus Flow

`/my/bookings`
-> `View in Plan`
-> `/planner?...booking query...`
-> exact itinerary item match or `sourceItemId` fallback
-> matching day opens
-> focused card scroll/highlight
-> booking-aware planner banner

### Support / Help / Phrases Relationship

`/my/support` = hub  
`/help/*` = scenario detail  
`/my/phrases` = on-site phrasebook

### Saved / Settings / Community Flow

`/my`
-> `/my/saved`
-> Places / Current Trip Plan / Recent

`/my`
-> `/my/settings`
-> account / verification / preferences / partner / admin summary

`/my/bookings?tab=completed`
-> `Write Review`
-> `/my/community?tab=reviews`

## 5. Safe Detail / Provenance Summary

### Current Product Reality

- `ItineraryItem.sourceItemId?: string` exists
- Explore Add to Plan stores `sourceItemId`
- Recommended plan apply stores `sourceItemId` only for catalog provenance items
- Planner focus matching order is:
  1. `item.id === bookingId`
  2. `item.sourceItemId === bookingId`
- Safe explore detail CTA exists only in `/planner` focused booking banner
- `/explore/[id]` shows fallback state for unknown / invalid / unsupported ids
- `/my/saved` and `/explore` entrypoints already guard unsafe direct detail links

### Current Source-of-Truth Rule

- Supported `/explore/[id]` detail ids currently use `MOCK_ITEMS` as the
  effective source of truth
- This is intentionally conservative
- There is not yet a broader real catalog source shared across explore, nearby,
  saved, and itinerary flows

### Current Provenance Model

- `recommendedPlans` currently supports:
  - `catalog`
  - `planner`
- Broader itinerary/source analysis confirmed that external/runtime items do
  exist
- External provenance is **not** in the product model yet

## 6. Implemented In Product

- `/my` hub refactor and downstream routes
- booking-aware support / interpretation / phrases flow
- booking-aware help hub and help detail banners
- CTA order / tone alignment across bookings, support, planner, help
- `View in Plan` fallback and planner focused booking behavior
- `sourceItemId` persistence on itinerary creation
- planner focus fallback to `sourceItemId`
- safe explore detail helper and planner safe CTA pilot
- `/explore/[id]` invalid-id fallback
- unsafe direct detail guards in `/my/saved` and `/explore`
- place recent normalization promoted into `savedHub`
- runtime formatter / locale wording cleanup

## 7. Documented Policy / Future Criteria

These are documented and aligned, but not fully modeled in product yet.

- booking deep-link audit:
  - [booking-deeplink-audit.md](C:/Users/USER/Desktop/kello/docs/booking-deeplink-audit.md#L1)
- safe explore detail rule:
  - [safe-explore-detail-deeplink-rule.md](C:/Users/USER/Desktop/kello/docs/safe-explore-detail-deeplink-rule.md#L1)
- safe explore detail source-of-truth audit:
  - [safe-explore-detail-source-of-truth-audit.md](C:/Users/USER/Desktop/kello/docs/safe-explore-detail-source-of-truth-audit.md#L1)
- planner-only provenance display policy:
  - [planner-only-provenance-display-policy.md](C:/Users/USER/Desktop/kello/docs/planner-only-provenance-display-policy.md#L1)
- external-source provenance audit:
  - [external-source-provenance-audit.md](C:/Users/USER/Desktop/kello/docs/external-source-provenance-audit.md#L1)
- nearby-to-catalog mapping audit:
  - [nearby-to-catalog-mapping-audit.md](C:/Users/USER/Desktop/kello/docs/nearby-to-catalog-mapping-audit.md#L1)
- external provenance introduction criteria:
  - [external-provenance-introduction-criteria.md](C:/Users/USER/Desktop/kello/docs/external-provenance-introduction-criteria.md#L1)
- saved/recent href recompute audit:
  - [saved-recent-href-provenance-recompute-audit.md](C:/Users/USER/Desktop/kello/docs/saved-recent-href-provenance-recompute-audit.md#L1)
- place recent provenance minimal contract:
  - [place-recent-provenance-minimal-contract-audit.md](C:/Users/USER/Desktop/kello/docs/place-recent-provenance-minimal-contract-audit.md#L1)

Key documented-only conclusions:

- external provenance exists conceptually, but product model has not adopted it
- nearby -> catalog mapping source does not currently exist
- `SavedHubRecentEntry` should not be expanded yet
- if place recent provenance is added later, it should be place-only and
  nested, not flat across all entry types

## 8. Wording / Locale / Formatter Summary

- Common wording moved toward:
  - `common.actions`
  - `common.states`
  - `my_page.*`
  - `help_page.*`
- Runtime formatter now standardizes:
  - relative time
  - trip day / time
  - counts
  - itinerary status labels
- Remaining reality:
  - some longer descriptive copy still relies on `defaultValue`
  - Korean locale coverage is improved, but not every long explanatory string is
    fully normalized

## 9. Open TODO

### Structural TODO

- dedicated booking detail route still does not exist
- `/planner` remains the booking-detail fallback surface
- stable real catalog source beyond `MOCK_ITEMS` does not exist yet

### Provenance / Data TODO

- external provenance is documented, not implemented
- nearby -> catalog mapping source does not exist
- `SavedHubRecentEntry` still stores raw `href`
- place recent provenance contract is documented, not implemented
- booking reference still uses truncated itinerary id

### UI / QA TODO

- real device QA still needed for mobile first-screen density
- status color semantics can still be tightened
- long help-body copy can still be compressed later

## 10. Manual QA Checklist

### Mobile viewport

- [ ] Check `360x800` for first-screen density and 2-line CTA balance
- [ ] Check `390x844` for top card spacing and banner/CTA rhythm
- [ ] Check `430x932` for breakpoint transition and top action blocks

### Booking-aware vs generic

- [ ] Compare `/my/support` generic vs booking-aware entry
- [ ] Compare `/my/phrases` generic vs booking-aware entry
- [ ] Compare `/help` generic vs booking-aware entry
- [ ] Compare `/help/interpretation` generic vs booking-aware entry
- [ ] Compare `/help/police` generic vs booking-aware entry
- [ ] Compare `/help/medical` generic vs booking-aware entry
- [ ] Compare `/help/lost` generic vs booking-aware entry

### Key route checks

- [ ] `/my/support` first screen: header CTA, summary cards, tabs, booking banner
- [ ] `/my/phrases` first screen: hero, context card, category chips, first card
- [ ] `/help/medical` top CTA row: call-first order, wrapping, booking-aware secondary actions
- [ ] `/my/saved` Places tab: safe detail CTA vs fallback `Explore Places`
- [ ] `/my/saved` Recent tab: unsafe place recent is downgraded to `/explore`
- [ ] `/planner` focused booking banner: support / phrases / interpreter always visible
- [ ] `/planner` safe detail CTA appears only when helper passes
- [ ] `/planner` no safe detail CTA for planner-only or unsafe items
- [ ] `/explore/unknown-id` shows fallback state instead of wrong detail
- [ ] `/explore/p1-1` and other unsupported ids do not show misleading detail

### Booking flow checks

- [ ] `/my/bookings` Upcoming -> `Booking Help` preserves booking context
- [ ] `/my/bookings` Upcoming -> `Show booking phrases` opens booking category
- [ ] `/my/bookings` -> `View in Plan` highlights matching item in planner
- [ ] planner focus exact match works for local itinerary id
- [ ] planner focus fallback works when `bookingId` matches `sourceItemId`

### Recent / localStorage checks

- [ ] old `saved_hub_recent` entry with unsafe `/explore/[id]` is normalized to `/explore`
- [ ] plan recent still opens `/planner`
- [ ] community recent still opens `/community/[id]`
- [ ] saved place ids without rich metadata still render fallback place cards

## 11. Merge Notes / Risks

- `npm run build` can fail on first try because Google Fonts fetch is network-sensitive
- safe explore detail rule is still based on `MOCK_ITEMS`
- external provenance is documented only; product model still uses current conservative rules
- booking detail route still does not exist
- raw booking reference is still based on truncated local itinerary id
- old saved recent entries depend on read-time normalization helpers
- nearby/external ids must not be treated as safe detail ids

## 12. Next-step Candidates

1. Real-device manual QA on `/my/support`, `/my/phrases`, `/help/medical`, `/my/saved`, and `/planner`
2. Revisit status color semantics across bookings / planner / support
3. If a real catalog source appears, replace `MOCK_ITEMS`-based safe detail rule
4. If a future consumer needs provider-aware place recovery, introduce the minimal place recent provenance contract
5. If booking detail becomes a real product surface, re-evaluate `/planner` fallback vs dedicated route

## 13. Supporting Files Worth Reviewing

- `src/app/my/page.tsx`
- `src/app/my/bookings/page.tsx`
- `src/app/my/community/page.tsx`
- `src/app/my/support/page.tsx`
- `src/app/my/phrases/page.tsx`
- `src/app/my/saved/page.tsx`
- `src/app/my/settings/page.tsx`
- `src/app/planner/page.tsx`
- `src/app/help/page.tsx`
- `src/app/help/interpretation/page.tsx`
- `src/app/help/police/page.tsx`
- `src/app/help/medical/page.tsx`
- `src/app/help/lost/page.tsx`
- `src/app/explore/[id]/page.tsx`
- `src/components/booking/BookingContextBanner.tsx`
- `src/lib/bookingContext.ts`
- `src/lib/exploreDetail.ts`
- `src/lib/i18n/runtimeFormatters.ts`
- `src/lib/recommendedPlans.ts`
- `src/lib/savedHub.ts`
