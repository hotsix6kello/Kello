import assert from "node:assert/strict";

import {
  buildLegacySubmitPayloadCandidate,
  LEGACY_SUBMIT_ADAPTER_BLOCKERS,
  type LegacySubmitPayloadCandidateResult,
} from "../bookings/bookingFlowSkeleton/submitAdapter.ts";
import { resolveLegacySubmitInvocationPlan } from "../bookings/bookingFlowSkeleton/submitInvocation.ts";
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

await run("submit invocation: ready adapter result allows submit invocation", () => {
  const adapterResult = buildLegacySubmitPayloadCandidate({
    draft: createReadyDraft(),
  });

  const plan = resolveLegacySubmitInvocationPlan(adapterResult);

  assert.equal(plan.canInvokeSubmit, true);
  assert.equal(plan.reason, "ready");
  assert.deepStrictEqual(plan.blockers, []);
  assert.notEqual(plan.payloadCandidate, null);
  assert.equal(plan.payloadCandidate?.storeId, "store-hair-1");
});

await run("submit invocation: blocked adapter result denies invocation and keeps blockers", () => {
  const draft = createReadyDraft();
  draft.store.storeId = null;
  draft.unresolved.missingStoreId = true;

  const adapterResult = buildLegacySubmitPayloadCandidate({
    draft,
  });

  const plan = resolveLegacySubmitInvocationPlan(adapterResult);

  assert.equal(plan.canInvokeSubmit, false);
  assert.equal(plan.reason, "blocked");
  assert.ok(plan.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId));
});

await run("submit invocation: ready status with null payload is denied as missing payload candidate", () => {
  const forgedResult: LegacySubmitPayloadCandidateResult = {
    status: "ready",
    ready: true,
    blockers: [],
    payloadCandidate: null,
  };

  const plan = resolveLegacySubmitInvocationPlan(forgedResult);

  assert.equal(plan.canInvokeSubmit, false);
  assert.equal(plan.reason, "missing-payload-candidate");
  assert.deepStrictEqual(plan.blockers, []);
  assert.equal(plan.payloadCandidate, null);
});

await run("submit invocation: multiple blockers are passed through unchanged", () => {
  const adapterReadyResult = buildLegacySubmitPayloadCandidate({
    draft: createReadyDraft(),
  });

  const blockedWithPayload: LegacySubmitPayloadCandidateResult = {
    status: "blocked",
    ready: false,
    blockers: [
      LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId,
      LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingConfirmedRequired,
    ],
    payloadCandidate: adapterReadyResult.payloadCandidate,
  };

  const plan = resolveLegacySubmitInvocationPlan(blockedWithPayload);

  assert.equal(plan.canInvokeSubmit, false);
  assert.equal(plan.reason, "blocked");
  assert.deepStrictEqual(plan.blockers, [
    LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId,
    LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingConfirmedRequired,
  ]);
  assert.notEqual(plan.payloadCandidate, null);
});

await run("submit invocation: uploaded image url mismatch stays invocable because uploads happen during submit intent", () => {
  const draft = createReadyDraft();
  draft.images.flattened = [
    {
      id: "current-1",
      sourceGroup: "currentStateImages",
      sourceKind: "current-state",
      fileName: "current.jpg",
      fileSize: 1000,
      mimeType: "image/jpeg",
      flatIndex: 0,
      groupIndex: 0,
    },
    {
      id: "desired-1",
      sourceGroup: "desiredStyleImages",
      sourceKind: "desired-style",
      fileName: "desired.jpg",
      fileSize: 1100,
      mimeType: "image/jpeg",
      flatIndex: 1,
      groupIndex: 0,
    },
  ];
  draft.images.currentStateCount = 1;
  draft.images.desiredStyleCount = 1;
  draft.images.totalCount = 2;

  const adapterResult = buildLegacySubmitPayloadCandidate({
    draft,
    uploadedImageUrls: ["https://cdn.example.com/only-one.jpg"],
  });
  const plan = resolveLegacySubmitInvocationPlan(adapterResult);

  assert.equal(plan.canInvokeSubmit, true);
  assert.equal(plan.reason, "ready");
  assert.equal(plan.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls), false);
});



