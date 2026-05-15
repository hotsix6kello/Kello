import assert from "node:assert/strict";

import type { LegacyBookingDraftFromSkeleton } from "../bookings/bookingFlowSkeleton/bridge.ts";
import {
  resolveLegacySubmitImageReadiness,
} from "../bookings/bookingFlowSkeleton/imageSubmitContract.ts";
import {
  buildLegacySubmitPayloadCandidate,
  LEGACY_SUBMIT_ADAPTER_BLOCKERS,
} from "../bookings/bookingFlowSkeleton/submitAdapter.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createDraft(imageCount: number): LegacyBookingDraftFromSkeleton {
  const flattened = Array.from({ length: imageCount }, (_, index) => ({
    id: `img-${index}`,
    sourceGroup: index % 2 === 0 ? ("currentStateImages" as const) : ("desiredStyleImages" as const),
    sourceKind: index % 2 === 0 ? ("current-state" as const) : ("desired-style" as const),
    fileName: `file-${index}.jpg`,
    fileSize: 1000 + index,
    mimeType: "image/jpeg",
    flatIndex: index,
    groupIndex: index,
  }));

  const currentStateCount = Math.ceil(imageCount / 2);
  const desiredStyleCount = Math.floor(imageCount / 2);

  return {
    category: {
      newCategory: "hair",
      legacyCategory: "hair",
    },
    store: {
      storeId: "store-1",
      storeName: "Store",
      region: "Seoul",
    },
    schedule: {
      bookingDate: "2026-12-24",
      bookingTime: "14:00",
      usesPlaceholderTime: false,
      strategy: "fixed-placeholder",
      unresolvedReason: null,
    },
    service: {
      primaryServiceId: "hair-cut",
      primaryServiceName: "Hair cut",
    },
    customer: {
      name: "Mina",
      phone: "01012345678",
      request: "Natural look",
    },
    images: {
      flattened,
      currentStateCount,
      desiredStyleCount,
      totalCount: imageCount,
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

await run("image contract: no selected images keeps upload-unrequired and unblocked", () => {
  const readiness = resolveLegacySubmitImageReadiness({
    draft: createDraft(0),
    uploadedImageUrls: [],
  });

  assert.equal(readiness.kind, "no-images-selected");
  assert.equal(readiness.requiresUpload, false);
  assert.equal(readiness.shouldBlockSubmitUntilUpload, false);
  assert.equal(readiness.isUploadSatisfied, true);
});

await run("image contract: selected images without uploaded urls are treated as submit-time uploads", () => {
  const readiness = resolveLegacySubmitImageReadiness({
    draft: createDraft(2),
    uploadedImageUrls: [],
  });

  assert.equal(readiness.kind, "images-upload-ready");
  assert.equal(readiness.requiresUpload, true);
  assert.equal(readiness.selectedImageCount, 2);
  assert.equal(readiness.uploadedImageUrlCount, 0);
  assert.equal(readiness.shouldBlockSubmitUntilUpload, false);
  assert.equal(readiness.isUploadSatisfied, true);
});

await run("image contract: selected images with uploaded urls matched is upload-ready", () => {
  const readiness = resolveLegacySubmitImageReadiness({
    draft: createDraft(2),
    uploadedImageUrls: ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"],
  });

  assert.equal(readiness.kind, "images-upload-ready");
  assert.equal(readiness.requiresUpload, true);
  assert.equal(readiness.isUploadSatisfied, true);
  assert.equal(readiness.shouldBlockSubmitUntilUpload, false);
});

await run("submit adapter: no selected images can stay ready without uploaded urls", () => {
  const result = buildLegacySubmitPayloadCandidate({
    draft: createDraft(0),
    uploadedImageUrls: [],
  });

  assert.equal(result.status, "ready");
  assert.equal(result.ready, true);
  assert.equal(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls), false);
});

await run("submit adapter: selected images stay ready because uploads happen during submit intent", () => {
  const result = buildLegacySubmitPayloadCandidate({
    draft: createDraft(2),
    uploadedImageUrls: [],
  });

  assert.equal(result.status, "ready");
  assert.equal(result.ready, true);
  assert.equal(result.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls), false);
});




