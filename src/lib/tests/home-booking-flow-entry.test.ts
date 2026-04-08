import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildHomeBookingDraftDebugState,
  buildHomeBookingLegacyDraftFromSkeletonState,
  resolveHomeBookingMode,
  resolveHomeBookingUploadedImageUrls,
  resolveLegacyCategoryFromSkeleton,
  resolveSkeletonCategoryFromLegacy,
} from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";
import { LEGACY_SUBMIT_ADAPTER_BLOCKERS } from "../bookings/bookingFlowSkeleton/submitAdapter.ts";
import { runLegacySubmitPreparation } from "../bookings/bookingFlowSkeleton/submitRunner.ts";
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

function createTestState(category: BookingFlowCategory): BookingFlowState {
  return {
    currentStep: "service-selection",
    category,
    selectedServiceId: null,
    selectedDate: null,
    selectedTime: null,
    customerDetails: {
      name: "",
      phone: "",
      requestNote: "",
      profileSource: "none",
      profileSnapshot: null,
      currentStateImages: [],
      desiredStyleImages: [],
    },
    confirmation: {
      bookingConfirmed: false,
      privacyConsent: false,
    },
  };
}

await run("home booking mode falls back to legacy when mode is omitted", () => {
  assert.equal(resolveHomeBookingMode({}), "legacy");
});

await run("home booking mode keeps legacy when skeleton mode is not enabled", () => {
  assert.equal(resolveHomeBookingMode({ mode: "skeleton", enableSkeletonMode: false }), "legacy");
});

await run("home booking mode enables skeleton only when explicit flag is true", () => {
  assert.equal(resolveHomeBookingMode({ mode: "skeleton", enableSkeletonMode: true }), "skeleton");
});

await run("legacy esthetic and lash categories map to new aesthetic and eyelash", () => {
  assert.equal(resolveSkeletonCategoryFromLegacy("esthetic"), "aesthetic");
  assert.equal(resolveSkeletonCategoryFromLegacy("lash"), "eyelash");
});

await run("new aesthetic and eyelash categories map back to legacy ids", () => {
  assert.equal(resolveLegacyCategoryFromSkeleton("aesthetic"), "esthetic");
  assert.equal(resolveLegacyCategoryFromSkeleton("eyelash"), "lash");
});

await run("self-mapped categories keep the same id across legacy/new bridge", () => {
  assert.equal(resolveSkeletonCategoryFromLegacy("hair"), "hair");
  assert.equal(resolveLegacyCategoryFromSkeleton("nail"), "nail");
});

await run("bridge draft builds legacy shape with placeholder booking time and flattened image order", () => {
  const state = createTestState("hair");
  state.selectedServiceId = "hair-cut";
  state.selectedDate = "2026-05-18";
  state.customerDetails.name = "Jane";
  state.customerDetails.phone = "010-1234-5678";
  state.customerDetails.requestNote = "Natural look";
  state.customerDetails.currentStateImages = [
    {
      id: "current-1",
      kind: "current-state",
      fileName: "current-front.jpg",
      fileSize: 1200,
      mimeType: "image/jpeg",
    },
  ];
  state.customerDetails.desiredStyleImages = [
    {
      id: "desired-1",
      kind: "desired-style",
      fileName: "desired-style.jpg",
      fileSize: 2400,
      mimeType: "image/jpeg",
    },
  ];

  const draft = buildHomeBookingLegacyDraftFromSkeletonState({
    state,
    storeContext: {
      storeId: "store-100",
      storeName: "Preview Hair Shop",
      region: "Gangnam",
    },
    primaryServiceName: "Cut",
    agreements: {
      bookingConfirmed: true,
      privacyConsent: true,
    },
  });

  assert.notEqual(draft, null);
  assert.equal(draft?.category.newCategory, "hair");
  assert.equal(draft?.category.legacyCategory, "hair");
  assert.equal(draft?.store.storeId, "store-100");
  assert.equal(draft?.schedule.bookingDate, "2026-05-18");
  assert.equal(draft?.schedule.bookingTime, "10:00");
  assert.equal(draft?.schedule.usesPlaceholderTime, true);
  assert.equal(draft?.images.totalCount, 2);
  assert.equal(draft?.images.flattened[0]?.sourceGroup, "currentStateImages");
  assert.equal(draft?.images.flattened[1]?.sourceGroup, "desiredStyleImages");
});

await run("bridge draft keeps unresolved store state when storeId is missing", () => {
  const state = createTestState("nail");
  state.selectedServiceId = "nail-gel";
  state.selectedDate = "2026-06-01";
  state.customerDetails.name = "Alex";
  state.customerDetails.phone = "+821012345678";

  const draft = buildHomeBookingLegacyDraftFromSkeletonState({
    state,
    storeContext: {},
    primaryServiceName: "Gel",
  });

  assert.notEqual(draft, null);
  assert.equal(draft?.store.storeId, null);
  assert.equal(draft?.unresolved.missingStoreId, true);
  assert.equal(draft?.schedule.bookingTime, "10:00");
  assert.equal(draft?.unresolved.bookingTimeIsPlaceholder, true);
});

await run("draft debug state exposes raw uploaded refs separately from step3-derived uploaded urls", () => {
  const state = createTestState("hair");
  state.selectedServiceId = "hair-cut";
  state.selectedDate = "2026-05-18";
  state.customerDetails.currentStateImages = [
    {
      id: "current-1",
      kind: "current-state",
      fileName: "current-front.jpg",
      fileSize: 1200,
      mimeType: "image/jpeg",
    },
  ];
  state.customerDetails.uploadedImageResults = {
    currentStateImages: [
      {
        draftImageId: "current-1",
        uploadedUrl: "https://cdn.test/current-1.jpg",
      },
    ],
    desiredStyleImages: [],
  };

  const draftCandidate = buildHomeBookingLegacyDraftFromSkeletonState({
    state,
    storeContext: {
      storeId: "store-100",
      storeName: "Preview Hair Shop",
      region: "Gangnam",
    },
  });
  const debugState = buildHomeBookingDraftDebugState({
    draftCandidate,
    draftStateUploadedImageResults: state.customerDetails.uploadedImageResults,
    draftStateUploadedImageUrls: [" https://cdn.test/current-1.jpg "],
  });

  assert.equal(debugState.draftCandidate?.store.storeId, "store-100");
  assert.deepStrictEqual(debugState.draftStateUploadedImageResults, {
    currentStateImages: [
      {
        draftImageId: "current-1",
        uploadedUrl: "https://cdn.test/current-1.jpg",
      },
    ],
    desiredStyleImages: [],
  });
  assert.deepStrictEqual(debugState.draftStateUploadedImageUrls, [
    "https://cdn.test/current-1.jpg",
  ]);
});

await run("HomeBookingFlowEntry seam forwards uploadedImageUrls at both preparation/intent boundaries and keeps image blocker behavior consistent", () => {
  const entrySource = readFileSync(
    new URL("../../app/components/home/HomeBookingFlowEntry.tsx", import.meta.url),
    "utf8",
  );

  const seamMatches = entrySource.match(/resolveHomeBookingUploadedImageUrls\(/g) ?? [];
  assert.equal(
    seamMatches.length >= 2,
    true,
    "HomeBookingFlowEntry should resolve uploadedImageUrls in both draft-preparation and submit-intent boundaries",
  );

  assert.deepStrictEqual(
    resolveHomeBookingUploadedImageUrls({
      draftStateUploadedImageUrls: [
        "https://cdn.test/current-1.jpg",
        "https://cdn.test/current-2.jpg",
        "https://cdn.test/desired-1.jpg",
      ],
      uploadedImageUrlsOverride: undefined,
    }),
    [
      "https://cdn.test/current-1.jpg",
      "https://cdn.test/current-2.jpg",
      "https://cdn.test/desired-1.jpg",
    ],
  );
  assert.deepStrictEqual(
    resolveHomeBookingUploadedImageUrls({
      draftStateUploadedImageUrls: [
        "https://cdn.test/current-1.jpg",
        "https://cdn.test/current-2.jpg",
        "https://cdn.test/desired-1.jpg",
      ],
      uploadedImageUrlsOverride: [" https://debug.local/mock-uploaded-image-1.jpg "],
    }),
    ["https://debug.local/mock-uploaded-image-1.jpg"],
  );

  const state = createTestState("hair");
  state.currentStep = "customer-details";
  state.selectedServiceId = "hair-cut";
  state.selectedDate = "2026-05-18";
  state.selectedTime = "11:30";
  state.customerDetails.name = "Jane";
  state.customerDetails.phone = "01012345678";
  state.customerDetails.currentStateImages = [
    {
      id: "current-1",
      kind: "current-state",
      fileName: "current-front.jpg",
      fileSize: 1200,
      mimeType: "image/jpeg",
    },
  ];
  state.confirmation.bookingConfirmed = true;
  state.confirmation.privacyConsent = true;

  const draft = buildHomeBookingLegacyDraftFromSkeletonState({
    state,
    storeContext: {
      storeId: "store-100",
      storeName: "Preview Hair Shop",
      region: "Gangnam",
    },
    primaryServiceName: "Cut",
    agreements: {
      bookingConfirmed: true,
      privacyConsent: true,
    },
  });

  const blockedWithoutUploadedUrls = runLegacySubmitPreparation({
    draft,
    uploadedImageUrls: [],
  });
  assert.equal(blockedWithoutUploadedUrls.canAttemptSubmit, false);
  assert.equal(
    blockedWithoutUploadedUrls.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls),
    true,
  );

  const readyWithInjectedUploadedUrl = runLegacySubmitPreparation({
    draft,
    uploadedImageUrls: [" https://debug.local/mock-uploaded-image-1.jpg "],
  });
  assert.equal(
    readyWithInjectedUploadedUrl.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls),
    false,
  );
  assert.equal(readyWithInjectedUploadedUrl.status, "ready-to-submit");
  assert.equal(readyWithInjectedUploadedUrl.uiState.uiState, "submit-ready");
  assert.equal(readyWithInjectedUploadedUrl.canAttemptSubmit, true);
});
