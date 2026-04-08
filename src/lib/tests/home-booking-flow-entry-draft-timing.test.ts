import assert from "node:assert/strict";

import { resolveHomeBookingDraftReadyTiming } from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";
import type { HomeBookingDraftReadyTimingInput } from "../../app/components/home/HomeBookingFlowEntry.types.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createTimingInput(
  overrides: Partial<HomeBookingDraftReadyTimingInput> = {},
): HomeBookingDraftReadyTimingInput {
  return {
    resolvedMode: "skeleton",
    enableSkeletonMode: true,
    currentStep: "customer-details",
    selectedServiceId: "hair-cut",
    selectedDate: "2026-05-20",
    customerName: "Jane",
    customerContact: "010-1234-5678",
    previousEmittedSignature: null,
    ...overrides,
  };
}

await run("legacy mode is never eligible for draft-ready emit", () => {
  const result = resolveHomeBookingDraftReadyTiming(
    createTimingInput({ resolvedMode: "legacy" }),
  );

  assert.equal(result.isReadyToEmit, false);
  assert.equal(result.shouldEmit, false);
  assert.equal(result.reason, "mode-not-skeleton");
});

await run("skeleton disabled is never eligible for draft-ready emit", () => {
  const result = resolveHomeBookingDraftReadyTiming(
    createTimingInput({ resolvedMode: "skeleton", enableSkeletonMode: false }),
  );

  assert.equal(result.isReadyToEmit, false);
  assert.equal(result.shouldEmit, false);
  assert.equal(result.reason, "skeleton-disabled");
});

await run("step1 does not emit even when skeleton mode is enabled", () => {
  const result = resolveHomeBookingDraftReadyTiming(
    createTimingInput({ currentStep: "service-selection" }),
  );

  assert.equal(result.isReadyToEmit, false);
  assert.equal(result.shouldEmit, false);
  assert.equal(result.reason, "step-not-eligible");
});

await run("step2 does not emit even with service and date selected", () => {
  const result = resolveHomeBookingDraftReadyTiming(
    createTimingInput({
      currentStep: "date-time-selection",
      selectedServiceId: "nail-gel",
      selectedDate: "2026-06-02",
    }),
  );

  assert.equal(result.isReadyToEmit, false);
  assert.equal(result.shouldEmit, false);
  assert.equal(result.reason, "step-not-eligible");
});

await run("step3 emits when service, date, name, and contact are all present", () => {
  const result = resolveHomeBookingDraftReadyTiming(
    createTimingInput({
      currentStep: "customer-details",
      selectedServiceId: "lash-extension",
      selectedDate: "2026-07-10",
      customerName: "Mina",
      customerContact: "01022223333",
    }),
  );

  assert.equal(result.isReadyToEmit, true);
  assert.equal(result.shouldEmit, true);
  assert.equal(result.reason, "ready");
  assert.notEqual(result.signature, null);
});

await run("step3 with missing contact does not emit", () => {
  const result = resolveHomeBookingDraftReadyTiming(
    createTimingInput({
      currentStep: "customer-details",
      customerContact: "   ",
    }),
  );

  assert.equal(result.isReadyToEmit, false);
  assert.equal(result.shouldEmit, false);
  assert.equal(result.reason, "missing-required-fields");
});

await run("step4 remains eligible and can emit", () => {
  const result = resolveHomeBookingDraftReadyTiming(
    createTimingInput({
      currentStep: "confirmation",
      selectedServiceId: "aesthetic-lifting",
      selectedDate: "2026-08-14",
      customerName: "Sara",
      customerContact: "+821055556666",
    }),
  );

  assert.equal(result.isReadyToEmit, true);
  assert.equal(result.shouldEmit, true);
  assert.equal(result.reason, "ready");
});

await run("same signature is treated as a duplicate and suppressed", () => {
  const first = resolveHomeBookingDraftReadyTiming(createTimingInput());
  assert.equal(first.shouldEmit, true);
  assert.notEqual(first.signature, null);

  const duplicate = resolveHomeBookingDraftReadyTiming(
    createTimingInput({ previousEmittedSignature: first.signature }),
  );

  assert.equal(duplicate.isReadyToEmit, true);
  assert.equal(duplicate.shouldEmit, false);
  assert.equal(duplicate.reason, "duplicate-state");
});
