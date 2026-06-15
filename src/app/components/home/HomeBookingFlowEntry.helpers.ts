import {
  buildLegacyBookingDraftFromSkeleton,
  mapLegacyCategoryToNewCategory,
  mapNewCategoryToLegacyCategory,
} from "../../../lib/bookings/bookingFlowSkeleton/bridge.ts";
import type {
  BookingFlowCategory,
  BookingUploadedImageResultState,
} from "../../../lib/bookings/bookingFlowSkeleton/types.ts";
import type { LegacyBookingDraftFromSkeleton } from "../../../lib/bookings/bookingFlowSkeleton/bridge.ts";
import type { LegacySubmitStatusCopy } from "../../../lib/bookings/bookingFlowSkeleton/submitMessages.ts";
import type { LegacySubmitUiState } from "../../../lib/bookings/bookingFlowSkeleton/submitUiState.ts";
import {
  findPartnerMenuItemById,
  resolvePartnerMenuItemPriceSummary,
} from "../../../lib/bookings/partnerMenu.ts";
import type { BeautyCategoryId } from "./constants";
import type {
  HomeBookingDraftDebugState,
  HomeBookingDraftReadyEmissionInput,
  HomeBookingDraftReadyEmissionResult,
  HomeBookingDraftReadyEvent,
  HomeBookingDraftReadyResolverInput,
  HomeBookingDraftReadySequenceInput,
  HomeBookingDraftReadySequenceResult,
  HomeBookingDraftReadyTimingInput,
  HomeBookingDraftReadyTimingResult,
  HomeBookingFlowMode,
  HomeBookingLegacyDraftBuildInput,
} from "./HomeBookingFlowEntry.types";

export function resolveHomeBookingMode(params: {
  mode?: HomeBookingFlowMode;
  enableSkeletonMode?: boolean;
}): HomeBookingFlowMode {
  // 기본적으로 skeleton 모드를 우선하며, 명시적으로 legacy가 요청된 경우에만 legacy를 반환합니다.
  if (params.mode === "legacy") return "legacy";
  if (params.enableSkeletonMode === false) return "legacy";
  return "skeleton";
}

export function shouldShowSkeletonDraftDebugPanel(params: {
  isSkeletonFlowEnabled: boolean;
  debugParam: string | null | undefined;
}): boolean {
  return params.isSkeletonFlowEnabled && params.debugParam === "draft";
}

export function resolveSkeletonCategoryFromLegacy(
  category: BeautyCategoryId | "all" | null,
): BookingFlowCategory | null {
  if (!category || category === "all") {
    return null;
  }

  return mapLegacyCategoryToNewCategory(category);
}

export function resolveLegacyCategoryFromSkeleton(category: BookingFlowCategory): BeautyCategoryId {
  return mapNewCategoryToLegacyCategory(category);
}

export function buildHomeBookingLegacyDraftFromSkeletonState(
  input: HomeBookingLegacyDraftBuildInput,
): LegacyBookingDraftFromSkeleton | null {
  const selectedPartnerMenuItem = findPartnerMenuItemById(
    input.partnerServiceMenu,
    input.state.selectedServiceId,
  );

  // HomeBookingFlowEntry helper is the single injection point for storeContext -> legacy draft candidate.
  return buildLegacyBookingDraftFromSkeleton({
    state: input.state,
    storeId: input.storeContext?.storeId ?? null,
    storeName: input.storeContext?.storeName ?? null,
    region: input.storeContext?.region ?? null,
    storeSource: input.storeContext?.storeSource ?? null,
    primaryServiceName: input.primaryServiceName ?? null,
    agreements: input.agreements,
    priceSummary: selectedPartnerMenuItem
      ? resolvePartnerMenuItemPriceSummary(selectedPartnerMenuItem)
      : undefined,
  });
}

function normalizeUploadedImageUrls(value: string[] | undefined): string[] {
  if (!value || value.length === 0) {
    return [];
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function createEmptyDraftDebugUploadedImageResultState(): BookingUploadedImageResultState {
  return {
    currentStateImages: [],
    desiredStyleImages: [],
  };
}

export function resolveHomeBookingUploadedImageUrls(params: {
  draftStateUploadedImageUrls?: string[];
  uploadedImageUrlsOverride?: string[];
}): string[] {
  if (params.uploadedImageUrlsOverride !== undefined) {
    return normalizeUploadedImageUrls(params.uploadedImageUrlsOverride);
  }

  return normalizeUploadedImageUrls(params.draftStateUploadedImageUrls);
}

export function resolveHomeBookingUploadedImageUrlsOverrideStatus(params: {
  uploadedImageUrlsOverride?: string[];
}): "on" | "off" {
  return params.uploadedImageUrlsOverride !== undefined ? "on" : "off";
}

export function resolveHomeBookingUploadedImageUrlsSource(params: {
  uploadedImageUrlsOverride?: string[];
}): "step3-derived" | "page-override" {
  return params.uploadedImageUrlsOverride !== undefined ? "page-override" : "step3-derived";
}

// Debug display contracts stay in this helper module because they are presentation-only
// shapes for read-only skeleton panel composition, not public HomeBookingFlowEntry props/callbacks.
export type HomeBookingDebugDisplayLines = string[];

export type HomeBookingUploadDebugDisplay = {
  rawUploadedRefsLine: string;
  stateDerivedUploadedUrlsLine: string;
  pageOverrideUploadedUrlsLine: string;
  submitChainSourceLine: string;
};

export function buildHomeBookingUploadDebugDisplay(params: {
  draftState: HomeBookingDraftDebugState;
  uploadedImageUrlsOverride?: string[];
}): HomeBookingUploadDebugDisplay {
  const { draftState } = params;

  return {
    rawUploadedRefsLine: `Step3 raw uploaded refs: current ${draftState.draftStateUploadedImageResults.currentStateImages.length}, desired ${draftState.draftStateUploadedImageResults.desiredStyleImages.length}`,
    stateDerivedUploadedUrlsLine: `Step3 state-derived uploaded URLs: ${draftState.draftStateUploadedImageUrls.length}`,
    pageOverrideUploadedUrlsLine: `Page override uploaded URLs: ${resolveHomeBookingUploadedImageUrlsOverrideStatus({
      uploadedImageUrlsOverride: params.uploadedImageUrlsOverride,
    })}`,
    submitChainSourceLine: `Current submit chain source: ${resolveHomeBookingUploadedImageUrlsSource({
      uploadedImageUrlsOverride: params.uploadedImageUrlsOverride,
    })}`,
  };
}

export type HomeBookingSubmitDebugDisplay = {
  preparationLines: HomeBookingDebugDisplayLines;
  attemptLines: HomeBookingDebugDisplayLines;
};

export function buildHomeBookingSubmitDebugDisplay(params: {
  submitUiState?: LegacySubmitUiState | null;
  submitStatusCopy?: LegacySubmitStatusCopy | null;
  submitAttemptState?: {
    status: "idle" | "submitting" | "submitted" | "submit-error";
    message: string | null;
    errorSummary: string | null;
    updatedAt: string;
  } | null;
  formatUpdatedAt?: (updatedAt: string) => string;
}): HomeBookingSubmitDebugDisplay {
  const formatUpdatedAt =
    params.formatUpdatedAt ?? ((updatedAt: string) => new Date(updatedAt).toLocaleTimeString());
  const preparationLines = params.submitUiState
    ? [
        "Read-only status: true",
        `Submit state: ${params.submitUiState.uiState}`,
        `Title: ${params.submitStatusCopy?.title ?? "Submit preparation pending"}`,
        `Message: ${params.submitStatusCopy?.message ?? "Complete required inputs to prepare a submit plan."}`,
        `Tone: ${params.submitStatusCopy?.tone ?? "info"}`,
        `Can submit: ${params.submitUiState.canSubmit ? "yes" : "no"}`,
        `Has payload: ${params.submitUiState.hasPayload ? "yes" : "no"}`,
        ...(params.submitStatusCopy?.blockerSummary
          ? [`Blocker summary: ${params.submitStatusCopy.blockerSummary}`]
          : []),
        ...(params.submitUiState.blockers.length > 0
          ? [`Blockers: ${params.submitUiState.blockers.slice(0, 3).join(", ")}`]
          : []),
      ]
    : [];

  return {
    preparationLines,
    attemptLines: [
      `Submit attempt status: ${params.submitAttemptState?.status ?? "idle"}`,
      `Submit message: ${params.submitAttemptState?.message ?? "none"}`,
      `Submit error: ${params.submitAttemptState?.errorSummary ?? "none"}`,
      `Last submit update: ${params.submitAttemptState ? formatUpdatedAt(params.submitAttemptState.updatedAt) : "none"}`,
    ],
  };
}

export type HomeBookingDraftReadyDebugDisplay = {
  readyLines: HomeBookingDebugDisplayLines;
  waitingLine: string | null;
};

export function buildHomeBookingDraftReadyDebugDisplay(params: {
  draftReadyPayload?: LegacyBookingDraftFromSkeleton | null;
  updatedAt?: string | null;
  formatUpdatedAt?: (updatedAt: string) => string;
}): HomeBookingDraftReadyDebugDisplay {
  if (!params.draftReadyPayload) {
    return {
      readyLines: [],
      waitingLine: "Draft ready: waiting for first eligible emit",
    };
  }

  const formatUpdatedAt =
    params.formatUpdatedAt ?? ((updatedAt: string) => new Date(updatedAt).toLocaleTimeString());

  return {
    readyLines: [
      "Draft ready: yes",
      `Category: ${params.draftReadyPayload.category.newCategory}`,
      `Store ID: ${params.draftReadyPayload.store.storeId ?? "none"}`,
      `Booking time: ${params.draftReadyPayload.schedule.bookingTime ?? "none"}`,
      `Service ID: ${params.draftReadyPayload.service.primaryServiceId ?? "none"}`,
      `Customer: ${params.draftReadyPayload.customer.name} / ${params.draftReadyPayload.customer.phone}`,
      `Images: current ${params.draftReadyPayload.images.currentStateCount}, desired ${params.draftReadyPayload.images.desiredStyleCount}`,
      `Last updated: ${params.updatedAt ? formatUpdatedAt(params.updatedAt) : "none"}`,
    ],
    waitingLine: null,
  };
}

export type HomeBookingSkeletonDebugPanelSectionKey =
  | "draft-ready"
  | "upload"
  | "submit-preparation"
  | "submit-attempt";

export type HomeBookingSkeletonDebugPanelSection = {
  key: HomeBookingSkeletonDebugPanelSectionKey;
  lines: HomeBookingDebugDisplayLines;
};

export type HomeBookingSkeletonDebugPanelDisplay = {
  title: string;
  sections: HomeBookingSkeletonDebugPanelSection[];
};

type HomeBookingSkeletonDebugPanelSectionInternal = {
  key: "draft-ready" | "upload" | "submit-preparation" | "submit-attempt";
  lines: HomeBookingDebugDisplayLines;
};

export type HomeBookingSkeletonDebugPanelDisplayInput = {
  draftReadyPayload?: LegacyBookingDraftFromSkeleton | null;
  draftState?: HomeBookingDraftDebugState | null;
  updatedAt?: string | null;
  uploadedImageUrlsOverride?: string[];
  submitUiState?: LegacySubmitUiState | null;
  submitStatusCopy?: LegacySubmitStatusCopy | null;
  submitAttemptState?: {
    status: "idle" | "submitting" | "submitted" | "submit-error";
    message: string | null;
    errorSummary: string | null;
    updatedAt: string;
  } | null;
  formatUpdatedAt?: (updatedAt: string) => string;
};

export function buildHomeBookingSkeletonDebugPanelDisplay(
  params: HomeBookingSkeletonDebugPanelDisplayInput,
): HomeBookingSkeletonDebugPanelDisplay {
  const draftReadyDisplay = buildHomeBookingDraftReadyDebugDisplay({
    draftReadyPayload: params.draftReadyPayload,
    updatedAt: params.updatedAt,
    formatUpdatedAt: params.formatUpdatedAt,
  });
  const submitDebugDisplay = buildHomeBookingSubmitDebugDisplay({
    submitUiState: params.submitUiState,
    submitStatusCopy: params.submitStatusCopy,
    submitAttemptState: params.submitAttemptState,
    formatUpdatedAt: params.formatUpdatedAt,
  });
  const uploadDebugDisplay = params.draftState
    ? buildHomeBookingUploadDebugDisplay({
        draftState: params.draftState,
        uploadedImageUrlsOverride: params.uploadedImageUrlsOverride,
        })
      : null;

  const sections: HomeBookingSkeletonDebugPanelSectionInternal[] = [];
  const draftReadyLines: HomeBookingDebugDisplayLines =
    draftReadyDisplay.readyLines.length > 0
      ? draftReadyDisplay.readyLines
      : draftReadyDisplay.waitingLine
        ? [draftReadyDisplay.waitingLine]
        : [];

  if (draftReadyLines.length > 0) {
    sections.push({
      key: "draft-ready",
      lines: draftReadyLines,
    });
  }

  if (uploadDebugDisplay) {
    sections.push({
      key: "upload",
      lines: [
        uploadDebugDisplay.rawUploadedRefsLine,
        uploadDebugDisplay.stateDerivedUploadedUrlsLine,
        uploadDebugDisplay.pageOverrideUploadedUrlsLine,
        uploadDebugDisplay.submitChainSourceLine,
      ],
    });
  }

  if (submitDebugDisplay.preparationLines.length > 0) {
    sections.push({
      key: "submit-preparation",
      lines: submitDebugDisplay.preparationLines,
    });
  }

  if (submitDebugDisplay.attemptLines.length > 0) {
    sections.push({
      key: "submit-attempt",
      lines: submitDebugDisplay.attemptLines,
    });
  }

  return {
    title: "Debug only: Draft-ready payload (Not submitted)",
    sections,
  };
}

export function buildHomeBookingDraftDebugState(input: {
  draftCandidate: LegacyBookingDraftFromSkeleton | null;
  draftStateUploadedImageResults?: HomeBookingDraftDebugState["draftStateUploadedImageResults"];
  draftStateUploadedImageUrls?: string[];
}): HomeBookingDraftDebugState {
  const uploadedImageResults =
    input.draftStateUploadedImageResults ?? createEmptyDraftDebugUploadedImageResultState();

  return {
    draftCandidate: input.draftCandidate,
    draftStateUploadedImageResults: {
      currentStateImages: [...uploadedImageResults.currentStateImages],
      desiredStyleImages: [...uploadedImageResults.desiredStyleImages],
    },
    draftStateUploadedImageUrls: normalizeUploadedImageUrls(input.draftStateUploadedImageUrls),
  };
}

export function buildHomeBookingDraftReadyEvent(
  input: HomeBookingDraftReadyResolverInput,
): HomeBookingDraftReadyEvent {
  const resolvedMode = resolveHomeBookingMode({
    mode: input.mode,
    enableSkeletonMode: input.enableSkeletonMode,
  });

  if (resolvedMode !== "skeleton" || !input.draftInput) {
    return {
      shouldEmit: false,
      payload: null,
    };
  }

  const payload = buildHomeBookingLegacyDraftFromSkeletonState(input.draftInput);

  if (!payload) {
    return {
      shouldEmit: false,
      payload: null,
    };
  }

  return {
    shouldEmit: true,
    payload,
  };
}

function normalizeRequiredText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function isDraftReadyEligibleStep(step: HomeBookingDraftReadyTimingInput["currentStep"]): boolean {
  return step === "customer-details" || step === "confirmation";
}

export function resolveHomeBookingDraftReadyTiming(
  input: HomeBookingDraftReadyTimingInput,
): HomeBookingDraftReadyTimingResult {
  if (input.resolvedMode !== "skeleton") {
    return {
      isReadyToEmit: false,
      shouldEmit: false,
      signature: null,
      reason: "mode-not-skeleton",
    };
  }

  if (input.enableSkeletonMode !== true) {
    return {
      isReadyToEmit: false,
      shouldEmit: false,
      signature: null,
      reason: "skeleton-disabled",
    };
  }

  if (!isDraftReadyEligibleStep(input.currentStep)) {
    return {
      isReadyToEmit: false,
      shouldEmit: false,
      signature: null,
      reason: "step-not-eligible",
    };
  }

  const selectedServiceId = normalizeRequiredText(input.selectedServiceId);
  const selectedDate = normalizeRequiredText(input.selectedDate);
  const customerName = normalizeRequiredText(input.customerName);
  const customerContact = normalizeRequiredText(input.customerContact);

  if (!selectedServiceId || !selectedDate || !customerName || !customerContact) {
    return {
      isReadyToEmit: false,
      shouldEmit: false,
      signature: null,
      reason: "missing-required-fields",
    };
  }

  const signature = [
    input.currentStep,
    selectedServiceId,
    selectedDate,
    customerName,
    customerContact,
  ].join("|");

  const isDuplicate = input.previousEmittedSignature === signature;

  return {
    isReadyToEmit: true,
    shouldEmit: !isDuplicate,
    signature,
    reason: isDuplicate ? "duplicate-state" : "ready",
  };
}

export function resolveHomeBookingDraftReadyEmission(
  input: HomeBookingDraftReadyEmissionInput,
): HomeBookingDraftReadyEmissionResult {
  const timing = resolveHomeBookingDraftReadyTiming(input.timingInput);

  // Final emit is always gated by timing first.
  if (!timing.shouldEmit) {
    return {
      shouldEmit: false,
      reason: timing.reason,
      signature: timing.signature,
      payload: null,
    };
  }

  const event = buildHomeBookingDraftReadyEvent({
    mode: input.timingInput.resolvedMode,
    enableSkeletonMode: input.timingInput.enableSkeletonMode,
    draftInput: input.draftInput,
  });

  if (!event.shouldEmit || !event.payload) {
    return {
      shouldEmit: false,
      reason: "payload-unavailable",
      signature: timing.signature,
      payload: null,
    };
  }

  return {
    shouldEmit: true,
    reason: timing.reason,
    signature: timing.signature,
    payload: event.payload,
  };
}

function buildHomeBookingDraftSequenceSignature(
  payload: LegacyBookingDraftFromSkeleton | null,
): string | null {
  if (!payload) {
    return null;
  }

  // Sequence signature intentionally excludes request note to avoid noisy re-emits on minor text edits.
  return [
    payload.category.legacyCategory,
    payload.service.primaryServiceId ?? "",
    payload.schedule.bookingDate ?? "",
    payload.customer.name.trim(),
    payload.customer.phone.trim(),
  ].join("|");
}

export function resolveHomeBookingDraftReadySequence(
  input: HomeBookingDraftReadySequenceInput,
): HomeBookingDraftReadySequenceResult {
  const emission = resolveHomeBookingDraftReadyEmission({
    timingInput: {
      ...input.timingInput,
      previousEmittedSignature: null,
    },
    draftInput: input.draftInput,
  });

  const previousSignature = input.previousSnapshot?.lastEmittedSignature ?? null;
  const sequenceSignature = buildHomeBookingDraftSequenceSignature(emission.payload);
  const isDuplicateSequence =
    emission.shouldEmit && sequenceSignature !== null && sequenceSignature === previousSignature;

  if (isDuplicateSequence) {
    return {
      shouldEmit: false,
      reason: "duplicate-state",
      signature: sequenceSignature,
      payload: null,
      nextSnapshot: {
        lastEmittedSignature: previousSignature,
      },
    };
  }

  if (!emission.shouldEmit || !sequenceSignature) {
    return {
      shouldEmit: false,
      reason: emission.reason,
      signature: sequenceSignature,
      payload: null,
      nextSnapshot: {
        lastEmittedSignature: previousSignature,
      },
    };
  }

  return {
    shouldEmit: true,
    reason: emission.reason,
    signature: sequenceSignature,
    payload: emission.payload,
    nextSnapshot: {
      lastEmittedSignature: sequenceSignature,
    },
  };
}
