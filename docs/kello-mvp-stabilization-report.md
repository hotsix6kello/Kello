# Kello MVP Stabilization Report

## Current Code State Summary

- Home booking currently resolves to the skeleton flow by default, while the legacy home modal still remains as an explicit fallback path.
- Booking API validation and storage already expect canonical agreement keys such as `serviceTermsAgreed`, `privacyPolicyAgreed`, and `thirdPartySharingAgreed`.
- Several tests were still pinned to older legacy agreement keys and legacy-default mode behavior, which no longer matched the runtime.
- `/explore` existed and built successfully, but `next.config.ts` redirected it back to `/`, which blocked map MVP access.
- Explore detail still exposed a mock payment success alert that could be mistaken for a real payment completion.

## Booking Flow Cleanup Result

- Kept `skeleton` as the primary booking flow and treated legacy home booking as fallback-only.
- Aligned the legacy home booking agreement state to the same canonical keys used by the booking payload and API layer.
- Preserved the current legacy single privacy checkbox by mirroring it into both `privacyPolicyAgreed` and `thirdPartySharingAgreed` until the shared skeleton fully replaces the legacy modal.
- Updated booking-related tests to follow the skeleton-default runtime and the canonical agreement field names.

## Remaining Issues Before Map MVP

- Explore currently mixes multiple map implementations:
  - `src/app/explore/components/ExploreMap.tsx`: active Kakao-based map used by home modal flows.
  - `src/app/explore/components/KakaoMapContainer.tsx`: legacy standalone Kakao container with unclear active usage.
  - `src/app/components/Map.tsx`: Leaflet-based generic map component that appears unused in the current booking flow.
- Google Places API routes exist and build, but explore page behavior still depends on client-side Kakao SDK loading and geolocation handling.
- Explore map/search code still contains duplicated client-side data shaping that should be consolidated before a broader map rollout.

## Remaining Issues Before Payment Work

- Real payment state transitions are not modeled yet beyond the current booking request lifecycle.
- Explore detail remains a placeholder preview surface and should not be used as the eventual checkout entry point.
- Skeleton submit flow still sends `refundPolicyAgreed: false` because the shared skeleton does not yet collect refund consent explicitly.
- No dedicated payment persistence layer exists yet; any `payments` table work should stay separate from this stabilization pass.

## Files Updated In This Pass

- `next.config.ts`
- `src/app/components/home/HomeBeautyBookingFlow.tsx`
- `src/app/components/home/HomeBookingFlowEntry.types.ts`
- `src/app/explore/detail/page.tsx`
- Booking and home booking test files under `src/lib/tests`

## Files Not Updated And Why

- `src/app/explore/components/ExploreMap.tsx`
  Current active map surface is large and legacy-heavy; this pass only removed the route-level blocker instead of refactoring the full map runtime.
- `src/app/explore/components/KakaoMapContainer.tsx`
  Left in place because active usage is unclear and deleting it now would expand scope.
- `src/app/components/Map.tsx`
  Left untouched because it appears unused but may still be part of future map experiments.
- `src/app/api/bookings/beauty/*`
  API payload validation was already aligned with canonical agreement keys, so no route contract change was required.
- `src/app/my/*` and `src/app/admin/bookings/beauty/*`
  Reviewed for booking status and agreement consumption; no minimal stabilization patch was required in this pass.

## Recommended Next Step Order

1. Move all home booking entry points onto the skeleton flow without relying on the legacy modal fallback.
2. Define payment-aware booking statuses and UI state transitions before adding any PayPal API calls.
3. Pick a single map runtime for MVP browse/search and archive the unused alternatives after usage is confirmed.
4. Add focused integration tests for booking creation and customer booking retrieval.

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

These are documentation-only suggestions. No migration was added in this stabilization pass.

## Map MVP File Cleanup Proposal

- Keep `src/app/explore/page.tsx` as the MVP browse entry point now that the redirect blocker is removed.
- Choose between:
  - `src/app/explore/components/ExploreMap.tsx` as the active Kakao MVP path, or
  - `src/app/components/Map.tsx` only if a Leaflet-based fallback is intentionally adopted.
- After the active map path is chosen, mark the other map components as deprecated in code comments or archive them in a follow-up cleanup PR.
- Consolidate coordinate parsing and business marker shaping into a shared helper before adding booking-on-map actions.
