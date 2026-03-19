# mypage QA Runbook

## 1. Purpose and How to Use

This document is an execution runbook for:

- human manual QA on mobile or responsive browser viewports
- AI QA agents that can drive a browser and validate expected UI states

Use this document for:

- smoke testing the `mypage` branch
- booking-aware flow checks
- safe/unsafe detail guard checks
- mobile CTA density and wrapping checks

Do **not** use this document as the architectural source of truth. For that,
start from:

- [mypage-handoff.md](C:/Users/USER/Desktop/kello/docs/mypage-handoff.md#L1)

## 2. Test Preconditions

### 2.1 Browser / Device Setup

- Preferred viewport checks:
  - `360x800`
  - `390x844`
  - `430x932`
- Test both:
  - generic entry
  - booking-aware entry

### 2.2 Minimum App State

Recommended baseline:

- logged-in user if available
- if auth is unavailable, local fallback still allows most UI paths
- clear stale state before each run unless the scenario explicitly requires old
  localStorage

### 2.3 Reset Snippet

Run in browser console before starting a clean pass:

```js
localStorage.removeItem("trip_itinerary");
localStorage.removeItem("trip_days");
localStorage.removeItem("saved_items");
localStorage.removeItem("saved_hub_recent");
localStorage.removeItem("user");
location.reload();
```

### 2.4 Seed Snippet: Booking-aware Baseline

Use this when you need bookings, planner focus, support, and phrasebook flows:

```js
localStorage.setItem("user", JSON.stringify({ name: "QA Tester" }));
localStorage.setItem("trip_days", "3");
localStorage.setItem(
  "trip_itinerary",
  JSON.stringify([
    {
      id: "booking-safe-1",
      sourceItemId: "b1",
      name: "Jenny House Cheongdam",
      time: "14:00",
      status: "confirmed",
      lat: 37.524,
      lng: 127.044,
      day: 1,
      slot: "pm",
      type: "beauty"
    },
    {
      id: "booking-unsafe-1",
      sourceItemId: "google-place-unsafe-1",
      name: "Nearby Runtime Cafe",
      time: "18:30",
      status: "confirmed",
      lat: 37.554,
      lng: 127.014,
      day: 1,
      slot: "night",
      type: "food"
    },
    {
      id: "booking-completed-1",
      name: "Completed Dinner",
      time: "19:00",
      status: "completed",
      lat: 37.534,
      lng: 126.994,
      day: 2,
      slot: "night",
      type: "food"
    }
  ])
);
location.reload();
```

### 2.5 Seed Snippet: Saved / Recent Normalization

Use this when you need old recent entries, including unsafe `/explore/[id]`:

```js
localStorage.setItem("saved_items", JSON.stringify(["b1", "google-place-unsafe-1"]));
localStorage.setItem(
  "saved_hub_recent",
  JSON.stringify([
    {
      id: "p1-1",
      type: "place",
      title: "Legacy Unsupported Place",
      href: "/explore/p1-1",
      viewedAt: new Date().toISOString(),
      subtitle: "Legacy place"
    },
    {
      id: "b1",
      type: "place",
      title: "Jenny House Cheongdam",
      href: "/explore/b1",
      viewedAt: new Date().toISOString(),
      subtitle: "Beauty · Cheongdam"
    },
    {
      id: "current-plan",
      type: "plan",
      title: "Current Trip Plan",
      href: "/planner",
      viewedAt: new Date().toISOString(),
      subtitle: "Planner"
    },
    {
      id: "123",
      type: "community",
      title: "Community Meetup",
      href: "/community/123",
      viewedAt: new Date().toISOString(),
      subtitle: "Meetup"
    }
  ])
);
location.reload();
```

### 2.6 Generic vs Booking-aware

- Generic entry:
  - open route directly without booking query params
- Booking-aware entry:
  - start from `/my/bookings`
  - or open `/planner`, `/my/support`, `/help/*`, `/my/phrases` with booking
    query params already present

## 3. Core Smoke Flows

### Flow 1. `/my` -> `/my/bookings`

**Preconditions**

- baseline seed applied or existing itinerary data present

**Steps**

1. Open `/my`
2. Verify dashboard loads without blocking errors
3. Open `/my/bookings`

**Expected result**

- bookings page opens
- tabs render: `Upcoming / Completed / Other`
- seeded bookings appear under the correct tabs

**Failure examples**

- blank bookings list when confirmed/completed itinerary exists
- tabs missing or wrong tab categorization
- dashboard button routes to the wrong page

### Flow 2. `/my/bookings` Upcoming -> `Booking Help` -> `/my/support`

**Preconditions**

- at least one `confirmed`, `submitted`, or `in_progress` itinerary item exists

**Steps**

1. Open `/my/bookings`
2. Stay on `Upcoming`
3. Tap `Booking Help` on the first booking card

**Expected result**

- `/my/support` opens
- booking-aware banner is visible
- banner shows booking title and metadata chips
- CTA order is support-first and booking-aware

**Failure examples**

- support opens in generic mode with no booking context
- wrong booking title/time/area appears
- CTA order does not match booking-aware support pattern

### Flow 3. `/my/bookings` Upcoming -> `View in Plan` -> `/planner` focus

**Preconditions**

- at least one itinerary item exists in `Upcoming`

**Steps**

1. Open `/my/bookings`
2. Tap `View in Plan` on a booking card

**Expected result**

- `/planner` opens
- matching day tab is selected
- matching card is highlighted and scrolled into view
- top booking-aware banner appears

**Failure examples**

- planner opens on wrong day
- no focused card highlight
- banner missing even though booking query exists

### Flow 4. `/planner` focused booking -> booking-aware shortcuts

**Preconditions**

- a focused booking banner is visible in `/planner`

**Steps**

1. In the focused booking banner, tap:
   - `Booking Help`
   - `Show booking phrases`
   - `Interpreter for this booking`
2. Return and repeat for the optional `View place details` CTA when visible

**Expected result**

- `Booking Help` -> `/my/support` with booking context
- `Show booking phrases` -> `/my/phrases?category=booking...`
- `Interpreter for this booking` -> `/help/interpretation?...`
- `View place details` appears only for safe catalog detail items

**Failure examples**

- safe detail CTA appears on unsafe or planner-only items
- interpreter CTA drops booking context
- phrases opens in generic emergency mode instead of booking mode

### Flow 5. `/my/support` -> `/help/interpretation`

**Preconditions**

- generic or booking-aware support entry

**Steps**

1. Open `/my/support`
2. Go to the booking-aware banner or emergency/interpreter entry
3. Open interpretation help

**Expected result**

- `/help/interpretation` opens
- generic entry stays generic
- booking-aware entry preserves booking banner and booking-aware CTA wording

**Failure examples**

- interpretation page loses booking context
- generic interpretation incorrectly shows booking banner

### Flow 6. `/help/police`, `/help/medical`, `/help/lost` generic entry

**Preconditions**

- no booking query params

**Steps**

1. Open `/help/police`
2. Open `/help/medical`
3. Open `/help/lost`

**Expected result**

- each page shows call-first or primary page-role CTA
- no booking-aware banner is shown
- layout stays readable at mobile widths

**Failure examples**

- booking chips appear without booking query
- top CTA order is broken or unreadable

### Flow 7. `/my/phrases` generic entry

**Preconditions**

- no booking query params

**Steps**

1. Open `/my/phrases`
2. Switch categories
3. Open large view on a phrase

**Expected result**

- generic phrasebook hero is visible
- no booking-aware context card
- categories switch correctly
- large view opens and closes cleanly

**Failure examples**

- booking banner appears on generic entry
- actions overlap or wrap badly on small screens

### Flow 8. `/my/phrases` booking-aware entry

**Preconditions**

- enter from `/my/bookings`, `/my/support`, `/help/interpretation`, or use a
  booking query directly

**Steps**

1. Open `/my/phrases` from a booking-aware CTA

**Expected result**

- booking category is selected or prioritized
- booking context card is visible
- back flow is booking-aware rather than generic

**Failure examples**

- opens in generic state without booking context
- context card missing or wrong booking metadata shown

### Flow 9. `/my/saved` place recent normalization

**Preconditions**

- seed recent data with both safe and unsafe place hrefs

**Steps**

1. Open `/my/saved?tab=recent`
2. Find:
   - one safe place recent
   - one unsafe place recent
3. Open each CTA

**Expected result**

- safe place recent still behaves like a detail entry
- unsafe place recent is downgraded to `/explore`
- plan recent still opens `/planner`
- community recent still opens `/community/[id]`

**Failure examples**

- unsafe place recent still opens `/explore/unsupported-id`
- plan/community entries are incorrectly normalized like place entries

### Flow 10. `/explore/unknown-id` fallback

**Preconditions**

- none

**Steps**

1. Open `/explore/unknown-id`
2. Open `/explore/p1-1`
3. Open another clearly unsupported id if needed

**Expected result**

- fallback state appears
- page does not show a misleading generic service detail
- user can recover via fallback CTA

**Failure examples**

- wrong static beauty detail appears
- blank screen
- runtime error page

## 4. Viewport QA Matrix

### Viewports

- `360x800`
- `390x844`
- `430x932`

### Priority Screens

- `/my/support`
- `/my/phrases`
- `/help/medical`
- `/help/interpretation`
- any screen showing `BookingContextBanner`

### What to Check at Each Width

- CTA 2-line button height balance
- spacing between banner and action block
- first-screen density
- generic vs booking-aware header difference
- primary CTA remains visually first
- secondary actions wrap without awkward clipping

### Route-specific Notes

#### `/my/support`

- summary cards should not crowd the first screen
- booking-aware banner should not push tabs too far down

#### `/my/phrases`

- hero + context card should not feel stacked too tightly
- category chips should remain tappable

#### `/help/medical`

- call-first CTA must remain the first readable action
- booking-aware secondary actions should not look primary

#### `/help/interpretation`

- generic and booking-aware top blocks should remain visually consistent

## 5. Booking-aware Special Checks

### Planner focus exact match

Use:

- a query where `bookingId === itinerary item.id`

Expected:

- exact match is used
- planner focuses the matching itinerary row

### Planner focus `sourceItemId` fallback

Use:

- itinerary item with `id !== sourceItemId`
- open `/planner?bookingId=<sourceItemId>`

Expected:

- planner still finds the correct itinerary row
- banner and highlight still work

### Safe detail CTA visible case

Use:

- focused booking with `sourceItemId` equal to a supported catalog id like `b1`

Expected:

- `View place details` is visible

### Safe detail CTA hidden case

Use:

- focused booking with external/unsupported `sourceItemId`
- or no `sourceItemId`

Expected:

- `View place details` is not visible

### Unsafe `/explore/[id]` fallback

Use:

- `/explore/unknown-id`
- `/explore/p1-1`
- old unsafe recent place href

Expected:

- fallback state or `/explore` downgrade
- never a misleading catalog detail

## 6. Manual QA Checklist

### Route smoke

- [ ] `/my` loads dashboard cards and quick actions
- [ ] `/my/bookings` tabs and status buckets are correct
- [ ] `/my/community` tabs render and review route works
- [ ] `/my/support` generic entry works
- [ ] `/my/phrases` generic entry works
- [ ] `/my/saved` Places / Plans / Recent tabs work
- [ ] `/my/settings` loads read-only hub state
- [ ] `/planner` loads with and without booking query
- [ ] `/help` generic hub works
- [ ] `/help/interpretation` works
- [ ] `/help/police` works
- [ ] `/help/medical` works
- [ ] `/help/lost` works
- [ ] `/explore/[id]` valid id works
- [ ] `/explore/[id]` invalid id fallback works

### Booking-aware flow

- [ ] `/my/bookings` -> `Booking Help` preserves context
- [ ] `/my/bookings` -> `Show booking phrases` preserves context
- [ ] `/my/bookings` -> `View in Plan` focuses planner correctly
- [ ] `/planner` focused banner support CTA works
- [ ] `/planner` focused banner phrases CTA works
- [ ] `/planner` focused banner interpreter CTA works
- [ ] `/help/interpretation` keeps booking context when entered booking-aware
- [ ] `/help/police` booking-aware banner appears only when expected
- [ ] `/help/medical` booking-aware banner appears only when expected
- [ ] `/help/lost` booking-aware banner appears only when expected

### Safe / unsafe detail

- [ ] safe planner item shows `View place details`
- [ ] unsafe planner item hides `View place details`
- [ ] `/my/saved` safe place shows detail CTA
- [ ] `/my/saved` unsafe place falls back to `Explore Places`
- [ ] old unsafe recent `/explore/[id]` is normalized to `/explore`

### Mobile layout

- [ ] `360x800` first-screen density acceptable
- [ ] `390x844` CTA rows wrap cleanly
- [ ] `430x932` top card spacing remains balanced
- [ ] booking-aware banners do not overwhelm the first screen
- [ ] generic and booking-aware top sections remain visually distinct

## 7. AI QA Prompt Section

### Prompt 1. Booking-aware smoke pass

```text
Run a booking-aware smoke pass on the mypage branch.
Use a mobile viewport first, preferably 390x844.
Start from /my/bookings with seeded itinerary data.
Verify:
- Booking Help -> /my/support preserves booking context
- View in Plan -> /planner focuses the correct item
- Planner banner shortcuts open support, phrases, and interpretation with preserved context
Report failures as: route, step, observed result, expected result.
```

### Prompt 2. Safe / unsafe detail guard pass

```text
Run a safe/unsafe detail guard pass.
Check /planner focused booking banner, /my/saved Places, /my/saved Recent, and /explore/[id].
Verify that safe catalog ids can open detail, unsafe ids do not expose direct detail, and unsupported /explore/[id] values show fallback state.
Report any false-positive detail route as a blocker.
```

### Prompt 3. Mobile CTA density pass

```text
Run a mobile CTA density pass at 360x800, 390x844, and 430x932.
Focus on /my/support, /my/phrases, /help/interpretation, /help/medical, and any screen with BookingContextBanner.
Check CTA wrapping, button height balance, spacing, and first-screen density.
Classify issues as blocker, minor polish, or documented limitation.
```

## 8. Known Limitations / Expected Non-goals

- `npm run build` may require retry because Google Fonts fetch can fail on first attempt
- external provenance is documented only
- booking detail route still does not exist
- safe detail rule is still based on `MOCK_ITEMS`
- raw booking reference is still derived from local itinerary id
- nearby/external items are not safe catalog detail targets

## 9. Pass / Fail Triage Guide

### Blocker

- booking-aware context is lost across route transitions
- planner focus lands on the wrong item or no item
- safe detail CTA appears for unsafe items
- unsupported `/explore/[id]` shows a misleading real detail page
- page crashes, blank screens, or broken navigation

### Minor polish

- 2-line CTA buttons feel tall or uneven
- spacing is too dense on one viewport
- generic vs booking-aware top area could read more clearly
- badge/order/label rhythm feels slightly off but logic is correct

### Documented limitation

- no dedicated booking detail route
- no external provenance model in product yet
- safe detail source still tied to `MOCK_ITEMS`
- booking reference is still truncated local id
