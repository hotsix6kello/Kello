import assert from "node:assert/strict";

import { runLegacySubmitPreparation } from "../bookings/bookingFlowSkeleton/submitRunner.ts";
import {
  LEGACY_SUBMIT_ADAPTER_BLOCKERS,
  type LegacySubmitPayloadCandidateResult,
} from "../bookings/bookingFlowSkeleton/submitAdapter.ts";
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

await run("submit runner: missing agreements are blocked even when placeholder time is allowed", () => {
  const draft = createReadyDraft();
  draft.schedule.bookingTime = "10:00";
  draft.schedule.usesPlaceholderTime = true;
  draft.unresolved.bookingTimeIsPlaceholder = true;
  draft.agreements.serviceTermsAgreed = false;
  draft.agreements.privacyPolicyAgreed = false;
  draft.agreements.thirdPartySharingAgreed = false;

  const result = runLegacySubmitPreparation({ draft });

  assert.equal(result.canAttemptSubmit, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.uiState.uiState, "show-blockers");
  assert.equal(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingTimePlaceholder), false);
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingConfirmedRequired));
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.privacyConsentRequired));
  assert.notEqual(result.payloadCandidate, null);
});

await run("submit runner: fully ready draft resolves to submit-ready and can attempt submit", () => {
  const draft = createReadyDraft();

  const result = runLegacySubmitPreparation({ draft });

  assert.equal(result.canAttemptSubmit, true);
  assert.equal(result.status, "ready-to-submit");
  assert.equal(result.uiState.uiState, "submit-ready");
  assert.equal(result.invocationPlan.reason, "ready");
  assert.equal(result.orchestrationPlan.status, "ready-to-submit");
  assert.notEqual(result.payloadCandidate, null);
});

await run("submit runner: missing store id is blocked with missing-store-id blocker", () => {
  const draft = createReadyDraft();
  draft.store.storeId = null;
  draft.unresolved.missingStoreId = true;

  const result = runLegacySubmitPreparation({ draft });

  assert.equal(result.canAttemptSubmit, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.uiState.uiState, "show-blockers");
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId));
});

await run("submit runner: uploaded image urls mismatch stays submit-ready because uploads happen during submit intent", () => {
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

  const result = runLegacySubmitPreparation({
    draft,
    uploadedImageUrls: ["https://cdn.example.com/current-only.jpg"],
  });

  assert.equal(result.canAttemptSubmit, true);
  assert.equal(result.status, "ready-to-submit");
  assert.equal(result.uiState.uiState, "submit-ready");
  assert.equal(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls), false);
});

await run("submit runner: invalid payload candidate fallback resolves to invalid-plan", () => {
  const forgedReadyButNullPayload: LegacySubmitPayloadCandidateResult = {
    status: "ready",
    ready: true,
    blockers: [],
    payloadCandidate: null,
  };

  const result = runLegacySubmitPreparation({
    draft: null,
    adapterResultOverride: forgedReadyButNullPayload,
  });

  assert.equal(result.canAttemptSubmit, false);
  assert.equal(result.status, "invalid-plan");
  assert.equal(result.invocationPlan.reason, "missing-payload-candidate");
  assert.equal(result.uiState.uiState, "invalid-plan");
  assert.equal(result.payloadCandidate, null);
});



