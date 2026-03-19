# MyPage 9-Language Inventory Audit

## Purpose

This document is the phase-1 inventory for expanding the mypage-related surface to 9 target languages:

- `ko`
- `en`
- `ja`
- `zh-CN`
- `zh-HK`
- `vi`
- `th`
- `id`
- `ms`

This is not a translation delivery step. The goal is to identify:

- which strings are already locale-key based
- which strings still depend on `defaultValue`
- which strings are still hardcoded
- which strings are runtime-composed and need formatter or key review

## Current Locale Structure

- Locale files currently live under `public/locales/<locale>/common.json`
- Relevant current locale folders:
  - `en`, `ko`, `vi`, `th`, `id`, `ms`
  - `jp`, `cn`, `tw`
- Current namespace structure is flattened into one `common.json` per locale, with grouped key prefixes such as:
  - `common.actions.*`
  - `common.states.*`
  - `common.runtime.*`
  - `my_page.*`
  - `help_page.*`
  - `planner_page.*`

## Locale Naming Gap For Phase 2

The requested rollout languages and the current locale directory names are not fully aligned:

- requested `ja` currently maps to repo locale folder `jp`
- requested `zh-CN` currently maps to repo locale folder `cn`
- requested `zh-HK` currently maps to repo locale folder `tw`

Before the actual 9-language rollout, the project needs an explicit decision:

1. keep current locale folder names and map them at app level, or
2. rename locale folders to the requested language identifiers

This audit does not change that behavior.

## Investigated Files

### Primary MyPage Routes

- `src/app/my/page.tsx`
- `src/app/my/bookings/page.tsx`
- `src/app/my/community/page.tsx`
- `src/app/my/support/page.tsx`
- `src/app/my/phrases/page.tsx`
- `src/app/my/saved/page.tsx`
- `src/app/my/settings/page.tsx`

### Directly Connected Booking-Aware Surfaces

- `src/app/planner/page.tsx`
- `src/app/help/page.tsx`
- `src/app/help/interpretation/page.tsx`
- `src/app/help/police/page.tsx`
- `src/app/help/medical/page.tsx`
- `src/app/help/lost/page.tsx`
- `src/app/explore/[id]/page.tsx`

### Locale Source Reviewed

- `public/locales/en/common.json`

## Inventory Summary By Route

### `/my`

Current state:

- mostly locale-key based
- relatively low risk compared with other mypage routes

Still not fully 9-language ready:

- some `defaultValue` fallbacks remain around timeline and fallback item labels
- several short badge/token strings are hardcoded
  - examples: `TS`, `BOOK`, `TODAY`, `POST`, `ADMIN`, `OK`

Assessment:

- low-to-medium follow-up effort
- mostly cleanup and consistency work

### `/my/bookings`

Current state:

- core headers, tabs, and most CTA labels already use keys
- booking-aware flow is structurally ready for localization

Still not fully 9-language ready:

- some `defaultValue` fallbacks remain
  - item type fallback such as `Attraction`
  - `View in Plan`
  - `Show booking phrases`
  - `Reference`
- short status-like tokens remain hardcoded
  - `QR`, `UP`, `DONE`, `LOG`

Assessment:

- low follow-up effort
- mostly small key cleanup and token review

### `/my/community`

Current state:

- top-level hub structure is localized

Still not fully 9-language ready:

- multiple empty state strings still depend on `defaultValue`
- loading text and helper copy still rely on fallback strings
- some comments/review helper text is still page-local fallback text

Assessment:

- medium follow-up effort
- needs a fuller `my_page.community_hub.*` pass

### `/my/support`

Current state:

- high-level tabs and some action labels are localized
- booking-aware structure exists and is reusable

Still not fully 9-language ready:

- heavy `defaultValue` dependence across:
  - summary cards
  - emergency/booking/general section descriptions
  - guide Q&A copy
  - booking-aware helper copy
  - empty states and bridge text

Assessment:

- high follow-up effort
- one of the biggest phase-2 targets

### `/my/phrases`

Current state:

- route structure and many reusable actions already use keys

Still not fully 9-language ready:

- hero text, booking-aware context text, category helper copy, empty states, and some phrase metadata still depend on `defaultValue`
- some surface-level labels are localized only through fallback text rather than explicit keys

Assessment:

- high follow-up effort
- top phase-2 target together with support/settings

### `/my/saved`

Current state:

- tab structure and many shared actions already use keys
- safe recent normalization policy is implemented

Still not fully 9-language ready:

- many `defaultValue` fallbacks remain in:
  - source labels
  - fallback titles/descriptions
  - empty states
  - recent/plans helper copy
  - add/save feedback text

Assessment:

- medium-to-high follow-up effort

### `/my/settings`

Current state:

- route structure exists and major sections are in place

Still not fully 9-language ready:

- heavy `defaultValue` dependence in:
  - account/profile rows
  - verification messages
  - preference fallback text
  - partner/admin descriptions
  - quick links helper copy

Assessment:

- high follow-up effort
- one of the biggest phase-2 targets

### `/planner` booking-aware surface

Current state:

- booking-aware banner exists
- planner focus flow is implemented

Still not fully 9-language ready:

- some booking-aware CTA text still depends on `defaultValue`
- some standalone hardcoded strings remain
  - `Auto-build coming soon`
  - `Remove`
  - `Loading...`

Assessment:

- medium follow-up effort
- only the booking-aware planner surface is in scope for mypage rollout

### `/help` and booking-aware detail routes

Current state:

- high-level structure and several actions already use keys
- booking-aware help flow is implemented

Still not fully 9-language ready:

- `/help/interpretation`, `/help/police`, `/help/medical`, `/help/lost` still contain many `defaultValue` descriptions, section titles, helper lines, and phrase guidance copy
- booking-aware CTA wording is structurally aligned, but not fully explicit-key based everywhere

Assessment:

- medium-to-high follow-up effort for connected help surfaces
- only the booking-aware/help-connected wording should be included in the mypage language pass

## Classification Summary

### Already Locale-Key Based

Mostly covered already:

- primary tab labels
- shared CTA labels under `common.actions.*`
- shared state labels under `common.states.*`
- some hub titles and section headings under `my_page.*`
- some help route headings under `help_page.*`
- runtime status/time helpers using `common.runtime.*`

### `defaultValue`-Dependent

Main backlog:

- `/my/support`
- `/my/phrases`
- `/my/settings`
- `/my/saved`
- `/my/community`
- booking-aware planner/help helper copy

### Hardcoded Strings

Examples found:

- compact badge/token labels in `/my` and `/my/bookings`
- `Auto-build coming soon`
- `Remove`
- `Loading...`
- some fallback-only utility labels across connected surfaces

### Runtime-Composed Strings

Current runtime composition areas:

- relative time and count labels via `common.runtime.*`
- status label formatting
- trip day/time formatting
- booking-aware meta rows using title, area, time, status, reference

Assessment:

- the runtime formatter base is already in better shape than the remaining static fallback copy
- phase 2 should focus more on missing explicit keys than on new formatter work

## Existing Key Reuse Candidates

### `common.actions.*`

Good reuse candidates:

- back
- support
- open_support
- open_my_support
- open_help_center
- booking_help
- interpreter_help
- interpreter_for_booking
- emergency_help
- show_emergency_phrases
- show_booking_phrases
- travel_phrasebook
- travel_phrases
- view_all
- view_details
- view_in_plan
- write_review
- report_issue
- explore_places
- browse_community
- browse_meetups
- open_admin_console

### `common.states.*`

Good reuse candidates:

- not_set_yet
- not_connected
- not_available_yet
- current_trip_plan
- planner_draft
- recently_viewed
- verified
- not_verified
- approved
- pending_review
- in_progress
- canceled
- loading
- saved_places
- trip_days
- plan_stops
- places
- plans
- reviews
- posts
- meetups

### `common.runtime.*`

Reuse for runtime-only content:

- relative time labels
- count labels
- trip day/time labels

### `my_page.bookings_hub.*`

Reuse candidates:

- route title/eyebrow
- tabs
- summary labels
- `meta.reference`

### `my_page.community_hub.*`

Reuse candidates:

- route title/subtitle
- tabs
- summary labels
- browse CTA labels

### `my_page.saved.*`

Reuse candidates:

- route title/eyebrow
- tabs
- section summary labels
- dashboard summary labels

### `my_page.settings.*`

Reuse candidates:

- route title/eyebrow/subtitle
- summary labels
- some account and verification fallback labels

### `help_page.*`

Reuse candidates:

- hub title/subtitle
- role card labels
- booking-aware description keys already introduced
- shared help hub CTA wording

### `planner_page.*`

Reuse candidates:

- planner focus title/desc
- planner status labels

## New Key Needs

## `common.*` Promotion Candidates

These should be considered for `common` if reused across multiple mypage/help surfaces:

- generic loading text if a single repo-wide label is preferred
- compact token/utility labels only if they remain user-visible across multiple routes
- generic unavailable/detail fallback labels where the same meaning repeats

### `my_page.support.*`

Largest missing key set.

Likely additions needed for:

- summary card titles and descriptions
- booking/general/FAQ/emergency helper copy
- guide Q&A entries
- empty states
- section descriptions
- booking-aware descriptive helper lines

### `my_page.phrases.*`

Likely additions needed for:

- hero title/subtitle/helper copy
- booking-aware context descriptions
- category support text
- empty states
- favorites/recent helper copy

### `my_page.settings.*`

Likely additions needed for:

- account row descriptions
- verification row descriptions
- preferences fallback guidance
- partner/admin helper lines
- quick link helper copy

### `my_page.saved.*`

Likely additions needed for:

- fallback source labels
- no-results/empty-state text
- plan/recent helper copy
- safe-detail fallback CTA descriptions where needed

### `my_page.community_hub.*`

Likely additions needed for:

- loading/empty-state text
- tab-specific helper copy
- comments/reviews fallback messages

### `my_page.dashboard.*`

Small additions may still be needed for:

- compact token replacements if they remain visible
- leftover timeline/helper fallbacks

### `planner_page.*`

Likely additions needed for connected booking-aware planner surface:

- booking-aware CTA fallbacks still using `defaultValue`
- remove/build/loading text if kept within planner scope

### `help_page.*`

Likely additions needed for connected booking-aware help surfaces:

- section descriptions in interpretation/police/medical/lost
- phrase guidance helper text
- booking-aware bridge copy
- generic helper lines currently only expressed through `defaultValue`

## Phase-2 Locale Structure Proposal

Use the existing single-file locale pattern for now:

- `public/locales/<locale>/common.json`

Do not introduce new namespace files yet.

Recommended phase-2 rollout structure inside `common.json`:

- expand existing `common.actions.*`
- expand existing `common.states.*`
- expand existing `my_page.bookings_hub.*`
- expand existing `my_page.community_hub.*`
- expand existing `my_page.support.*`
- expand existing `my_page.phrases.*`
- expand existing `my_page.saved.*`
- expand existing `my_page.settings.*`
- expand existing `help_page.*`
- expand existing `planner_page.*`

## Suggested Translation Priority For 9-Language Rollout

### Priority 1

- tabs
- primary buttons
- shared CTA labels
- booking-aware CTA labels

### Priority 2

- page titles
- section titles
- summary card headings
- route subtitles

### Priority 3

- empty states
- fallback labels
- safe/unsafe detail fallback copy

### Priority 4

- booking-aware helper copy
- support/help bridge text
- settings preference guidance

### Priority 5

- long descriptive blocks
- guide paragraphs
- medical/police/lost explanatory copy

## Route Risk Ranking For Phase 2

Highest translation cleanup effort:

1. `/my/support`
2. `/my/settings`
3. `/my/phrases`
4. `/my/saved`
5. `/my/community`

Medium effort:

6. connected `/help/*` booking-aware wording
7. connected `/planner` booking-aware surface

Lower effort:

8. `/my/bookings`
9. `/my`

## Current Recommendation

Phase 2 should not start by translating all fallback strings blindly.

Recommended order:

1. lock locale folder naming strategy for `ja / zh-CN / zh-HK`
2. replace high-volume `defaultValue` dependence with explicit keys in:
   - `/my/support`
   - `/my/settings`
   - `/my/phrases`
3. clean up `/my/saved`, `/my/community`, and booking-aware planner/help strings
4. only then populate the 9 target locales

## Scope Boundary For This Audit

Implemented in this phase:

- inventory only
- structure and priority classification only

Not done in this phase:

- no 9-language translation content
- no locale file population for `ja / zh-CN / zh-HK / vi / th / id / ms`
- no runtime behavior change
- no namespace refactor
