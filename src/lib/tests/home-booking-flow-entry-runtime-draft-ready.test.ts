import assert from "node:assert/strict";

import { resolveHomeBookingDraftReadySequence } from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";
import type {
  HomeBookingDraftReadySequenceSnapshot,
} from "../../app/components/home/HomeBookingFlowEntry.types.ts";
import type {
  BookingFlowCategory,
  BookingFlowState,
} from "../bookings/bookingFlowSkeleton/types.ts";
import type { LegacyBookingDraftFromSkeleton } from "../bookings/bookingFlowSkeleton/bridge.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createBaseState(category: BookingFlowCategory): BookingFlowState {
  return {
    currentStep: "service-selection",
    category,
    selectedServiceId: null,
    selectedDate: null,
    selectedTime: null,
    customerDetails: {
      name: "",
      phone: "",
      requestNote: "Natural curl style",
      profileSource: "none",
      profileSnapshot: null,
      currentStateImages: [
        {
          id: "current-1",
          kind: "current-state",
          fileName: "current-lash.jpg",
          fileSize: 1001,
          mimeType: "image/jpeg",
        },
      ],
      desiredStyleImages: [
        {
          id: "desired-1",
          kind: "desired-style",
          fileName: "desired-lash.jpg",
          fileSize: 2002,
          mimeType: "image/jpeg",
        },
      ],
    },
    confirmation: {
      bookingConfirmed: false,
      privacyConsent: false,
    },
  };
}

await run("runtime wiring: emits once at first complete step3, suppresses duplicates, and keeps store-context payload policy", () => {
  const emittedPayloads: LegacyBookingDraftFromSkeleton[] = [];
  let snapshot: HomeBookingDraftReadySequenceSnapshot = { lastEmittedSignature: null };

  const storeContext = {
    storeId: "store-lash-77",
    storeName: "Lash Atelier",
    region: "Seoul",
  };

  const evaluateRuntimeLikeTransition = (state: BookingFlowState) => {
    const result = resolveHomeBookingDraftReadySequence({
      previousSnapshot: snapshot,
      timingInput: {
        resolvedMode: "skeleton",
        enableSkeletonMode: true,
        currentStep: state.currentStep,
        selectedServiceId: state.selectedServiceId,
        selectedDate: state.selectedDate,
        customerName: state.customerDetails.name,
        customerContact: state.customerDetails.phone,
        previousEmittedSignature: snapshot.lastEmittedSignature,
      },
      draftInput: {
        state,
        storeContext,
        agreements: state.confirmation,
      },
    });

    snapshot = result.nextSnapshot;
    if (result.shouldEmit && result.payload) {
      emittedPayloads.push(result.payload);
    }

    return result;
  };

  const step1State = createBaseState("eyelash");
  const step1 = evaluateRuntimeLikeTransition(step1State);
  assert.equal(step1.shouldEmit, false, "step1 should not emit");

  const step2State: BookingFlowState = {
    ...step1State,
    currentStep: "date-time-selection",
    selectedServiceId: "lash-extension",
    selectedDate: "2026-12-24",
  };
  const step2 = evaluateRuntimeLikeTransition(step2State);
  assert.equal(step2.shouldEmit, false, "step2 should not emit");

  const step3CompleteState: BookingFlowState = {
    ...step2State,
    currentStep: "customer-details",
    customerDetails: {
      ...step2State.customerDetails,
      name: "Ari",
      phone: "01012345678",
    },
  };
  const firstStep3 = evaluateRuntimeLikeTransition(step3CompleteState);
  assert.equal(firstStep3.shouldEmit, true, "first complete step3 should emit once");
  assert.equal(emittedPayloads.length, 1, "emit callback should be called exactly once at first step3 completion");

  const duplicateStep3 = evaluateRuntimeLikeTransition(step3CompleteState);
  assert.equal(duplicateStep3.shouldEmit, false, "same complete step3 should be suppressed as duplicate");
  assert.equal(duplicateStep3.reason, "duplicate-state");
  assert.equal(emittedPayloads.length, 1, "duplicate state should not increase emit callback count");

  const payload = emittedPayloads[0]!;
  assert.deepStrictEqual(
    {
      category: payload.category,
      schedule: payload.schedule,
      store: payload.store,
      customer: payload.customer,
      flattenedSources: payload.images.flattened.map((item) => item.sourceGroup),
      unresolved: payload.unresolved,
    },
    {
      category: {
        newCategory: "eyelash",
        legacyCategory: "lash",
      },
      schedule: {
        bookingDate: "2026-12-24",
        bookingTime: "10:00",
        usesPlaceholderTime: true,
        strategy: "fixed-placeholder",
        unresolvedReason: null,
      },
      store: {
        storeId: "store-lash-77",
        storeName: "Lash Atelier",
        region: "Seoul",
      },
      customer: {
        name: "Ari",
        phone: "01012345678",
        request: "Natural curl style",
      },
      flattenedSources: ["currentStateImages", "desiredStyleImages"],
      unresolved: {
        missingStoreId: false,
        missingBookingDate: false,
        bookingTimeIsPlaceholder: true,
      },
    },
  );
});

await run("runtime wiring: step4 transition without signature changes does not emit again after first step3 emit", () => {
  const emittedPayloads: LegacyBookingDraftFromSkeleton[] = [];
  let snapshot: HomeBookingDraftReadySequenceSnapshot = { lastEmittedSignature: null };

  const storeContext = {
    storeId: "store-lash-99",
    storeName: "Lash Preview",
    region: "Busan",
  };

  const evaluateRuntimeLikeTransition = (state: BookingFlowState) => {
    const result = resolveHomeBookingDraftReadySequence({
      previousSnapshot: snapshot,
      timingInput: {
        resolvedMode: "skeleton",
        enableSkeletonMode: true,
        currentStep: state.currentStep,
        selectedServiceId: state.selectedServiceId,
        selectedDate: state.selectedDate,
        customerName: state.customerDetails.name,
        customerContact: state.customerDetails.phone,
        previousEmittedSignature: snapshot.lastEmittedSignature,
      },
      draftInput: {
        state,
        storeContext,
        agreements: state.confirmation,
      },
    });

    snapshot = result.nextSnapshot;
    if (result.shouldEmit && result.payload) {
      emittedPayloads.push(result.payload);
    }

    return result;
  };

  const step3CompleteState: BookingFlowState = {
    ...createBaseState("eyelash"),
    currentStep: "customer-details",
    selectedServiceId: "lash-extension",
    selectedDate: "2026-12-31",
    customerDetails: {
      ...createBaseState("eyelash").customerDetails,
      name: "Nora",
      phone: "01077778888",
    },
  };

  const step3Result = evaluateRuntimeLikeTransition(step3CompleteState);
  assert.equal(step3Result.shouldEmit, true, "first complete step3 should emit");
  assert.equal(emittedPayloads.length, 1, "emit count should be 1 right after first step3 emit");

  const firstPayload = emittedPayloads[0]!;
  assert.deepStrictEqual(
    {
      category: firstPayload.category,
      schedule: firstPayload.schedule,
      store: firstPayload.store,
    },
    {
      category: { newCategory: "eyelash", legacyCategory: "lash" },
      schedule: {
        bookingDate: "2026-12-31",
        bookingTime: "10:00",
        usesPlaceholderTime: true,
        strategy: "fixed-placeholder",
        unresolvedReason: null,
      },
      store: {
        storeId: "store-lash-99",
        storeName: "Lash Preview",
        region: "Busan",
      },
    },
  );

  const step4SameValuesState: BookingFlowState = {
    ...step3CompleteState,
    currentStep: "confirmation",
  };

  const step4Result = evaluateRuntimeLikeTransition(step4SameValuesState);
  assert.equal(step4Result.shouldEmit, false, "step4 transition without value changes should not emit");
  assert.equal(step4Result.reason, "duplicate-state");
  assert.equal(emittedPayloads.length, 1, "emit count should stay 1 after no-change step4 transition");
  assert.equal(step4Result.payload, null, "suppressed step4 transition should not push a second payload");
});

await run("runtime wiring: step4 -> step3 edit -> step4 re-entry emits once more with updated signature payload", () => {
  const emittedPayloads: LegacyBookingDraftFromSkeleton[] = [];
  let snapshot: HomeBookingDraftReadySequenceSnapshot = { lastEmittedSignature: null };

  const storeContext = {
    storeId: "store-lash-101",
    storeName: "Lash Re-emit Lab",
    region: "Seoul",
  };

  const evaluateRuntimeLikeTransition = (state: BookingFlowState) => {
    const result = resolveHomeBookingDraftReadySequence({
      previousSnapshot: snapshot,
      timingInput: {
        resolvedMode: "skeleton",
        enableSkeletonMode: true,
        currentStep: state.currentStep,
        selectedServiceId: state.selectedServiceId,
        selectedDate: state.selectedDate,
        customerName: state.customerDetails.name,
        customerContact: state.customerDetails.phone,
        previousEmittedSignature: snapshot.lastEmittedSignature,
      },
      draftInput: {
        state,
        storeContext,
        agreements: state.confirmation,
      },
    });

    snapshot = result.nextSnapshot;
    if (result.shouldEmit && result.payload) {
      emittedPayloads.push(result.payload);
    }

    return result;
  };

  const step3Initial: BookingFlowState = {
    ...createBaseState("eyelash"),
    currentStep: "customer-details",
    selectedServiceId: "lash-refill",
    selectedDate: "2027-01-10",
    customerDetails: {
      ...createBaseState("eyelash").customerDetails,
      name: "Rin",
      phone: "01011112222",
    },
  };

  const firstStep3 = evaluateRuntimeLikeTransition(step3Initial);
  assert.equal(firstStep3.shouldEmit, true, "first complete step3 should emit");
  assert.equal(emittedPayloads.length, 1, "first emit count should be 1");
  assert.equal(emittedPayloads[0]?.customer.phone, "01011112222");

  const step4NoChange: BookingFlowState = {
    ...step3Initial,
    currentStep: "confirmation",
  };
  const noChangeStep4 = evaluateRuntimeLikeTransition(step4NoChange);
  assert.equal(noChangeStep4.shouldEmit, false, "step4 no-change transition should stay suppressed");
  assert.equal(noChangeStep4.reason, "duplicate-state");
  assert.equal(emittedPayloads.length, 1, "no-change step4 transition should keep emit count at 1");

  const step3Edited: BookingFlowState = {
    ...step3Initial,
    currentStep: "customer-details",
    customerDetails: {
      ...step3Initial.customerDetails,
      phone: "01099990000",
    },
  };

  const editedStep3 = evaluateRuntimeLikeTransition(step3Edited);
  assert.equal(editedStep3.shouldEmit, true, "edited step3 should emit again due to changed signature");
  assert.equal(emittedPayloads.length, 2, "edited step3 should produce second emit");

  const step4AfterEdit: BookingFlowState = {
    ...step3Edited,
    currentStep: "confirmation",
  };
  const step4ReEntry = evaluateRuntimeLikeTransition(step4AfterEdit);
  assert.equal(step4ReEntry.shouldEmit, false, "step4 re-entry with unchanged edited values should not emit third time");
  assert.equal(step4ReEntry.reason, "duplicate-state");
  assert.equal(emittedPayloads.length, 2, "step4 re-entry should keep total emit count at 2");

  const firstPayload = emittedPayloads[0]!;
  const secondPayload = emittedPayloads[1]!;
  assert.equal(firstPayload.customer.phone, "01011112222");
  assert.equal(secondPayload.customer.phone, "01099990000");
  assert.notEqual(firstPayload.customer.phone, secondPayload.customer.phone);
  assert.equal(secondPayload.category.legacyCategory, "lash");
  assert.equal(secondPayload.schedule.bookingTime, "10:00");
  assert.equal(secondPayload.store.storeId, "store-lash-101");
});
