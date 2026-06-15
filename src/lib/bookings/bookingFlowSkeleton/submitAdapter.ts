import type { BeautyBookingPayload } from "@/app/explore/beautyBooking";
import type { LegacyBookingDraftFromSkeleton } from "@/lib/bookings/bookingFlowSkeleton/bridge";
import { resolveLegacySubmitImageReadiness } from "./imageSubmitContract.ts";

export const LEGACY_SUBMIT_ADAPTER_BLOCKERS = {
  draftMissing: "draft-missing",
  missingStoreId: "missing-store-id",
  missingStoreName: "missing-store-name",
  missingRegion: "missing-region",
  missingBookingDate: "missing-booking-date",
  missingBookingTime: "missing-booking-time",
  bookingTimePlaceholder: "booking-time-placeholder",
  missingPrimaryServiceId: "missing-primary-service-id",
  missingCustomerName: "missing-customer-name",
  missingCustomerPhone: "missing-customer-phone",
  bookingConfirmedRequired: "booking-confirmed-required",
  privacyConsentRequired: "privacy-consent-required",
  missingUploadedImageUrls: "missing-uploaded-image-urls",
  payloadEssentialFieldMissing: "payload-essential-field-missing",
} as const;

export type LegacySubmitAdapterBlocker =
  (typeof LEGACY_SUBMIT_ADAPTER_BLOCKERS)[keyof typeof LEGACY_SUBMIT_ADAPTER_BLOCKERS];

export type BuildLegacySubmitPayloadCandidateInput = {
  draft: LegacyBookingDraftFromSkeleton | null;
  uploadedImageUrls?: string[];
  communication?: {
    language?: string;
    intent?: string;
    koreanMessage?: string;
    localizedMessage?: string;
  };
};

export type LegacySubmitReadinessResult = {
  status: "ready" | "blocked";
  ready: boolean;
  blockers: LegacySubmitAdapterBlocker[];
};

export type LegacySubmitPayloadCandidateResult = LegacySubmitReadinessResult & {
  payloadCandidate: BeautyBookingPayload | null;
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function hasRequiredText(value: string | null | undefined): boolean {
  return normalizeText(value).length > 0;
}

function normalizeUploadedImageUrls(value: string[] | undefined): string[] {
  if (!value || value.length === 0) {
    return [];
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function hasEssentialPayloadFields(payload: BeautyBookingPayload): boolean {
  return (
    hasRequiredText(payload.beautyCategory) &&
    hasRequiredText(payload.region) &&
    hasRequiredText(payload.storeId) &&
    hasRequiredText(payload.storeName) &&
    hasRequiredText(payload.bookingDate) &&
    hasRequiredText(payload.bookingTime) &&
    hasRequiredText(payload.customer.name) &&
    hasRequiredText(payload.customer.phone)
  );
}

function buildPayloadCandidate(
  input: BuildLegacySubmitPayloadCandidateInput,
): BeautyBookingPayload | null {
  const { draft } = input;

  if (!draft) {
    return null;
  }

  const uploadedImageUrls = normalizeUploadedImageUrls(input.uploadedImageUrls);
  const normalizedRequest = draft.customer.request.trim();

  const payload: BeautyBookingPayload = {
    category: "beauty",
    beautyCategory: draft.category.legacyCategory,
    region: normalizeText(draft.store.region),
    storeId: normalizeText(draft.store.storeId),
    storeName: normalizeText(draft.store.storeName),
    storeSource: draft.store.storeSource === 'partner' ? 'partner' : 'google',
    bookingDate: normalizeText(draft.schedule.bookingDate),
    bookingTime: normalizeText(draft.schedule.bookingTime),
    designerId: null,
    designerName: null,
    primaryServiceId: draft.service.primaryServiceId,
    primaryServiceName: draft.service.primaryServiceName,
    addOnIds: [],
    addOnNames: [],
    priceSummary: draft.priceSummary,
    customer: {
      name: draft.customer.name.trim(),
      phone: draft.customer.phone.trim(),
      request: normalizedRequest,
      // Submit adapter only consumes uploaded URLs; raw file metadata stays in skeleton draft.
      imageUrls: uploadedImageUrls,
    },
    communication: {
      language: input.communication?.language?.trim() || "ko",
      intent: input.communication?.intent?.trim() || "booking-request",
      messages: {
        korean: input.communication?.koreanMessage?.trim() || normalizedRequest,
        localized: input.communication?.localizedMessage?.trim() || normalizedRequest,
      },
    },
    agreements: {
      serviceTermsAgreed: draft.agreements.serviceTermsAgreed,
      privacyPolicyAgreed: draft.agreements.privacyPolicyAgreed,
      thirdPartySharingAgreed: draft.agreements.thirdPartySharingAgreed,
      marketingConsentAgreed: draft.agreements.marketingConsentAgreed,
      refundPolicyAgreed: draft.agreements.refundPolicyAgreed,
      refundPolicyAgreedAt: draft.agreements.refundPolicyAgreedAt,
    },
    createdFrom: {
      flow: "beauty-explore",
    },
  };

  return hasEssentialPayloadFields(payload) ? payload : null;
}

function collectSubmitBlockers(
  input: BuildLegacySubmitPayloadCandidateInput,
  payloadCandidate: BeautyBookingPayload | null,
): LegacySubmitAdapterBlocker[] {
  const { draft } = input;
  const blockers = new Set<LegacySubmitAdapterBlocker>();

  if (!draft) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.draftMissing);
    return Array.from(blockers);
  }

  const imageReadiness = resolveLegacySubmitImageReadiness({
    draft,
    uploadedImageUrls: input.uploadedImageUrls,
  });

  if (draft.unresolved.missingStoreId || !hasRequiredText(draft.store.storeId)) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId);
  }

  if (!hasRequiredText(draft.store.storeName)) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreName);
  }

  if (!hasRequiredText(draft.store.region)) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingRegion);
  }

  if (draft.unresolved.missingBookingDate || !hasRequiredText(draft.schedule.bookingDate)) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingBookingDate);
  }

  if (!hasRequiredText(draft.schedule.bookingTime)) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingBookingTime);
  }

  // Skeleton flow does not have a separate time picker; placeholder time is acceptable for submission.

  if (!hasRequiredText(draft.service.primaryServiceId)) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingPrimaryServiceId);
  }

  if (!hasRequiredText(draft.customer.name)) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingCustomerName);
  }

  if (!hasRequiredText(draft.customer.phone)) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingCustomerPhone);
  }

  if (draft.agreements.serviceTermsAgreed !== true) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingConfirmedRequired);
  }

  if (draft.agreements.privacyPolicyAgreed !== true || draft.agreements.thirdPartySharingAgreed !== true) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.privacyConsentRequired);
  }

  if (imageReadiness.shouldBlockSubmitUntilUpload) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingUploadedImageUrls);
  }

  if (!payloadCandidate) {
    blockers.add(LEGACY_SUBMIT_ADAPTER_BLOCKERS.payloadEssentialFieldMissing);
  }

  return Array.from(blockers);
}

export function canSubmitLegacyBookingDraft(
  input: BuildLegacySubmitPayloadCandidateInput,
): LegacySubmitReadinessResult {
  const payloadCandidate = buildPayloadCandidate(input);
  const blockers = collectSubmitBlockers(input, payloadCandidate);
  const ready = blockers.length === 0;

  return {
    status: ready ? "ready" : "blocked",
    ready,
    blockers,
  };
}

export function buildLegacySubmitPayloadCandidate(
  input: BuildLegacySubmitPayloadCandidateInput,
): LegacySubmitPayloadCandidateResult {
  const payloadCandidate = buildPayloadCandidate(input);
  const readiness = canSubmitLegacyBookingDraft(input);

  return {
    ...readiness,
    payloadCandidate,
  };
}
