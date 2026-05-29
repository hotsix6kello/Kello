import type { BeautyBookingPayload } from "@/app/explore/beautyBooking";
import type {
  LegacySubmitAdapterBlocker,
  LegacySubmitPayloadCandidateResult,
} from "@/lib/bookings/bookingFlowSkeleton/submitAdapter";

export type LegacySubmitInvocationReason = "ready" | "blocked" | "missing-payload-candidate";

export type LegacySubmitInvocationPlan = {
  canInvokeSubmit: boolean;
  reason: LegacySubmitInvocationReason;
  blockers: LegacySubmitAdapterBlocker[];
  payloadCandidate: BeautyBookingPayload | null;
};

export function resolveLegacySubmitInvocationPlan(
  result: LegacySubmitPayloadCandidateResult,
): LegacySubmitInvocationPlan {
  const blockers = [...result.blockers];
  const isBlocked = result.status === "blocked" || result.ready !== true || blockers.length > 0;

  if (isBlocked) {
    return {
      canInvokeSubmit: false,
      reason: "blocked",
      blockers,
      payloadCandidate: result.payloadCandidate,
    };
  }

  if (!result.payloadCandidate) {
    return {
      canInvokeSubmit: false,
      reason: "missing-payload-candidate",
      blockers,
      payloadCandidate: null,
    };
  }

  return {
    canInvokeSubmit: true,
    reason: "ready",
    blockers,
    payloadCandidate: result.payloadCandidate,
  };
}
