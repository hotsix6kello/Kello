import assert from "node:assert/strict";

import { buildLegacySubmitPayloadCandidate } from "../bookings/bookingFlowSkeleton/submitAdapter.ts";
import { resolveLegacySubmitInvocationPlan } from "../bookings/bookingFlowSkeleton/submitInvocation.ts";
import { resolveLegacySubmitOrchestration } from "../bookings/bookingFlowSkeleton/submitOrchestrator.ts";
import {
  LEGACY_SUBMIT_ADAPTER_BLOCKERS,
  type LegacySubmitPayloadCandidateResult,
} from "../bookings/bookingFlowSkeleton/submitAdapter.ts";
import type { LegacySubmitInvocationPlan } from "../bookings/bookingFlowSkeleton/submitInvocation.ts";
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
      serviceTermsAgreed: true,
      privacyPolicyAgreed: true,
      thirdPartySharingAgreed: true,
      marketingConsentAgreed: false,
      source: "explicit-input",
    },
    unresolved: {
      missingStoreId: false,
      missingBookingDate: false,
      bookingTimeIsPlaceholder: false,
    },
  };
}

await run("submit orchestrator: ready invocation plan resolves to ready-to-submit", () => {
  const adapterResult = buildLegacySubmitPayloadCandidate({ draft: createReadyDraft() });
  const invocationPlan = resolveLegacySubmitInvocationPlan(adapterResult);
  const orchestration = resolveLegacySubmitOrchestration(invocationPlan);

  assert.equal(orchestration.status, "ready-to-submit");
  assert.equal(orchestration.shouldAttemptSubmit, true);
  assert.equal(orchestration.nextAction, "submit-ready");
  assert.equal(orchestration.reason, "ready");
  assert.deepStrictEqual(orchestration.displayBlockers, []);
  assert.notEqual(orchestration.payloadCandidate, null);
});

await run("submit orchestrator: blocked invocation plan resolves to show-blockers", () => {
  const draft = createReadyDraft();
  draft.store.storeId = null;
  draft.unresolved.missingStoreId = true;

  const adapterResult = buildLegacySubmitPayloadCandidate({ draft });
  const invocationPlan = resolveLegacySubmitInvocationPlan(adapterResult);
  const orchestration = resolveLegacySubmitOrchestration(invocationPlan);

  assert.equal(orchestration.status, "blocked");
  assert.equal(orchestration.shouldAttemptSubmit, false);
  assert.equal(orchestration.nextAction, "show-blockers");
  assert.equal(orchestration.reason, "blocked");
  assert.ok(orchestration.displayBlockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId));
});

await run("submit orchestrator: missing payload candidate plan resolves to invalid-plan", () => {
  const forgedInvocationPlan: LegacySubmitInvocationPlan = {
    canInvokeSubmit: false,
    reason: "missing-payload-candidate",
    blockers: [],
    payloadCandidate: null,
  };

  const orchestration = resolveLegacySubmitOrchestration(forgedInvocationPlan);

  assert.equal(orchestration.status, "invalid-plan");
  assert.equal(orchestration.shouldAttemptSubmit, false);
  assert.equal(orchestration.nextAction, "none");
  assert.equal(orchestration.reason, "missing-payload-candidate");
  assert.equal(orchestration.payloadCandidate, null);
});

await run("submit orchestrator: multiple blockers are preserved for display", () => {
  const adapterReadyResult = buildLegacySubmitPayloadCandidate({ draft: createReadyDraft() });
  const blockedResult: LegacySubmitPayloadCandidateResult = {
    status: "blocked",
    ready: false,
    blockers: [
      LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId,
      LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingConfirmedRequired,
    ],
    payloadCandidate: adapterReadyResult.payloadCandidate,
  };

  const invocationPlan = resolveLegacySubmitInvocationPlan(blockedResult);
  const orchestration = resolveLegacySubmitOrchestration(invocationPlan);

  assert.equal(orchestration.status, "blocked");
  assert.equal(orchestration.nextAction, "show-blockers");
  assert.deepStrictEqual(orchestration.displayBlockers, [
    LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId,
    LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingConfirmedRequired,
  ]);
});

await run("submit orchestrator: ready payload candidate is passed through unchanged", () => {
  const adapterResult = buildLegacySubmitPayloadCandidate({ draft: createReadyDraft() });
  const invocationPlan = resolveLegacySubmitInvocationPlan(adapterResult);
  const orchestration = resolveLegacySubmitOrchestration(invocationPlan);

  assert.deepStrictEqual(
    {
      category: orchestration.payloadCandidate?.category,
      beautyCategory: orchestration.payloadCandidate?.beautyCategory,
      storeId: orchestration.payloadCandidate?.storeId,
      bookingDate: orchestration.payloadCandidate?.bookingDate,
      bookingTime: orchestration.payloadCandidate?.bookingTime,
      customerPhone: orchestration.payloadCandidate?.customer.phone,
      flow: orchestration.payloadCandidate?.createdFrom.flow,
    },
    {
      category: "beauty",
      beautyCategory: "hair",
      storeId: "store-hair-1",
      bookingDate: "2026-12-12",
      bookingTime: "14:30",
      customerPhone: "01012345678",
      flow: "beauty-explore",
    },
  );
});



