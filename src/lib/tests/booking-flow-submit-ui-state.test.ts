import assert from "node:assert/strict";

import { buildLegacySubmitPayloadCandidate } from "../bookings/bookingFlowSkeleton/submitAdapter.ts";
import { resolveLegacySubmitInvocationPlan } from "../bookings/bookingFlowSkeleton/submitInvocation.ts";
import { resolveLegacySubmitOrchestration } from "../bookings/bookingFlowSkeleton/submitOrchestrator.ts";
import { resolveLegacySubmitUiState } from "../bookings/bookingFlowSkeleton/submitUiState.ts";
import {
  LEGACY_SUBMIT_ADAPTER_BLOCKERS,
  type LegacySubmitAdapterBlocker,
} from "../bookings/bookingFlowSkeleton/submitAdapter.ts";
import type { LegacySubmitOrchestrationPlan } from "../bookings/bookingFlowSkeleton/submitOrchestrator.ts";
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

function createReadyDraft(): LegacyBookingDraftFromSkeleton {
  return {
    category: {
      newCategory: "hair",
      legacyCategory: "hair",
    },
    store: {
      storeId: "store-hair-1",
      storeName: "Hair Lab",
      region: "Seoul",
    },
    schedule: {
      bookingDate: "2026-12-12",
      bookingTime: "14:30",
      usesPlaceholderTime: false,
      strategy: "fixed-placeholder",
      unresolvedReason: null,
    },
    service: {
      primaryServiceId: "hair-cut",
      primaryServiceName: "Basic Cut",
    },
    customer: {
      name: "Mina",
      phone: "01012345678",
      request: "Natural volume",
    },
    images: {
      flattened: [],
      currentStateCount: 0,
      desiredStyleCount: 0,
      totalCount: 0,
      preserveSourceMetadata: true,
    },
    agreements: {
      bookingConfirmed: true,
      privacyConsent: true,
      source: "explicit-input",
    },
    unresolved: {
      missingStoreId: false,
      missingBookingDate: false,
      bookingTimeIsPlaceholder: false,
    },
  };
}

await run("submit ui-state: ready orchestration becomes submit-ready state", () => {
  const adapterResult = buildLegacySubmitPayloadCandidate({ draft: createReadyDraft() });
  const invocationPlan = resolveLegacySubmitInvocationPlan(adapterResult);
  const orchestrationPlan = resolveLegacySubmitOrchestration(invocationPlan);
  const uiState = resolveLegacySubmitUiState(orchestrationPlan);

  assert.equal(uiState.uiState, "submit-ready");
  assert.equal(uiState.canSubmit, true);
  assert.equal(uiState.primaryMessage, "Submit is ready.");
  assert.deepStrictEqual(uiState.blockers, []);
  assert.equal(uiState.hasPayload, true);
});

await run("submit ui-state: blocked orchestration becomes show-blockers state", () => {
  const draft = createReadyDraft();
  draft.store.storeId = null;
  draft.unresolved.missingStoreId = true;

  const adapterResult = buildLegacySubmitPayloadCandidate({ draft });
  const invocationPlan = resolveLegacySubmitInvocationPlan(adapterResult);
  const orchestrationPlan = resolveLegacySubmitOrchestration(invocationPlan);
  const uiState = resolveLegacySubmitUiState(orchestrationPlan);

  assert.equal(uiState.uiState, "show-blockers");
  assert.equal(uiState.canSubmit, false);
  assert.equal(uiState.primaryMessage, "Resolve blockers before submit.");
  assert.ok(uiState.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId));
});

await run("submit ui-state: invalid-plan orchestration becomes invalid-plan state", () => {
  const invalidPlan: LegacySubmitOrchestrationPlan = {
    status: "invalid-plan",
    shouldAttemptSubmit: false,
    nextAction: "none",
    reason: "missing-payload-candidate",
    displayBlockers: [],
    payloadCandidate: null,
  };

  const uiState = resolveLegacySubmitUiState(invalidPlan);

  assert.equal(uiState.uiState, "invalid-plan");
  assert.equal(uiState.canSubmit, false);
  assert.equal(uiState.primaryMessage, "Submit plan is invalid and cannot be invoked.");
  assert.equal(uiState.hasPayload, false);
  assert.equal(uiState.payloadPreview, null);
});

await run("submit ui-state: multiple blockers are preserved in show-blockers state", () => {
  const blockers: LegacySubmitAdapterBlocker[] = [
    LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId,
    LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingConfirmedRequired,
  ];

  const blockedPlan: LegacySubmitOrchestrationPlan = {
    status: "blocked",
    shouldAttemptSubmit: false,
    nextAction: "show-blockers",
    reason: "blocked",
    displayBlockers: blockers,
    payloadCandidate: null,
  };

  const uiState = resolveLegacySubmitUiState(blockedPlan);

  assert.equal(uiState.uiState, "show-blockers");
  assert.deepStrictEqual(uiState.blockers, blockers);
});

await run("submit ui-state: ready payload preview is passed through for UI usage", () => {
  const adapterResult = buildLegacySubmitPayloadCandidate({ draft: createReadyDraft() });
  const invocationPlan = resolveLegacySubmitInvocationPlan(adapterResult);
  const orchestrationPlan = resolveLegacySubmitOrchestration(invocationPlan);
  const uiState = resolveLegacySubmitUiState(orchestrationPlan);

  assert.deepStrictEqual(
    {
      category: uiState.payloadPreview?.category,
      beautyCategory: uiState.payloadPreview?.beautyCategory,
      storeId: uiState.payloadPreview?.storeId,
      bookingDate: uiState.payloadPreview?.bookingDate,
      bookingTime: uiState.payloadPreview?.bookingTime,
      primaryServiceId: uiState.payloadPreview?.primaryServiceId,
    },
    {
      category: "beauty",
      beautyCategory: "hair",
      storeId: "store-hair-1",
      bookingDate: "2026-12-12",
      bookingTime: "14:30",
      primaryServiceId: "hair-cut",
    },
  );
});
