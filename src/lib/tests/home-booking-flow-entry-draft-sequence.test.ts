import assert from "node:assert/strict";

import { resolveHomeBookingDraftReadySequence } from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";
import type {
  HomeBookingDraftReadySequenceInput,
  HomeBookingDraftReadySequenceSnapshot,
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

function createState(category: BookingFlowCategory): BookingFlowState {
  return {
    currentStep: "customer-details",
    category,
    selectedServiceId: "svc-1",
    selectedDate: "2026-12-10",
    selectedTime: null,
    customerDetails: {
      name: "Jane",
      phone: "01012341234",
      requestNote: "Natural look",
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

function createSequenceInput(
  overrides: Partial<HomeBookingDraftReadySequenceInput> = {},
): HomeBookingDraftReadySequenceInput {
  const state = createState("hair");

  return {
    previousSnapshot: { lastEmittedSignature: null },
    timingInput: {
      resolvedMode: "skeleton",
      enableSkeletonMode: true,
      currentStep: state.currentStep,
      selectedServiceId: state.selectedServiceId,
      selectedDate: state.selectedDate,
      customerName: state.customerDetails.name,
      customerContact: state.customerDetails.phone,
      previousEmittedSignature: null,
    },
    draftInput: {
      state,
      storeContext: { storeId: "store-1" },
      primaryServiceName: "Cut",
    },
    ...overrides,
  };
}

function evalStep(
  previousSnapshot: HomeBookingDraftReadySequenceSnapshot | null,
  step: HomeBookingDraftReadySequenceInput,
) {
  return resolveHomeBookingDraftReadySequence({
    ...step,
    previousSnapshot,
  });
}

await run("sequence 1: step1 -> step2 -> incomplete step3 -> complete step3 emits only at the last transition", () => {
  let snapshot: HomeBookingDraftReadySequenceSnapshot | null = { lastEmittedSignature: null };

  const step1 = evalStep(snapshot, createSequenceInput({
    timingInput: {
      ...createSequenceInput().timingInput,
      currentStep: "service-selection",
    },
  }));
  assert.equal(step1.shouldEmit, false);
  snapshot = step1.nextSnapshot;

  const step2 = evalStep(snapshot, createSequenceInput({
    timingInput: {
      ...createSequenceInput().timingInput,
      currentStep: "date-time-selection",
    },
  }));
  assert.equal(step2.shouldEmit, false);
  snapshot = step2.nextSnapshot;

  const incompleteStep3 = evalStep(snapshot, createSequenceInput({
    timingInput: {
      ...createSequenceInput().timingInput,
      currentStep: "customer-details",
      customerContact: "",
    },
  }));
  assert.equal(incompleteStep3.shouldEmit, false);
  snapshot = incompleteStep3.nextSnapshot;

  const completeStep3 = evalStep(snapshot, createSequenceInput({
    timingInput: {
      ...createSequenceInput().timingInput,
      currentStep: "customer-details",
      customerContact: "01012341234",
    },
  }));
  assert.equal(completeStep3.shouldEmit, true);
  assert.notEqual(completeStep3.payload, null);
});

await run("sequence 2: complete step3 evaluated twice emits only once", () => {
  const first = resolveHomeBookingDraftReadySequence(createSequenceInput());
  assert.equal(first.shouldEmit, true);
  assert.notEqual(first.signature, null);

  const second = resolveHomeBookingDraftReadySequence({
    ...createSequenceInput(),
    previousSnapshot: first.nextSnapshot,
  });

  assert.equal(second.shouldEmit, false);
  assert.equal(second.reason, "duplicate-state");
});

await run("sequence 3: request note change does not re-emit under current signature policy", () => {
  const first = resolveHomeBookingDraftReadySequence(createSequenceInput());
  assert.equal(first.shouldEmit, true);

  const stateWithUpdatedRequest = createState("hair");
  stateWithUpdatedRequest.customerDetails.requestNote = "Please keep the bangs longer";

  const second = resolveHomeBookingDraftReadySequence({
    ...createSequenceInput(),
    previousSnapshot: first.nextSnapshot,
    draftInput: {
      ...createSequenceInput().draftInput!,
      state: stateWithUpdatedRequest,
    },
  });

  assert.equal(second.shouldEmit, false);
  assert.equal(second.reason, "duplicate-state");
});

await run("sequence 4: moving to step4 without signature change stays suppressed as duplicate", () => {
  const first = resolveHomeBookingDraftReadySequence(createSequenceInput());
  assert.equal(first.shouldEmit, true);

  const step4 = resolveHomeBookingDraftReadySequence({
    ...createSequenceInput(),
    previousSnapshot: first.nextSnapshot,
    timingInput: {
      ...createSequenceInput().timingInput,
      currentStep: "confirmation",
    },
    draftInput: {
      ...createSequenceInput().draftInput!,
      state: {
        ...createSequenceInput().draftInput!.state,
        currentStep: "confirmation",
      },
    },
  });

  assert.equal(step4.shouldEmit, false);
  assert.equal(step4.reason, "duplicate-state");
});

await run("sequence 5: selected date change after completion allows re-emit", () => {
  const first = resolveHomeBookingDraftReadySequence(createSequenceInput());
  assert.equal(first.shouldEmit, true);

  const changedDateState = createState("hair");
  changedDateState.selectedDate = "2026-12-11";

  const next = resolveHomeBookingDraftReadySequence({
    ...createSequenceInput(),
    previousSnapshot: first.nextSnapshot,
    timingInput: {
      ...createSequenceInput().timingInput,
      selectedDate: "2026-12-11",
    },
    draftInput: {
      ...createSequenceInput().draftInput!,
      state: changedDateState,
    },
  });

  assert.equal(next.shouldEmit, true);
  assert.notEqual(next.signature, first.signature);
});

await run("sequence 6: category change to eyelash uses legacy lash mapping and allows re-emit", () => {
  const first = resolveHomeBookingDraftReadySequence(createSequenceInput());
  assert.equal(first.shouldEmit, true);

  const changedCategoryState = createState("eyelash");

  const next = resolveHomeBookingDraftReadySequence({
    ...createSequenceInput(),
    previousSnapshot: first.nextSnapshot,
    draftInput: {
      ...createSequenceInput().draftInput!,
      state: changedCategoryState,
    },
  });

  assert.equal(next.shouldEmit, true);
  assert.notEqual(next.payload, null);
  assert.equal(next.payload?.category.legacyCategory, "lash");
  assert.notEqual(next.signature, first.signature);
});



