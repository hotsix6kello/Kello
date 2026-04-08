import type { BeautyBookingPayload } from "@/app/explore/beautyBooking";
import type {
  LegacySubmitInvocationPlan,
  LegacySubmitInvocationReason,
} from "@/lib/bookings/bookingFlowSkeleton/submitInvocation";
import type { LegacySubmitAdapterBlocker } from "@/lib/bookings/bookingFlowSkeleton/submitAdapter";

export type LegacySubmitOrchestrationStatus = "ready-to-submit" | "blocked" | "invalid-plan";
export type LegacySubmitOrchestrationNextAction = "submit-ready" | "show-blockers" | "none";

export type LegacySubmitOrchestrationPlan = {
  status: LegacySubmitOrchestrationStatus;
  shouldAttemptSubmit: boolean;
  nextAction: LegacySubmitOrchestrationNextAction;
  reason: LegacySubmitInvocationReason;
  displayBlockers: LegacySubmitAdapterBlocker[];
  payloadCandidate: BeautyBookingPayload | null;
};

export function resolveLegacySubmitOrchestration(
  invocationPlan: LegacySubmitInvocationPlan,
): LegacySubmitOrchestrationPlan {
  const displayBlockers = [...invocationPlan.blockers];

  if (invocationPlan.reason === "missing-payload-candidate") {
    return {
      status: "invalid-plan",
      shouldAttemptSubmit: false,
      nextAction: "none",
      reason: invocationPlan.reason,
      displayBlockers,
      payloadCandidate: null,
    };
  }

  if (!invocationPlan.canInvokeSubmit) {
    return {
      status: "blocked",
      shouldAttemptSubmit: false,
      nextAction: "show-blockers",
      reason: invocationPlan.reason,
      displayBlockers,
      payloadCandidate: invocationPlan.payloadCandidate,
    };
  }

  return {
    status: "ready-to-submit",
    shouldAttemptSubmit: true,
    nextAction: "submit-ready",
    reason: invocationPlan.reason,
    displayBlockers,
    payloadCandidate: invocationPlan.payloadCandidate,
  };
}
