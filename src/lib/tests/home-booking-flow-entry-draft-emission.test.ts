import assert from "node:assert/strict";

import { resolveHomeBookingDraftReadyEmission } from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";
import type { HomeBookingDraftReadyEmissionInput } from "../../app/components/home/HomeBookingFlowEntry.types.ts";
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

function createTestState(category: BookingFlowCategory | null): BookingFlowState {
  return {
    currentStep: "customer-details",
    category,
    selectedServiceId: "svc-1",
    selectedDate: "2026-12-01",
    selectedTime: null,
    customerDetails: {
      name: "Jane",
      phone: "01012341234",
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

function createEmissionInput(
  overrides: Partial<HomeBookingDraftReadyEmissionInput> = {},
): HomeBookingDraftReadyEmissionInput {
  return {
    timingInput: {
      resolvedMode: "skeleton",
      enableSkeletonMode: true,
      currentStep: "customer-details",
      selectedServiceId: "svc-1",
      selectedDate: "2026-12-01",
      customerName: "Jane",
      customerContact: "01012341234",
      previousEmittedSignature: null,
    },
    draftInput: {
      state: createTestState("hair"),
      storeContext: { storeId: "store-1" },
      primaryServiceName: "Cut",
    },
    ...overrides,
  };
}

await run("final emission is false in legacy mode and payload is null", () => {
  const result = resolveHomeBookingDraftReadyEmission(
    createEmissionInput({
      timingInput: {
        ...createEmissionInput().timingInput,
        resolvedMode: "legacy",
      },
    }),
  );

  assert.equal(result.shouldEmit, false);
  assert.equal(result.reason, "mode-not-skeleton");
  assert.equal(result.payload, null);
});

await run("final emission is false when skeleton mode is disabled", () => {
  const base = createEmissionInput();
  const result = resolveHomeBookingDraftReadyEmission({
    ...base,
    timingInput: {
      ...base.timingInput,
      enableSkeletonMode: false,
    },
  });

  assert.equal(result.shouldEmit, false);
  assert.equal(result.reason, "skeleton-disabled");
  assert.equal(result.payload, null);
});

await run("final emission is false on step2 even when payload could be built", () => {
  const base = createEmissionInput();
  const result = resolveHomeBookingDraftReadyEmission({
    ...base,
    timingInput: {
      ...base.timingInput,
      currentStep: "date-time-selection",
    },
  });

  assert.equal(result.shouldEmit, false);
  assert.equal(result.reason, "step-not-eligible");
  assert.equal(result.payload, null);
});

await run("final emission is true on step3 complete with payload", () => {
  const result = resolveHomeBookingDraftReadyEmission(createEmissionInput());

  assert.equal(result.shouldEmit, true);
  assert.equal(result.reason, "ready");
  assert.notEqual(result.signature, null);
  assert.notEqual(result.payload, null);
});

await run("storeId missing still emits with unresolved payload when timing is ready", () => {
  const base = createEmissionInput();
  const result = resolveHomeBookingDraftReadyEmission({
    ...base,
    draftInput: {
      ...base.draftInput!,
      storeContext: {},
    },
  });

  assert.equal(result.shouldEmit, true);
  assert.equal(result.reason, "ready");
  assert.notEqual(result.payload, null);
  assert.equal(result.payload?.store.storeId, null);
  assert.equal(result.payload?.unresolved.missingStoreId, true);
});

await run("duplicate signature suppresses final emission", () => {
  const base = createEmissionInput();
  const signature = [
    base.timingInput.currentStep,
    base.timingInput.selectedServiceId,
    base.timingInput.selectedDate,
    base.timingInput.customerName.trim(),
    base.timingInput.customerContact.trim(),
  ].join("|");

  const result = resolveHomeBookingDraftReadyEmission({
    ...base,
    timingInput: {
      ...base.timingInput,
      previousEmittedSignature: signature,
    },
  });

  assert.equal(result.shouldEmit, false);
  assert.equal(result.reason, "duplicate-state");
  assert.equal(result.payload, null);
});

await run("payload-unavailable edge case blocks final emission when timing is ready", () => {
  const base = createEmissionInput();
  const result = resolveHomeBookingDraftReadyEmission({
    ...base,
    draftInput: {
      ...base.draftInput!,
      state: createTestState(null),
    },
  });

  assert.equal(result.shouldEmit, false);
  assert.equal(result.reason, "payload-unavailable");
  assert.equal(result.payload, null);
});
