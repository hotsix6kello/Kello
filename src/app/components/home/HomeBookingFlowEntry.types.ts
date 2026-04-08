import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import type {
  BookingFlowState,
  BookingUploadedImageResultState,
} from "@/lib/bookings/bookingFlowSkeleton/types";
import type {
  BookingImageUploadBridgeItem,
  BookingUploadedImageResultCompletion,
} from "@/lib/bookings/bookingFlowSkeleton/uploadedImageResults";
import type {
  LegacyBookingDraftFromSkeleton,
} from "@/lib/bookings/bookingFlowSkeleton/bridge";
import type { LegacySubmitPreparationResult } from "@/lib/bookings/bookingFlowSkeleton/submitRunner";
import type { BeautyCategoryId } from "./constants";

export type HomeBookingFlowMode = "legacy" | "skeleton";
export type SkeletonSubmitAttemptStatus = "idle" | "submitting" | "submitted" | "submit-error";

export type HomeBookingStoreContext = {
  storeId: string | null;
  storeName?: string | null;
  region?: string | null;
};

export type HomeBookingDeepLinkContext = {
  source?: "home" | "explore" | "direct";
  storeIdFromQuery?: string | null;
  businessNameFromQuery?: string | null;
};

export type HomeBookingLegacyDraftBuildInput = {
  state: BookingFlowState;
  storeContext?: Partial<HomeBookingStoreContext>;
  primaryServiceName?: string | null;
  agreements?: {
    bookingConfirmed?: boolean;
    privacyConsent?: boolean;
  };
};

export type HomeBookingDraftReadyResolverInput = {
  mode?: HomeBookingFlowMode;
  enableSkeletonMode?: boolean;
  draftInput?: HomeBookingLegacyDraftBuildInput | null;
};

export type HomeBookingDraftReadyEvent = {
  shouldEmit: boolean;
  payload: LegacyBookingDraftFromSkeleton | null;
};

export type HomeBookingDraftReadyTimingReason =
  | "mode-not-skeleton"
  | "skeleton-disabled"
  | "step-not-eligible"
  | "missing-required-fields"
  | "duplicate-state"
  | "ready";

export type HomeBookingDraftReadyTimingInput = {
  resolvedMode: HomeBookingFlowMode;
  enableSkeletonMode?: boolean;
  currentStep: BookingFlowState["currentStep"];
  selectedServiceId: string | null;
  selectedDate: string | null;
  customerName: string;
  customerContact: string;
  previousEmittedSignature?: string | null;
};

export type HomeBookingDraftReadyTimingResult = {
  isReadyToEmit: boolean;
  shouldEmit: boolean;
  signature: string | null;
  reason: HomeBookingDraftReadyTimingReason;
};

export type HomeBookingDraftReadyEmissionInput = {
  timingInput: HomeBookingDraftReadyTimingInput;
  draftInput?: HomeBookingLegacyDraftBuildInput | null;
};

export type HomeBookingDraftReadyEmissionReason =
  | HomeBookingDraftReadyTimingReason
  | "payload-unavailable";

export type HomeBookingDraftReadyEmissionResult = {
  shouldEmit: boolean;
  reason: HomeBookingDraftReadyEmissionReason;
  signature: string | null;
  payload: LegacyBookingDraftFromSkeleton | null;
};

export type HomeBookingDraftReadySequenceSnapshot = {
  lastEmittedSignature: string | null;
};

export type HomeBookingDraftReadySequenceInput = {
  previousSnapshot?: HomeBookingDraftReadySequenceSnapshot | null;
  timingInput: HomeBookingDraftReadyTimingInput;
  draftInput?: HomeBookingLegacyDraftBuildInput | null;
};

export type HomeBookingDraftReadySequenceResult = {
  shouldEmit: boolean;
  reason: HomeBookingDraftReadyEmissionReason;
  signature: string | null;
  payload: LegacyBookingDraftFromSkeleton | null;
  nextSnapshot: HomeBookingDraftReadySequenceSnapshot;
};

export type HomeBookingDraftDebugState = {
  draftCandidate: LegacyBookingDraftFromSkeleton | null;
  draftStateUploadedImageResults: BookingUploadedImageResultState;
  draftStateUploadedImageUrls: string[];
};

export type HomeBookingFlowEntryProps = {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: BeautyCategoryId | "all" | null;
  t: TFunction;
  mode?: HomeBookingFlowMode;
  // Keep default false until runtime rollout is explicitly started.
  enableSkeletonMode?: boolean;
  storeContext?: Partial<HomeBookingStoreContext>;
  deepLinkContext?: HomeBookingDeepLinkContext;
  // Future submit adapter entry point (draft only, no network call in this layer).
  onDraftReady?: (draft: LegacyBookingDraftFromSkeleton | null) => void;
  // Debug/read-only snapshot from skeleton draftStateChange. Raw uploaded refs stay distinct from submit override seams.
  onDraftDebugStateChange?: (state: HomeBookingDraftDebugState) => void;
  // Submit runner output for debug/read-only consumers (no network side effects).
  onSubmitPreparationChange?: (result: LegacySubmitPreparationResult) => void;
  // Optional override seam for debug/mock upload refs. When omitted, skeleton state-derived refs are used.
  uploadedImageUrls?: string[];
  // Future upload-complete seam: writes one completed image result back into step3 local state.
  completedImageUploadResult?: BookingUploadedImageResultCompletion | null;
  // Submit attempt summary for debug/read-only consumers in skeleton mode.
  onSubmitAttemptStateChange?: (state: {
    status: SkeletonSubmitAttemptStatus;
    message: string | null;
    errorSummary: string | null;
  }) => void;
  // Debug display node is rendered inside the skeleton modal shell so it never leaks into the home body flow.
  skeletonDebugPanel?: ReactNode;
  onResolvedMode?: (mode: HomeBookingFlowMode) => void;
};
