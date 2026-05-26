import {
  LEGACY_SUBMIT_ADAPTER_BLOCKERS,
  type LegacySubmitAdapterBlocker,
} from "./submitAdapter.ts";
import type { LegacySubmitUiState } from "./submitUiState.ts";

export type LegacySubmitStatusCopyTone = "info" | "warning" | "success" | "danger";

export type LegacySubmitStatusCopy = {
  title: string;
  message: string;
  tone: LegacySubmitStatusCopyTone;
  blockerSummary: string | null;
  isUserFacingSafe: boolean;
};

const BLOCKER_LABELS: Record<LegacySubmitAdapterBlocker, string> = {
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.draftMissing]: "Draft payload is missing",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId]: "Store ID is missing",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreName]: "Store name is missing",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingRegion]: "Region is missing",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingBookingDate]: "Booking date is missing",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingBookingTime]: "Booking time is missing",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingTimePlaceholder]: "Booking time is still placeholder",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingPrimaryServiceId]: "Primary service is missing",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingCustomerName]: "Customer name is missing",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingCustomerPhone]: "Customer phone is missing",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingConfirmedRequired]: "Booking confirmation is required",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.privacyConsentRequired]: "Privacy consent is required",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls]: "Uploaded image URLs are missing",
  [LEGACY_SUBMIT_ADAPTER_BLOCKERS.payloadEssentialFieldMissing]: "Essential payload fields are missing",
};

const MAX_BLOCKER_SUMMARY_ITEMS = 2;

function summarizeBlockers(blockers: LegacySubmitAdapterBlocker[]): string | null {
  if (blockers.length === 0) {
    return null;
  }

  const labels = blockers.map((blocker) => BLOCKER_LABELS[blocker] ?? blocker);
  const visible = labels.slice(0, MAX_BLOCKER_SUMMARY_ITEMS);
  const remaining = labels.length - visible.length;

  if (remaining <= 0) {
    return visible.join(", ");
  }

  return `${visible.join(", ")} +${remaining} more`;
}

export function resolveLegacySubmitStatusCopy(
  uiState: LegacySubmitUiState | null | undefined,
): LegacySubmitStatusCopy {
  if (!uiState || uiState.uiState === "idle") {
    return {
      title: "Submit preparation pending",
      message: "Complete required inputs to prepare a submit plan.",
      tone: "info",
      blockerSummary: null,
      isUserFacingSafe: true,
    };
  }

  if (uiState.uiState === "submit-ready") {
    return {
      title: "Submit ready (preview)",
      message: "Validation passed. This does not mean the request was submitted.",
      tone: "success",
      blockerSummary: summarizeBlockers(uiState.blockers),
      isUserFacingSafe: true,
    };
  }

  if (uiState.uiState === "show-blockers") {
    return {
      title: "Submit blocked",
      message: "Resolve blockers before attempting submit.",
      tone: "warning",
      blockerSummary: summarizeBlockers(uiState.blockers),
      isUserFacingSafe: true,
    };
  }

  return {
    title: "Submit plan invalid",
    message: "Submit cannot be attempted because payload candidate is unavailable.",
    tone: "danger",
    blockerSummary: summarizeBlockers(uiState.blockers),
    isUserFacingSafe: true,
  };
}
