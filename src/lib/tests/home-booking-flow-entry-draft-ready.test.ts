import assert from "node:assert/strict";

import { buildHomeBookingDraftReadyEvent } from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";
import type { BookingFlowCategory, BookingFlowState } from "../bookings/bookingFlowSkeleton/types.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createTestState(category: BookingFlowCategory): BookingFlowState {
  return {
    currentStep: "service-selection",
    category,
    selectedServiceId: null,
    selectedDate: null,
    selectedTime: null,
    customerDetails: {
      name: "",
      phone: "",
      requestNote: "",
      profileSource: "none",
      profileSnapshot: null,
      currentStateImages: [],
      desiredStyleImages: [],
    },
    confirmation: {
      bookingConfirmed: false,
      privacyConsent: false,
    },
  };
}

await run("draft-ready event does not emit outside skeleton mode", () => {
  const state = createTestState("hair");
  const event = buildHomeBookingDraftReadyEvent({
    mode: "legacy",
    enableSkeletonMode: true,
    draftInput: {
      state,
      storeContext: { storeId: "store-1" },
    },
  });

  assert.equal(event.shouldEmit, false);
  assert.equal(event.payload, null);
});

await run("draft-ready event does not emit when skeleton feature flag is disabled", () => {
  const state = createTestState("hair");
  const event = buildHomeBookingDraftReadyEvent({
    mode: "skeleton",
    enableSkeletonMode: false,
    draftInput: {
      state,
      storeContext: { storeId: "store-2" },
    },
  });

  assert.equal(event.shouldEmit, false);
  assert.equal(event.payload, null);
});

await run("draft-ready event emits when skeleton mode is enabled with valid skeleton state", () => {
  const state = createTestState("hair");
  state.selectedServiceId = "hair-cut";
  state.selectedDate = "2026-07-01";
  state.customerDetails.name = "Emma";
  state.customerDetails.phone = "+821012345678";

  const event = buildHomeBookingDraftReadyEvent({
    mode: "skeleton",
    enableSkeletonMode: true,
    draftInput: {
      state,
      storeContext: { storeId: "store-3", storeName: "Preview Shop", region: "Seoul" },
      primaryServiceName: "Cut",
      agreements: { bookingConfirmed: true, privacyConsent: true },
    },
  });

  assert.equal(event.shouldEmit, true);
  assert.notEqual(event.payload, null);
});

await run("draft-ready payload keeps unresolved store state when storeId is missing", () => {
  const state = createTestState("nail");
  state.selectedServiceId = "nail-gel";
  state.selectedDate = "2026-08-10";
  state.customerDetails.name = "Alex";
  state.customerDetails.phone = "010-1234-5678";

  const event = buildHomeBookingDraftReadyEvent({
    mode: "skeleton",
    enableSkeletonMode: true,
    draftInput: {
      state,
      storeContext: {},
    },
  });

  assert.equal(event.shouldEmit, true);
  assert.notEqual(event.payload, null);
  assert.equal(event.payload?.store.storeId, null);
  assert.equal(event.payload?.unresolved.missingStoreId, true);
});

await run("draft-ready payload reflects placeholder booking time policy when date exists", () => {
  const state = createTestState("makeup");
  state.selectedServiceId = "makeup-daily";
  state.selectedDate = "2026-09-02";
  state.customerDetails.name = "Mina";
  state.customerDetails.phone = "01077778888";

  const event = buildHomeBookingDraftReadyEvent({
    mode: "skeleton",
    enableSkeletonMode: true,
    draftInput: {
      state,
      storeContext: { storeId: "store-4" },
    },
  });

  assert.equal(event.shouldEmit, true);
  assert.equal(event.payload?.schedule.bookingDate, "2026-09-02");
  assert.equal(event.payload?.schedule.bookingTime, "10:00");
  assert.equal(event.payload?.schedule.usesPlaceholderTime, true);
});

await run("draft-ready payload includes flattened images and legacy category mapping", () => {
  const state = createTestState("eyelash");
  state.selectedServiceId = "lash-extension";
  state.selectedDate = "2026-09-15";
  state.customerDetails.name = "Ria";
  state.customerDetails.phone = "+821055551111";
  state.customerDetails.currentStateImages = [
    {
      id: "current-1",
      kind: "current-state",
      fileName: "current-lash.jpg",
      fileSize: 1200,
      mimeType: "image/jpeg",
    },
  ];
  state.customerDetails.desiredStyleImages = [
    {
      id: "desired-1",
      kind: "desired-style",
      fileName: "desired-lash.jpg",
      fileSize: 2300,
      mimeType: "image/jpeg",
    },
  ];

  const event = buildHomeBookingDraftReadyEvent({
    mode: "skeleton",
    enableSkeletonMode: true,
    draftInput: {
      state,
      storeContext: { storeId: "store-5" },
    },
  });

  assert.equal(event.shouldEmit, true);
  assert.equal(event.payload?.category.newCategory, "eyelash");
  assert.equal(event.payload?.category.legacyCategory, "lash");
  assert.equal(event.payload?.images.flattened.length, 2);
  assert.equal(event.payload?.images.flattened[0]?.sourceGroup, "currentStateImages");
  assert.equal(event.payload?.images.flattened[1]?.sourceGroup, "desiredStyleImages");
});

await run("draft-ready payload includes minimum callback contract fields", () => {
  const state = createTestState("aesthetic");
  state.selectedServiceId = "aesthetic-basic-care";
  state.selectedDate = "2026-10-01";
  state.customerDetails.name = "Sara";
  state.customerDetails.phone = "01099990000";

  const event = buildHomeBookingDraftReadyEvent({
    mode: "skeleton",
    enableSkeletonMode: true,
    draftInput: {
      state,
      storeContext: { storeId: "store-6" },
      primaryServiceName: "Basic care",
    },
  });

  assert.equal(event.shouldEmit, true);
  assert.notEqual(event.payload, null);
  const payload = event.payload!;

  assert.ok("category" in payload);
  assert.ok("store" in payload);
  assert.ok("schedule" in payload);
  assert.ok("service" in payload);
  assert.ok("customer" in payload);
  assert.ok("images" in payload);
  assert.ok("agreements" in payload);
  assert.ok("unresolved" in payload);

  assert.equal(typeof payload.category.legacyCategory, "string");
  assert.equal(typeof payload.store.storeId, "string");
  assert.equal(typeof payload.schedule.bookingTime, "string");
  assert.equal(typeof payload.images.totalCount, "number");
  assert.equal(typeof payload.unresolved.missingStoreId, "boolean");
});
