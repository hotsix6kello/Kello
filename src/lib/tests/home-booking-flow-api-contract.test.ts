import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const homeFlowSource = readFileSync(
  new URL("../../app/components/home/HomeBeautyBookingFlow.tsx", import.meta.url),
  "utf8",
);

const submitHelperSource = readFileSync(
  new URL("../../app/explore/beautyBooking.ts", import.meta.url),
  "utf8",
);

const bookingRouteSource = readFileSync(
  new URL("../../app/api/bookings/beauty/route.ts", import.meta.url),
  "utf8",
);

const bookingServerSource = readFileSync(
  new URL("../bookings/beautyBookingServer.ts", import.meta.url),
  "utf8",
);

await run("HomeBeautyBookingFlow builds a payload with the active booking core fields", () => {
  assert.match(homeFlowSource, /const payload: BeautyBookingPayload = \{/);
  assert.match(homeFlowSource, /category: 'beauty'/);
  assert.match(homeFlowSource, /beautyCategory: selectedStore\.category/);
  assert.match(homeFlowSource, /region: selectedStore\.region/);
  assert.match(homeFlowSource, /storeId: selectedStore\.id/);
  assert.match(homeFlowSource, /storeName: selectedStore\.name/);
  assert.match(homeFlowSource, /bookingDate: selectedDate/);
  assert.match(homeFlowSource, /bookingTime: selectedTime/);
  assert.match(homeFlowSource, /primaryServiceId: selectedServiceId/);
  assert.match(homeFlowSource, /primaryServiceName:/);
  assert.match(homeFlowSource, /customer: \{/);
  assert.match(homeFlowSource, /name: customerForm\.name/);
  assert.match(homeFlowSource, /email: sessionData\.session\?\.user\?\.email \?\? undefined/);
  assert.match(homeFlowSource, /phone: customerForm\.phone/);
  assert.match(homeFlowSource, /request: customerForm\.request/);
});

await run("HomeBeautyBookingFlow agreement keys match the current API contract", () => {
  assert.match(homeFlowSource, /serviceTermsAgreed: agreements\.serviceTermsAgreed/);
  assert.match(homeFlowSource, /privacyPolicyAgreed: agreements\.privacyPolicyAgreed/);
  assert.match(homeFlowSource, /thirdPartySharingAgreed: agreements\.thirdPartySharingAgreed/);
  assert.match(homeFlowSource, /marketingConsentAgreed: false/);
  assert.match(homeFlowSource, /refundPolicyAgreed: agreements\.refundPolicyAgreed/);
  assert.match(homeFlowSource, /refundPolicyAgreedAt: agreements\.refundPolicyAgreed \? new Date\(\)\.toISOString\(\) : null/);
  assert.doesNotMatch(homeFlowSource, /bookingConfirmed/);
  assert.doesNotMatch(homeFlowSource, /privacyConsent/);
  assert.doesNotMatch(homeFlowSource, /termsConsent/);
});

await run("HomeBeautyBookingFlow keeps image fields in the current API shape without skeleton payload fields", () => {
  assert.match(homeFlowSource, /imageUrls: \[\]/);
  assert.match(homeFlowSource, /currentImagePath: currentResult\.path \?\? undefined/);
  assert.match(homeFlowSource, /styleImagePath: styleResult\.path \?\? undefined/);
  assert.match(homeFlowSource, /currentImageName: currentImage\?\.file\.name/);
  assert.match(homeFlowSource, /styleImageName: styleImage\?\.file\.name/);
  assert.doesNotMatch(homeFlowSource, /mode:/);
  assert.doesNotMatch(homeFlowSource, /resolvedMode/);
});

await run("submitBeautyBooking posts JSON to /api/bookings/beauty and returns requested status", () => {
  assert.match(submitHelperSource, /fetch\('\/api\/bookings\/beauty'/);
  assert.match(submitHelperSource, /method: 'POST'/);
  assert.match(submitHelperSource, /'Content-Type': 'application\/json'/);
  assert.match(submitHelperSource, /body: JSON\.stringify\(payload\)/);
  assert.match(submitHelperSource, /status: 'requested'/);
});

await run("submit helper contract still defines canonical payload fields for map and payment integration", () => {
  assert.match(submitHelperSource, /export type BeautyBookingPayload = \{/);
  assert.match(submitHelperSource, /agreements:\s*\{[\s\S]*serviceTermsAgreed: boolean;/);
  assert.match(submitHelperSource, /createdFrom:\s*\{[\s\S]*flow: 'beauty-explore';/);
  assert.match(submitHelperSource, /refundPolicyAgreedAt: string \| null;/);
  assert.doesNotMatch(submitHelperSource, /bookingFlowSkeleton|flow-skeleton|booking-skeleton/);
});

await run("beauty booking route still coerces the same payload shape before persistence", () => {
  assert.match(bookingRouteSource, /const payload = coerceBeautyBookingPayload\(body\);/);
  assert.match(bookingRouteSource, /error: "valid beauty booking payload is required"/);
  assert.match(
    bookingRouteSource,
    /createBeautyBookingRequest\(\s*payload,\s*auth\?\.userId \?\? null,\s*auth\?\.email \?\? null,\s*\)/,
  );
});

await run("beauty booking route coercion requires the canonical agreement keys", () => {
  assert.match(submitHelperSource, /!isBoolean\(agreements\.serviceTermsAgreed\)/);
  assert.match(submitHelperSource, /!isBoolean\(agreements\.privacyPolicyAgreed\)/);
  assert.match(submitHelperSource, /!isBoolean\(agreements\.thirdPartySharingAgreed\)/);
  assert.match(submitHelperSource, /!isBoolean\(agreements\.marketingConsentAgreed\)/);
  assert.doesNotMatch(submitHelperSource, /bookingConfirmed|privacyConsent|termsConsent/);
});

await run("storage mapping still persists the same front-end payload fields expected by the API contract", () => {
  assert.match(bookingServerSource, /beauty_category: payload\.beautyCategory/);
  assert.match(bookingServerSource, /store_id: payload\.storeId/);
  assert.match(bookingServerSource, /booking_date: payload\.bookingDate/);
  assert.match(bookingServerSource, /booking_time: payload\.bookingTime/);
  assert.match(bookingServerSource, /customer_name: payload\.customer\.name/);
  assert.match(bookingServerSource, /customer_email: payload\.customer\.email \?\? customerEmail/);
  assert.match(bookingServerSource, /customer_phone: payload\.customer\.phone/);
  assert.match(bookingServerSource, /current_image_url: payload\.customer\.currentImageUrl \?\? null/);
  assert.match(bookingServerSource, /style_image_url: payload\.customer\.styleImageUrl \?\? null/);
  assert.match(bookingServerSource, /agreements: payload\.agreements/);
  assert.match(bookingServerSource, /created_from_flow: payload\.createdFrom\.flow/);
  assert.match(bookingServerSource, /payload_json: payload/);
});

await run("booking storage still writes current/style image metadata rows for admin review", () => {
  assert.match(bookingServerSource, /from\('beauty_booking_request_images'\)/);
  assert.match(bookingServerSource, /image_type: 'current'/);
  assert.match(bookingServerSource, /image_type: 'style'/);
  assert.match(bookingServerSource, /storage_path: payload\.customer\.currentImagePath/);
  assert.match(bookingServerSource, /storage_path: payload\.customer\.styleImagePath/);
  assert.match(bookingServerSource, /original_file_name: payload\.customer\.currentImageName \?\? null/);
  assert.match(bookingServerSource, /original_file_name: payload\.customer\.styleImageName \?\? null/);
});
