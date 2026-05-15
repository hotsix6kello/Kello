import assert from "node:assert/strict";

import {
  buildLegacySubmitPayloadCandidate,
  canSubmitLegacyBookingDraft,
  LEGACY_SUBMIT_ADAPTER_BLOCKERS,
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

await run("submit adapter: complete draft is ready and yields payload candidate with core fields", () => {
  const draft = createReadyDraft();

  const readiness = canSubmitLegacyBookingDraft({ draft });
  assert.equal(readiness.ready, true);
  assert.equal(readiness.status, "ready");
  assert.deepStrictEqual(readiness.blockers, []);

  const candidate = buildLegacySubmitPayloadCandidate({ draft });
  assert.equal(candidate.ready, true);
  assert.equal(candidate.status, "ready");
  assert.deepStrictEqual(candidate.blockers, []);
  assert.notEqual(candidate.payloadCandidate, null);

  assert.deepStrictEqual(
    {
      category: candidate.payloadCandidate?.category,
      beautyCategory: candidate.payloadCandidate?.beautyCategory,
      storeId: candidate.payloadCandidate?.storeId,
      bookingDate: candidate.payloadCandidate?.bookingDate,
      bookingTime: candidate.payloadCandidate?.bookingTime,
      primaryServiceId: candidate.payloadCandidate?.primaryServiceId,
      customer: candidate.payloadCandidate?.customer,
      agreements: candidate.payloadCandidate?.agreements,
      createdFrom: candidate.payloadCandidate?.createdFrom,
    },
    {
      category: "beauty",
      beautyCategory: "hair",
      storeId: "store-hair-1",
      bookingDate: "2026-12-12",
      bookingTime: "14:30",
      primaryServiceId: "hair-cut",
      customer: {
        name: "Mina",
        phone: "01012345678",
        request: "Natural volume",
        imageUrls: [],
      },
      agreements: {
        serviceTermsAgreed: true,
        privacyPolicyAgreed: true,
        thirdPartySharingAgreed: true,
        marketingConsentAgreed: false,
        refundPolicyAgreed: false,
        refundPolicyAgreedAt: null,
      },
      createdFrom: {
        flow: "beauty-explore",
      },
    },
  );
});

await run("submit adapter: missing store fields are blocked and payload candidate is null", () => {
  const draft = createReadyDraft();
  draft.store.storeId = null;
  draft.store.storeName = null;
  draft.store.region = null;
  draft.unresolved.missingStoreId = true;

  const result = buildLegacySubmitPayloadCandidate({ draft });
  assert.equal(result.ready, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.payloadCandidate, null);
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId));
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreName));
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingRegion));
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.payloadEssentialFieldMissing));
});

await run("submit adapter: placeholder booking time remains submittable in the current MVP flow", () => {
  const draft = createReadyDraft();
  draft.schedule.bookingTime = "10:00";
  draft.schedule.usesPlaceholderTime = true;
  draft.unresolved.bookingTimeIsPlaceholder = true;

  const result = buildLegacySubmitPayloadCandidate({ draft });
  assert.equal(result.ready, true);
  assert.equal(result.status, "ready");
  assert.equal(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingTimePlaceholder), false);
  assert.notEqual(result.payloadCandidate, null);
});

await run("submit adapter: missing agreements are blocked", () => {
  const draft = createReadyDraft();
  draft.agreements.serviceTermsAgreed = false;
  draft.agreements.privacyPolicyAgreed = false;
  draft.agreements.thirdPartySharingAgreed = false;

  const result = buildLegacySubmitPayloadCandidate({ draft });
  assert.equal(result.ready, false);
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingConfirmedRequired));
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.privacyConsentRequired));
});

await run("submit adapter: uploaded image url mismatch does not block because uploads happen at submit time", () => {
  const draft = createReadyDraft();
  draft.images.flattened = [
    {
      id: "current-1",
      sourceGroup: "currentStateImages",
      sourceKind: "current-state",
      fileName: "current.jpg",
      fileSize: 1200,
      mimeType: "image/jpeg",
      flatIndex: 0,
      groupIndex: 0,
    },
    {
      id: "desired-1",
      sourceGroup: "desiredStyleImages",
      sourceKind: "desired-style",
      fileName: "desired.jpg",
      fileSize: 1300,
      mimeType: "image/jpeg",
      flatIndex: 1,
      groupIndex: 0,
    },
  ];
  draft.images.currentStateCount = 1;
  draft.images.desiredStyleCount = 1;
  draft.images.totalCount = 2;

  const result = buildLegacySubmitPayloadCandidate({
    draft,
    uploadedImageUrls: ["https://cdn.example.com/current.jpg"],
  });

  assert.equal(result.ready, true);
  assert.equal(result.status, "ready");
  assert.equal(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls), false);
  assert.notEqual(result.payloadCandidate, null);
});

await run("submit adapter: essential text missing is blocked with corresponding blockers", () => {
  const draft = createReadyDraft();
  draft.service.primaryServiceId = null;
  draft.customer.phone = "";

  const result = buildLegacySubmitPayloadCandidate({ draft });
  assert.equal(result.ready, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.payloadCandidate, null);
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingPrimaryServiceId));
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingCustomerPhone));
  assert.ok(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.payloadEssentialFieldMissing));
});



