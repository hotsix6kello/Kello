import assert from "node:assert/strict";

import {
  buildHomeBookingDraftReadyDebugDisplay,
  buildHomeBookingSkeletonDebugPanelDisplay,
  buildHomeBookingSubmitDebugDisplay,
  buildHomeBookingUploadDebugDisplay,
  shouldShowSkeletonDraftDebugPanel,
} from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";
import type { HomeBookingSkeletonDebugPanelDisplayInput } from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";
import {
  buildLegacySubmitPayloadCandidate,
  LEGACY_SUBMIT_ADAPTER_BLOCKERS,
} from "../bookings/bookingFlowSkeleton/submitAdapter.ts";
import { resolveLegacySubmitInvocationPlan } from "../bookings/bookingFlowSkeleton/submitInvocation.ts";
import { resolveLegacySubmitOrchestration } from "../bookings/bookingFlowSkeleton/submitOrchestrator.ts";
import { resolveLegacySubmitUiState } from "../bookings/bookingFlowSkeleton/submitUiState.ts";
import { resolveLegacySubmitStatusCopy } from "../bookings/bookingFlowSkeleton/submitMessages.ts";
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

function resolveSubmitUiStateForDebugPanel(params: {
  isSkeletonFlowEnabled: boolean;
  debugParam: string | null;
  draft: LegacyBookingDraftFromSkeleton | null;
  uploadedImageUrls?: string[];
}) {
  const shouldShow = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: params.isSkeletonFlowEnabled,
    debugParam: params.debugParam,
  });

  if (!shouldShow) {
    return null;
  }

  if (!params.draft) {
    return resolveLegacySubmitUiState(null);
  }

  const payloadCandidateResult = buildLegacySubmitPayloadCandidate({
    draft: params.draft,
    uploadedImageUrls: params.uploadedImageUrls,
  });
  const invocationPlan = resolveLegacySubmitInvocationPlan(payloadCandidateResult);
  const orchestrationPlan = resolveLegacySubmitOrchestration(invocationPlan);
  return resolveLegacySubmitUiState(orchestrationPlan);
}

type SubmitAttemptDebugState = {
  status: "idle" | "submitting" | "submitted" | "submit-error";
  message: string | null;
  errorSummary: string | null;
  updatedAt: string;
};

function resolveSubmitAttemptPanelFields(params: {
  isSkeletonFlowEnabled: boolean;
  debugParam: string | null;
  submitAttemptState: SubmitAttemptDebugState | null;
}) {
  const shouldShow = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: params.isSkeletonFlowEnabled,
    debugParam: params.debugParam,
  });

  if (!shouldShow) {
    return null;
  }

  return {
    submitAttemptStatus: params.submitAttemptState?.status ?? "idle",
    submitMessage: params.submitAttemptState?.message ?? "none",
    submitError: params.submitAttemptState?.errorSummary ?? "none",
    hasLastSubmitUpdate: Boolean(params.submitAttemptState?.updatedAt),
  };
}

function resolveSubmitDisplayPanelFields(params: {
  isSkeletonFlowEnabled: boolean;
  debugParam: string | null;
  submitUiState: ReturnType<typeof resolveLegacySubmitUiState> | null;
  submitStatusCopy?: ReturnType<typeof resolveLegacySubmitStatusCopy> | null;
  submitAttemptState: SubmitAttemptDebugState | null;
}) {
  const shouldShow = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: params.isSkeletonFlowEnabled,
    debugParam: params.debugParam,
  });

  if (!shouldShow) {
    return null;
  }

  return buildHomeBookingSubmitDebugDisplay({
    submitUiState: params.submitUiState,
    submitStatusCopy: params.submitStatusCopy,
    submitAttemptState: params.submitAttemptState,
    formatUpdatedAt: () => "12:32:00 PM",
  });
}

function resolveDraftUploadSourcePanelFields(params: {
  isSkeletonFlowEnabled: boolean;
  debugParam: string | null;
  currentStateUploadedRefCount?: number;
  desiredStyleUploadedRefCount?: number;
  draftStateUploadedImageUrls?: string[];
  uploadedImageUrlsOverride?: string[];
}) {
  const shouldShow = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: params.isSkeletonFlowEnabled,
    debugParam: params.debugParam,
  });

  if (!shouldShow) {
    return null;
  }

  return buildHomeBookingUploadDebugDisplay({
    draftState: {
      draftCandidate: null,
      draftStateUploadedImageResults: {
        currentStateImages: Array.from(
          { length: params.currentStateUploadedRefCount ?? 0 },
          (_, index) => ({
            draftImageId: `current-${index}`,
            uploadedUrl: `https://cdn.test/current-${index}.jpg`,
          }),
        ),
        desiredStyleImages: Array.from(
          { length: params.desiredStyleUploadedRefCount ?? 0 },
          (_, index) => ({
            draftImageId: `desired-${index}`,
            uploadedUrl: `https://cdn.test/desired-${index}.jpg`,
          }),
        ),
      },
      draftStateUploadedImageUrls: params.draftStateUploadedImageUrls ?? [],
    },
    uploadedImageUrlsOverride: params.uploadedImageUrlsOverride,
  });
}

function resolveDraftReadyPanelFields(params: {
  isSkeletonFlowEnabled: boolean;
  debugParam: string | null;
  draftReadyPayload: LegacyBookingDraftFromSkeleton | null;
  updatedAt?: string | null;
}) {
  const shouldShow = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: params.isSkeletonFlowEnabled,
    debugParam: params.debugParam,
  });

  if (!shouldShow) {
    return null;
  }

  return buildHomeBookingDraftReadyDebugDisplay({
    draftReadyPayload: params.draftReadyPayload,
    updatedAt: params.updatedAt,
    formatUpdatedAt: () => "12:32:00 PM",
  });
}

function resolveSkeletonDebugPanelSections(params: {
  isSkeletonFlowEnabled: boolean;
  debugParam: string | null;
  draftReadyPayload: LegacyBookingDraftFromSkeleton | null;
  currentStateUploadedRefCount?: number;
  desiredStyleUploadedRefCount?: number;
  draftStateUploadedImageUrls?: string[];
  uploadedImageUrlsOverride?: string[];
  submitUiState: ReturnType<typeof resolveLegacySubmitUiState> | null;
  submitStatusCopy?: ReturnType<typeof resolveLegacySubmitStatusCopy> | null;
  submitAttemptState: SubmitAttemptDebugState | null;
  updatedAt?: string | null;
}) {
  const shouldShow = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: params.isSkeletonFlowEnabled,
    debugParam: params.debugParam,
  });

  if (!shouldShow) {
    return null;
  }

  const input: HomeBookingSkeletonDebugPanelDisplayInput = {
    draftReadyPayload: params.draftReadyPayload,
    draftState: {
      draftCandidate: null,
      draftStateUploadedImageResults: {
        currentStateImages: Array.from(
          { length: params.currentStateUploadedRefCount ?? 0 },
          (_, index) => ({
            draftImageId: `current-${index}`,
            uploadedUrl: `https://cdn.test/current-${index}.jpg`,
          }),
        ),
        desiredStyleImages: Array.from(
          { length: params.desiredStyleUploadedRefCount ?? 0 },
          (_, index) => ({
            draftImageId: `desired-${index}`,
            uploadedUrl: `https://cdn.test/desired-${index}.jpg`,
          }),
        ),
      },
      draftStateUploadedImageUrls: params.draftStateUploadedImageUrls ?? [],
    },
    updatedAt: params.updatedAt,
    uploadedImageUrlsOverride: params.uploadedImageUrlsOverride,
    submitUiState: params.submitUiState,
    submitStatusCopy: params.submitStatusCopy,
    submitAttemptState: params.submitAttemptState,
    formatUpdatedAt: () => "12:32:00 PM",
  };

  return buildHomeBookingSkeletonDebugPanelDisplay(input);
}

await run("submit debug panel state is not calculated when skeleton+debug gate is closed", () => {
  const hiddenForLegacy = resolveSubmitUiStateForDebugPanel({
    isSkeletonFlowEnabled: false,
    debugParam: "draft",
    draft: createReadyDraft(),
  });
  assert.equal(hiddenForLegacy, null);

  const hiddenWithoutDebug = resolveSubmitUiStateForDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: null,
    draft: createReadyDraft(),
  });
  assert.equal(hiddenWithoutDebug, null);
});

await run("submit debug panel uses safe idle placeholder when draft is not available yet", () => {
  const state = resolveSubmitUiStateForDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draft: null,
  });

  assert.notEqual(state, null);
  assert.equal(state?.uiState, "idle");
  assert.equal(state?.canSubmit, false);
  assert.equal(state?.hasPayload, false);
});

await run("submit debug panel shows submit-ready when placeholder time is the only unresolved scheduling detail", () => {
  const draft = createReadyDraft();
  draft.schedule.bookingTime = "10:00";
  draft.schedule.usesPlaceholderTime = true;
  draft.unresolved.bookingTimeIsPlaceholder = true;

  const state = resolveSubmitUiStateForDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draft,
  });

  assert.notEqual(state, null);
  assert.equal(state?.uiState, "submit-ready");
  assert.equal(state?.canSubmit, true);
  assert.equal(state?.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingTimePlaceholder), false);
});

await run("submit debug panel consumes status copy helper for a ready placeholder-time draft", () => {
  const draft = createReadyDraft();
  draft.schedule.bookingTime = "10:00";
  draft.schedule.usesPlaceholderTime = true;
  draft.unresolved.bookingTimeIsPlaceholder = true;

  const state = resolveSubmitUiStateForDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draft,
  });
  const statusCopy = resolveLegacySubmitStatusCopy(state);

  assert.notEqual(state, null);
  assert.equal(statusCopy.title, "Submit ready (preview)");
  assert.equal(statusCopy.tone, "success");
  assert.equal(statusCopy.message, "Validation passed. This does not mean the request was submitted.");
});

await run("submit attempt read-only fields are visible only under skeleton+debug gate", () => {
  const hiddenInLegacy = resolveSubmitAttemptPanelFields({
    isSkeletonFlowEnabled: false,
    debugParam: "draft",
    submitAttemptState: {
      status: "submitted",
      message: "Submit completed.",
      errorSummary: null,
      updatedAt: "2026-04-08T12:30:00.000Z",
    },
  });
  assert.equal(hiddenInLegacy, null);

  const hiddenWithoutDraftDebug = resolveSubmitAttemptPanelFields({
    isSkeletonFlowEnabled: true,
    debugParam: null,
    submitAttemptState: {
      status: "submit-error",
      message: "Submit failed.",
      errorSummary: "Network error",
      updatedAt: "2026-04-08T12:31:00.000Z",
    },
  });
  assert.equal(hiddenWithoutDraftDebug, null);

  const shownWithSkeletonAndDebug = resolveSubmitAttemptPanelFields({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    submitAttemptState: {
      status: "submitted",
      message: "Submit completed.",
      errorSummary: null,
      updatedAt: "2026-04-08T12:32:00.000Z",
    },
  });
  assert.notEqual(shownWithSkeletonAndDebug, null);
  assert.equal(shownWithSkeletonAndDebug?.submitAttemptStatus, "submitted");
  assert.equal(shownWithSkeletonAndDebug?.submitMessage, "Submit completed.");
  assert.equal(shownWithSkeletonAndDebug?.submitError, "none");
  assert.equal(shownWithSkeletonAndDebug?.hasLastSubmitUpdate, true);
});

await run("draft-ready debug display helper keeps ready and waiting payload states stable", () => {
  const hiddenForLegacy = resolveDraftReadyPanelFields({
    isSkeletonFlowEnabled: false,
    debugParam: "draft",
    draftReadyPayload: createReadyDraft(),
    updatedAt: "2026-04-08T12:32:00.000Z",
  });
  assert.equal(hiddenForLegacy, null);

  const waitingDisplay = resolveDraftReadyPanelFields({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draftReadyPayload: null,
  });
  assert.notEqual(waitingDisplay, null);
  assert.deepEqual(waitingDisplay?.readyLines, []);
  assert.equal(waitingDisplay?.waitingLine, "Draft ready: waiting for first eligible emit");

  const readyDisplay = resolveDraftReadyPanelFields({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draftReadyPayload: createReadyDraft(),
    updatedAt: "2026-04-08T12:32:00.000Z",
  });
  assert.notEqual(readyDisplay, null);
  assert.deepEqual(readyDisplay?.readyLines, [
    "Draft ready: yes",
    "Category: hair",
    "Store ID: store-hair-1",
    "Booking time: 14:30",
    "Service ID: hair-cut",
    "Customer: Mina / 01012345678",
    "Images: current 0, desired 0",
    "Last updated: 12:32:00 PM",
  ]);
  assert.equal(readyDisplay?.waitingLine, null);
});

await run("section-level debug panel helper keeps draft/upload/submit sections in stable order", () => {
  const hiddenForLegacy = resolveSkeletonDebugPanelSections({
    isSkeletonFlowEnabled: false,
    debugParam: "draft",
    draftReadyPayload: createReadyDraft(),
    currentStateUploadedRefCount: 1,
    desiredStyleUploadedRefCount: 2,
    draftStateUploadedImageUrls: ["https://cdn.test/from-step3.jpg"],
    submitUiState: resolveLegacySubmitUiState(null),
    submitStatusCopy: resolveLegacySubmitStatusCopy(resolveLegacySubmitUiState(null)),
    submitAttemptState: null,
    updatedAt: "2026-04-08T12:32:00.000Z",
  });
  assert.equal(hiddenForLegacy, null);

  const readyDraft = createReadyDraft();
  readyDraft.schedule.bookingTime = "10:00";
  readyDraft.schedule.usesPlaceholderTime = true;
  readyDraft.unresolved.bookingTimeIsPlaceholder = true;
  const readyUiState = resolveSubmitUiStateForDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draft: readyDraft,
  });
  const panel = resolveSkeletonDebugPanelSections({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draftReadyPayload: createReadyDraft(),
    currentStateUploadedRefCount: 1,
    desiredStyleUploadedRefCount: 2,
    draftStateUploadedImageUrls: ["https://cdn.test/from-step3.jpg"],
    uploadedImageUrlsOverride: ["https://debug.local/mock-uploaded-image-1.jpg"],
    submitUiState: readyUiState,
    submitStatusCopy: resolveLegacySubmitStatusCopy(readyUiState),
    submitAttemptState: {
      status: "submit-error",
      message: "Submit failed.",
      errorSummary: "Network error",
      updatedAt: "2026-04-08T12:32:00.000Z",
    },
    updatedAt: "2026-04-08T12:32:00.000Z",
  });

  assert.notEqual(panel, null);
  assert.equal(panel?.title, "Debug only: Draft-ready payload (Not submitted)");
  assert.deepEqual(
    panel?.sections.map((section) => section.key),
    ["draft-ready", "upload", "submit-preparation", "submit-attempt"],
  );
  assert.deepEqual(panel?.sections[0]?.lines, [
    "Draft ready: yes",
    "Category: hair",
    "Store ID: store-hair-1",
    "Booking time: 14:30",
    "Service ID: hair-cut",
    "Customer: Mina / 01012345678",
    "Images: current 0, desired 0",
    "Last updated: 12:32:00 PM",
  ]);
  assert.deepEqual(panel?.sections[1]?.lines, [
    "Step3 raw uploaded refs: current 1, desired 2",
    "Step3 state-derived uploaded URLs: 1",
    "Page override uploaded URLs: on",
    "Current submit chain source: page-override",
  ]);
  assert.deepEqual(panel?.sections[2]?.lines, [
    "Read-only status: true",
    "Submit state: submit-ready",
    "Title: Submit ready (preview)",
    "Message: Validation passed. This does not mean the request was submitted.",
    "Tone: success",
    "Can submit: yes",
    "Has payload: yes",
  ]);
  assert.deepEqual(panel?.sections[3]?.lines, [
    "Submit attempt status: submit-error",
    "Submit message: Submit failed.",
    "Submit error: Network error",
    "Last submit update: 12:32:00 PM",
  ]);
});

await run("submit debug display helper keeps preparation and attempt read-only lines stable", () => {
  const hiddenForLegacy = resolveSubmitDisplayPanelFields({
    isSkeletonFlowEnabled: false,
    debugParam: "draft",
    submitUiState: resolveLegacySubmitUiState(null),
    submitStatusCopy: resolveLegacySubmitStatusCopy(resolveLegacySubmitUiState(null)),
    submitAttemptState: {
      status: "submitted",
      message: "Submit completed.",
      errorSummary: null,
      updatedAt: "2026-04-08T12:32:00.000Z",
    },
  });
  assert.equal(hiddenForLegacy, null);

  const readyDraft = createReadyDraft();
  readyDraft.schedule.bookingTime = "10:00";
  readyDraft.schedule.usesPlaceholderTime = true;
  readyDraft.unresolved.bookingTimeIsPlaceholder = true;
  const readyUiState = resolveSubmitUiStateForDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draft: readyDraft,
  });
  const display = resolveSubmitDisplayPanelFields({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    submitUiState: readyUiState,
    submitStatusCopy: resolveLegacySubmitStatusCopy(readyUiState),
    submitAttemptState: {
      status: "submit-error",
      message: "Submit failed.",
      errorSummary: "Network error",
      updatedAt: "2026-04-08T12:32:00.000Z",
    },
  });

  assert.notEqual(display, null);
  assert.deepEqual(display?.preparationLines, [
    "Read-only status: true",
    "Submit state: submit-ready",
    "Title: Submit ready (preview)",
    "Message: Validation passed. This does not mean the request was submitted.",
    "Tone: success",
    "Can submit: yes",
    "Has payload: yes",
  ]);
  assert.deepEqual(display?.attemptLines, [
    "Submit attempt status: submit-error",
    "Submit message: Submit failed.",
    "Submit error: Network error",
    "Last submit update: 12:32:00 PM",
  ]);
});

await run("debug panel keeps step3-derived uploaded urls separate from page-level override status", () => {
  const hiddenForLegacy = resolveDraftUploadSourcePanelFields({
    isSkeletonFlowEnabled: false,
    debugParam: "draft",
    currentStateUploadedRefCount: 1,
    desiredStyleUploadedRefCount: 1,
    draftStateUploadedImageUrls: ["https://cdn.test/from-step3.jpg"],
    uploadedImageUrlsOverride: ["https://debug.local/mock-uploaded-image-1.jpg"],
  });
  assert.equal(hiddenForLegacy, null);

  const shownWithoutOverride = resolveDraftUploadSourcePanelFields({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    currentStateUploadedRefCount: 1,
    desiredStyleUploadedRefCount: 2,
    draftStateUploadedImageUrls: ["https://cdn.test/from-step3.jpg"],
    uploadedImageUrlsOverride: undefined,
  });
  assert.notEqual(shownWithoutOverride, null);
  assert.equal(shownWithoutOverride?.rawUploadedRefsLine, "Step3 raw uploaded refs: current 1, desired 2");
  assert.equal(shownWithoutOverride?.stateDerivedUploadedUrlsLine, "Step3 state-derived uploaded URLs: 1");
  assert.equal(shownWithoutOverride?.pageOverrideUploadedUrlsLine, "Page override uploaded URLs: off");
  assert.equal(shownWithoutOverride?.submitChainSourceLine, "Current submit chain source: step3-derived");

  const shownWithOverride = resolveDraftUploadSourcePanelFields({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    currentStateUploadedRefCount: 1,
    desiredStyleUploadedRefCount: 2,
    draftStateUploadedImageUrls: ["https://cdn.test/from-step3.jpg"],
    uploadedImageUrlsOverride: ["https://debug.local/mock-uploaded-image-1.jpg"],
  });
  assert.notEqual(shownWithOverride, null);
  assert.equal(shownWithOverride?.rawUploadedRefsLine, "Step3 raw uploaded refs: current 1, desired 2");
  assert.equal(shownWithOverride?.stateDerivedUploadedUrlsLine, "Step3 state-derived uploaded URLs: 1");
  assert.equal(shownWithOverride?.pageOverrideUploadedUrlsLine, "Page override uploaded URLs: on");
  assert.equal(shownWithOverride?.submitChainSourceLine, "Current submit chain source: page-override");
});

await run("submit debug panel keeps image uploads out of pre-submit blockers while still accepting injected uploaded urls", () => {
  const draft = createReadyDraft();
  draft.images = {
    flattened: [
      {
        id: "img-1",
        sourceGroup: "currentStateImages",
        sourceKind: "current-state",
        fileName: "hair-current.jpg",
        fileSize: 1024,
        mimeType: "image/jpeg",
        flatIndex: 0,
        groupIndex: 0,
      },
    ],
    currentStateCount: 1,
    desiredStyleCount: 0,
    totalCount: 1,
    preserveSourceMetadata: true,
  };

  const readyWithoutUploadedUrls = resolveSubmitUiStateForDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draft,
    uploadedImageUrls: [],
  });
  assert.notEqual(readyWithoutUploadedUrls, null);
  assert.equal(readyWithoutUploadedUrls?.uiState, "submit-ready");
  assert.ok(
    !readyWithoutUploadedUrls?.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls),
  );

  const readyWithMockUploadedUrl = resolveSubmitUiStateForDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draft,
    uploadedImageUrls: ["https://debug.local/mock-uploaded-image-1.jpg"],
  });
  assert.notEqual(readyWithMockUploadedUrl, null);
  assert.equal(readyWithMockUploadedUrl?.uiState, "submit-ready");
  assert.equal(readyWithMockUploadedUrl?.canSubmit, true);
  assert.equal(
    readyWithMockUploadedUrl?.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls),
    false,
  );
});

await run("submit-attempt statuses can coexist with injected upload refs without a pre-submit image blocker", () => {
  const draft = createReadyDraft();
  draft.images = {
    flattened: [
      {
        id: "img-1",
        sourceGroup: "currentStateImages",
        sourceKind: "current-state",
        fileName: "hair-current.jpg",
        fileSize: 1024,
        mimeType: "image/jpeg",
        flatIndex: 0,
        groupIndex: 0,
      },
    ],
    currentStateCount: 1,
    desiredStyleCount: 0,
    totalCount: 1,
    preserveSourceMetadata: true,
  };

  const releasedUiState = resolveSubmitUiStateForDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    draft,
    uploadedImageUrls: ["https://debug.local/mock-uploaded-image-1.jpg"],
  });
  assert.notEqual(releasedUiState, null);
  assert.equal(releasedUiState?.uiState, "submit-ready");
  assert.equal(
    releasedUiState?.blockers.includes(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls),
    false,
  );

  const submittingAttempt = resolveSubmitAttemptPanelFields({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    submitAttemptState: {
      status: "submitting",
      message: "Submitting booking request...",
      errorSummary: null,
      updatedAt: "2026-04-08T13:00:00.000Z",
    },
  });
  assert.equal(submittingAttempt?.submitAttemptStatus, "submitting");
  assert.equal(submittingAttempt?.submitError, "none");

  const submittedAttempt = resolveSubmitAttemptPanelFields({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    submitAttemptState: {
      status: "submitted",
      message: "Submit completed.",
      errorSummary: null,
      updatedAt: "2026-04-08T13:01:00.000Z",
    },
  });
  assert.equal(submittedAttempt?.submitAttemptStatus, "submitted");
  assert.equal(submittedAttempt?.submitMessage, "Submit completed.");

  const errorAttempt = resolveSubmitAttemptPanelFields({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
    submitAttemptState: {
      status: "submit-error",
      message: "Submit failed.",
      errorSummary: "Submit request failed.",
      updatedAt: "2026-04-08T13:02:00.000Z",
    },
  });
  assert.equal(errorAttempt?.submitAttemptStatus, "submit-error");
  assert.equal(errorAttempt?.submitError, "Submit request failed.");
});



