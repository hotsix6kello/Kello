# Kello MVP Stabilization Report

## Current Code State Summary

- Home booking now enters through `HomeBookingFlowEntry`, which delegates directly to the currently used `HomeBeautyBookingFlow`.
- The old `BookingFlowSkeleton` path was a deprecated experiment and is no longer part of the home booking runtime or preview routes.
- Booking API validation and storage still use the canonical agreement keys `serviceTermsAgreed`, `privacyPolicyAgreed`, and `thirdPartySharingAgreed`.
- `/explore` remains available for future map MVP work after the earlier redirect cleanup.
- Explore detail still contains only payment-preview messaging and does not implement a real checkout flow.

## Booking Flow Cleanup Result

- Deprecated the past skeleton booking flow and removed its runtime entry, preview page, supporting library, and skeleton-only tests.
- Kept the current booking implementation on `HomeBeautyBookingFlow` instead of introducing another booking rewrite.
- Left the current agreement mapping in `HomeBeautyBookingFlow` intact so existing booking payloads still match the beauty booking API contract.
- Simplified `HomeBookingFlowEntry` into a thin wrapper so future map/payment work attaches to one runtime path only.

## Remaining Issues Before Map MVP

- Explore still mixes multiple map implementations:
  - `src/app/explore/components/ExploreMap.tsx`: active Kakao-based map path.
  - `src/app/explore/components/KakaoMapContainer.tsx`: older Kakao container with unclear remaining usage.
  - `src/app/components/Map.tsx`: Leaflet-based component that appears separate from the active explore flow.
- Google Places API routes and client-side search shaping still need consolidation before map actions are added to booking.
- Map runtime selection is still a product/engineering decision; this pass only removed the booking skeleton dependency, not map duplication.

## Remaining Issues Before Payment Work

- Booking statuses still need a payment-aware lifecycle before PayPal can be added safely.
- No payment persistence layer exists yet; payment API routes and DB work should be introduced in a separate pass.
- Explore detail is still a preview surface and should not be treated as the eventual checkout entry point.
- Refund-policy capture is still limited by the current booking UI and should be finalized before real payment capture is introduced.

## Files Updated In This Pass

- `docs/kello-mvp-stabilization-report.md`
- `src/app/page.tsx`
- `src/app/components/home/HomeBookingFlowEntry.tsx`
- `src/lib/tests/home-booking-flow-entry.test.ts`
- `src/lib/tests/run-all.ts`

## Deleted Skeleton Files And References

- `src/app/booking-skeleton/page.tsx`
- `src/components/booking/flow-skeleton/*`
- `src/lib/bookings/bookingFlowSkeleton/*`
- Skeleton-only booking tests under `src/lib/tests`:
  - `booking-flow-*`
  - `home-booking-draft-debug-visibility.test.ts`
  - `home-booking-flow-entry-draft-*.test.ts`
  - `home-booking-flow-entry-runtime-draft-ready.test.ts`
  - `home-booking-flow-entry-store-context-draft.test.ts`
  - `home-booking-submit-debug-panel.test.ts`

## Files Not Updated And Why

- `src/app/components/home/HomeBeautyBookingFlow.tsx`
  This is the active booking implementation, so this pass left its logic intact and only changed the route that reaches it.
- `src/app/api/bookings/beauty/*`
  The active API contract already matches the current booking flow, so no additional route change was required.
- `src/app/my/*` and `src/app/admin/bookings/beauty/*`
  Reviewed as downstream consumers of booking data; no skeleton dependency remained there that required a code patch in this pass.
- `src/app/explore/components/*` and `src/app/components/Map.tsx`
  Map duplication remains a separate cleanup task and was intentionally kept out of this booking-only removal.

## Recommended Next Step Order

1. Add focused integration coverage for `HomeBeautyBookingFlow -> /api/bookings/beauty` so the now-single booking path is protected.
2. Define payment-aware booking statuses before any PayPal API work starts.
3. Choose one map runtime for MVP and mark the others deprecated before adding booking-on-map actions.
4. Add reservation status checks in my/admin views once payment states are introduced.

## PayPal Preparation: API And DB Proposal

Suggested booking status progression:

- `requested`
- `payment_required`
- `paid`
- `confirmed`
- `canceled`
- `refunded`

Suggested future API shape:

- `POST /api/payments/paypal/create-order`
- `POST /api/payments/paypal/capture-order`
- `POST /api/payments/paypal/webhook`
- `POST /api/bookings/beauty/:id/payment-intent`

Suggested future payment persistence fields:

- `payments.id`
- `payments.booking_id`
- `payments.provider`
- `payments.provider_order_id`
- `payments.provider_capture_id`
- `payments.status`
- `payments.amount_total`
- `payments.currency`
- `payments.created_at`
- `payments.updated_at`

These are documentation-only suggestions. No migration was added in this cleanup pass.

## Map MVP File Cleanup Proposal

- Keep `src/app/explore/page.tsx` as the MVP browse entry point.
- Pick one active map runtime before wiring booking or payment actions onto map cards.
- If Kakao stays primary, archive or clearly deprecate the unused Leaflet path.
- Consolidate business marker shaping and coordinate parsing into shared helpers before expanding browse-to-book behavior.

## Remaining Skeleton Keywords

- `src/app/components/home/HomeBookingFlowEntry.tsx`
  A single comment keeps the word `BookingFlowSkeleton` to document that the old route is deprecated and should not return.
- `src/app/community/page.tsx`
  The word `skeleton` remains only for generic loading placeholders and is unrelated to the deprecated booking flow.
