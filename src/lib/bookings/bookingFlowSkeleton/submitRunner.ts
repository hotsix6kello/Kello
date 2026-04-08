import type { BeautyBookingPayload } from "@/app/explore/beautyBooking";
import {
  buildLegacySubmitPayloadCandidate,
  type BuildLegacySubmitPayloadCandidateInput,
  type LegacySubmitAdapterBlocker,
  type LegacySubmitPayloadCandidateResult,
} from "./submitAdapter.ts";
import {
  resolveLegacySubmitInvocationPlan,
  type LegacySubmitInvocationPlan,
} from "./submitInvocation.ts";
import {
  resolveLegacySubmitOrchestration,
  type LegacySubmitOrchestrationPlan,
  type LegacySubmitOrchestrationStatus,
} from "./submitOrchestrator.ts";
import {
  resolveLegacySubmitUiState,
  type LegacySubmitUiState,
} from "./submitUiState.ts";

export type RunLegacySubmitPreparationInput = BuildLegacySubmitPayloadCandidateInput & {
  /**
   * Optional test/debug hook to validate defensive branches (e.g. ready + null payload).
   * Runtime submit wiring should omit this field and use the normal adapter result.
   */
  adapterResultOverride?: LegacySubmitPayloadCandidateResult;
};

export type LegacySubmitPreparationResult = {
  adapterResult: LegacySubmitPayloadCandidateResult;
  invocationPlan: LegacySubmitInvocationPlan;
  orchestrationPlan: LegacySubmitOrchestrationPlan;
  uiState: LegacySubmitUiState;
  canAttemptSubmit: boolean;
  status: LegacySubmitOrchestrationStatus;
  blockers: LegacySubmitAdapterBlocker[];
  payloadCandidate: BeautyBookingPayload | null;
};

export function runLegacySubmitPreparation(
  input: RunLegacySubmitPreparationInput,
): LegacySubmitPreparationResult {
  const adapterResult =
    input.adapterResultOverride ??
    buildLegacySubmitPayloadCandidate({
      draft: input.draft,
      uploadedImageUrls: input.uploadedImageUrls,
      communication: input.communication,
    });

  const invocationPlan = resolveLegacySubmitInvocationPlan(adapterResult);
  const orchestrationPlan = resolveLegacySubmitOrchestration(invocationPlan);
  const uiState = resolveLegacySubmitUiState(orchestrationPlan);

  const canAttemptSubmit =
    invocationPlan.canInvokeSubmit &&
    orchestrationPlan.shouldAttemptSubmit &&
    orchestrationPlan.status === "ready-to-submit" &&
    uiState.canSubmit;

  return {
    adapterResult,
    invocationPlan,
    orchestrationPlan,
    uiState,
    canAttemptSubmit,
    status: orchestrationPlan.status,
    blockers: [...invocationPlan.blockers],
    payloadCandidate: invocationPlan.payloadCandidate,
  };
}
