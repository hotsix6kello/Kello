import type { BeautyBookingPayload } from "@/app/explore/beautyBooking";
import type { LegacySubmitAdapterBlocker } from "@/lib/bookings/bookingFlowSkeleton/submitAdapter";
import type {
  LegacySubmitOrchestrationPlan,
  LegacySubmitOrchestrationStatus,
} from "@/lib/bookings/bookingFlowSkeleton/submitOrchestrator";

export type LegacySubmitUiStateKind = "submit-ready" | "show-blockers" | "invalid-plan" | "idle";

export type LegacySubmitUiState = {
  uiState: LegacySubmitUiStateKind;
  primaryMessage: string;
  blockers: LegacySubmitAdapterBlocker[];
  canSubmit: boolean;
  hasPayload: boolean;
  payloadPreview: BeautyBookingPayload | null;
  sourceStatus: LegacySubmitOrchestrationStatus | "none";
};

export function resolveLegacySubmitUiState(
  plan: LegacySubmitOrchestrationPlan | null | undefined,
): LegacySubmitUiState {
  if (!plan) {
    return {
      uiState: "idle",
      primaryMessage: "Submit plan is not available yet.",
      blockers: [],
      canSubmit: false,
      hasPayload: false,
      payloadPreview: null,
      sourceStatus: "none",
    };
  }

  if (plan.status === "invalid-plan") {
    return {
      uiState: "invalid-plan",
      primaryMessage: "Submit plan is invalid and cannot be invoked.",
      blockers: [...plan.displayBlockers],
      canSubmit: false,
      hasPayload: false,
      payloadPreview: null,
      sourceStatus: plan.status,
    };
  }

  if (plan.status === "blocked") {
    return {
      uiState: "show-blockers",
      primaryMessage: "Resolve blockers before submit.",
      blockers: [...plan.displayBlockers],
      canSubmit: false,
      hasPayload: plan.payloadCandidate !== null,
      payloadPreview: plan.payloadCandidate,
      sourceStatus: plan.status,
    };
  }

  return {
    uiState: "submit-ready",
    primaryMessage: "Submit is ready.",
    blockers: [...plan.displayBlockers],
    canSubmit: plan.shouldAttemptSubmit,
    hasPayload: plan.payloadCandidate !== null,
    payloadPreview: plan.payloadCandidate,
    sourceStatus: plan.status,
  };
}
