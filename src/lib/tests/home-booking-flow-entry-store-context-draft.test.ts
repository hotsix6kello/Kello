import assert from "node:assert/strict";

import {
  buildHomeBookingDraftReadyEvent,
  resolveHomeBookingDraftReadyEmission,
} from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";
import type {
  HomeBookingDraftReadyEmissionInput,
  HomeBookingStoreContext,
} from "../../app/components/home/HomeBookingFlowEntry.types.ts";
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

function createCompleteState(category: BookingFlowCategory): BookingFlowState {
  return {
    currentStep: "customer-details",
    category,
    selectedServiceId: `${category}-service-1`,
    selectedDate: "2026-12-20",
    selectedTime: null,
    customerDetails: {
      name: "Jordan",
      phone: "01012345678",
      requestNote: "Please keep it natural.",
      profileSource: "none",
      profileSnapshot: null,
      currentStateImages: [],
      desiredStyleImages: [],
    },
    confirmation: {
      serviceTermsAgreed: false,
      privacyPolicyAgreed: false,
      thirdPartySharingAgreed: false,
      marketingConsentAgreed: false,
    },
  };
}

function createEmissionInput(params?: {
  storeContext?: Partial<HomeBookingStoreContext>;
  previousEmittedSignature?: string | null;
}): HomeBookingDraftReadyEmissionInput {
  const state = createCompleteState("hair");

  return {
    timingInput: {
      resolvedMode: "skeleton",
      enableSkeletonMode: true,
      currentStep: state.currentStep,
      selectedServiceId: state.selectedServiceId,
      selectedDate: state.selectedDate,
      customerName: state.customerDetails.name,
      customerContact: state.customerDetails.phone,
      previousEmittedSignature: params?.previousEmittedSignature ?? null,
    },
    draftInput: {
      state,
      storeContext: params?.storeContext,
      primaryServiceName: "Hair basic service",
    },
  };
}

await run("storeContext.storeId is reflected into draft candidate in skeleton mode", () => {
  const state = createCompleteState("nail");
  const event = buildHomeBookingDraftReadyEvent({
    mode: "skeleton",
    enableSkeletonMode: true,
    draftInput: {
      state,
      storeContext: { storeId: "store-nail-01" },
    },
  });

  assert.equal(event.shouldEmit, true);
  assert.notEqual(event.payload, null);
  assert.equal(event.payload?.store.storeId, "store-nail-01");
  assert.equal(event.payload?.unresolved.missingStoreId, false);
});

await run("missing storeContext.storeId keeps unresolved.missingStoreId=true", () => {
  const state = createCompleteState("makeup");
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

await run("storeContext storeId/storeName/region are reflected together when all are provided", () => {
  const state = createCompleteState("eyelash");
  const event = buildHomeBookingDraftReadyEvent({
    mode: "skeleton",
    enableSkeletonMode: true,
    draftInput: {
      state,
      storeContext: {
        storeId: "store-lash-03",
        storeName: "Lash Lab",
        region: "Gangnam",
      },
    },
  });

  assert.equal(event.shouldEmit, true);
  assert.notEqual(event.payload, null);
  assert.equal(event.payload?.store.storeId, "store-lash-03");
  assert.equal(event.payload?.store.storeName, "Lash Lab");
  assert.equal(event.payload?.store.region, "Gangnam");
});

await run("legacy mode keeps existing contract and does not emit draft payload", () => {
  const state = createCompleteState("hair");
  const event = buildHomeBookingDraftReadyEvent({
    mode: "legacy",
    enableSkeletonMode: true,
    draftInput: {
      state,
      storeContext: { storeId: "store-legacy-should-not-emit" },
    },
  });

  assert.equal(event.shouldEmit, false);
  assert.equal(event.payload, null);
});

await run("duplicate/no-change suppression still wins even when storeContext.storeId exists", () => {
  const first = resolveHomeBookingDraftReadyEmission(
    createEmissionInput({
      storeContext: { storeId: "store-hair-10" },
      previousEmittedSignature: null,
    }),
  );

  assert.equal(first.shouldEmit, true);
  assert.notEqual(first.signature, null);
  assert.notEqual(first.payload, null);
  assert.equal(first.payload?.store.storeId, "store-hair-10");

  const duplicate = resolveHomeBookingDraftReadyEmission(
    createEmissionInput({
      storeContext: { storeId: "store-hair-10" },
      previousEmittedSignature: first.signature,
    }),
  );

  assert.equal(duplicate.shouldEmit, false);
  assert.equal(duplicate.reason, "duplicate-state");
  assert.equal(duplicate.payload, null);
});



