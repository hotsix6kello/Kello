import type {
  BookingConfirmationState,
  BookingCustomerDetailsState,
  BookingFlowCategory,
  BookingFlowState,
  BookingImageKind,
  BookingImageGroupStateKey,
  LegacyBeautyCategoryId,
} from "@/lib/bookings/bookingFlowSkeleton/types";

export const BOOKING_FLOW_NEW_TO_LEGACY_CATEGORY_MAP: Record<
  BookingFlowCategory,
  LegacyBeautyCategoryId
> = {
  hair: "hair",
  nail: "nail",
  aesthetic: "esthetic",
  eyelash: "lash",
  makeup: "makeup",
  waxing: "waxing",
};

export const BOOKING_FLOW_LEGACY_TO_NEW_CATEGORY_MAP: Record<
  LegacyBeautyCategoryId,
  BookingFlowCategory
> = {
  hair: "hair",
  nail: "nail",
  esthetic: "aesthetic",
  lash: "eyelash",
  makeup: "makeup",
  waxing: "waxing",
};

export function mapNewCategoryToLegacyCategory(category: BookingFlowCategory): LegacyBeautyCategoryId {
  return BOOKING_FLOW_NEW_TO_LEGACY_CATEGORY_MAP[category];
}

export function mapLegacyCategoryToNewCategory(category: LegacyBeautyCategoryId): BookingFlowCategory {
  return BOOKING_FLOW_LEGACY_TO_NEW_CATEGORY_MAP[category];
}

export const BOOKING_FLOW_LEGACY_TIME_POLICY = {
  strategy: "fixed-placeholder",
  placeholderTime: "10:00",
} as const;

export type BookingFlowLegacyTimePolicy = typeof BOOKING_FLOW_LEGACY_TIME_POLICY;

export type LegacyBookingTimeDraft = {
  bookingDate: string | null;
  bookingTime: string | null;
  usesPlaceholderTime: boolean;
  strategy: BookingFlowLegacyTimePolicy["strategy"];
  unresolvedReason: "missing-booking-date" | null;
};

export function buildLegacyBookingTimeDraft(
  selectedDate: string | null,
  selectedTime: string | null = null,
  options?: {
    placeholderTime?: string;
  },
): LegacyBookingTimeDraft {
  if (!selectedDate) {
    return {
      bookingDate: null,
      bookingTime: null,
      usesPlaceholderTime: false,
      strategy: BOOKING_FLOW_LEGACY_TIME_POLICY.strategy,
      unresolvedReason: "missing-booking-date",
    };
  }

  const normalizedSelectedTime = selectedTime?.trim() ?? "";
  if (normalizedSelectedTime) {
    return {
      bookingDate: selectedDate,
      bookingTime: normalizedSelectedTime,
      usesPlaceholderTime: false,
      strategy: BOOKING_FLOW_LEGACY_TIME_POLICY.strategy,
      unresolvedReason: null,
    };
  }

  return {
    bookingDate: selectedDate,
    bookingTime: options?.placeholderTime ?? BOOKING_FLOW_LEGACY_TIME_POLICY.placeholderTime,
    usesPlaceholderTime: true,
    strategy: BOOKING_FLOW_LEGACY_TIME_POLICY.strategy,
    unresolvedReason: null,
  };
}

export type FlattenedSkeletonImageDraft = {
  id: string;
  sourceGroup: BookingImageGroupStateKey;
  sourceKind: BookingImageKind;
  fileName: string;
  fileSize: number;
  mimeType: string;
  flatIndex: number;
  groupIndex: number;
};

export function flattenSkeletonImageDrafts(
  details: Pick<BookingCustomerDetailsState, "currentStateImages" | "desiredStyleImages">,
): FlattenedSkeletonImageDraft[] {
  const currentGroup = details.currentStateImages.map((item, groupIndex) => ({
    id: item.id,
    sourceGroup: "currentStateImages" as const,
    sourceKind: item.kind,
    fileName: item.fileName,
    fileSize: item.fileSize,
    mimeType: item.mimeType,
    groupIndex,
  }));

  const desiredGroup = details.desiredStyleImages.map((item, groupIndex) => ({
    id: item.id,
    sourceGroup: "desiredStyleImages" as const,
    sourceKind: item.kind,
    fileName: item.fileName,
    fileSize: item.fileSize,
    mimeType: item.mimeType,
    groupIndex,
  }));

  // Flatten rule: current-state images first, then desired-style images.
  return [...currentGroup, ...desiredGroup].map((item, flatIndex) => ({
    ...item,
    flatIndex,
  }));
}

export type LegacyDraftAgreements = {
  serviceTermsAgreed: boolean;
  privacyPolicyAgreed: boolean;
  thirdPartySharingAgreed: boolean;
  marketingConsentAgreed: boolean;
  refundPolicyAgreed: boolean;
  refundPolicyAgreedAt: string | null;
  source: "explicit-input" | "placeholder-default";
};

export type LegacyBookingDraftFromSkeleton = {
  category: {
    newCategory: BookingFlowCategory;
    legacyCategory: LegacyBeautyCategoryId;
  };
  store: {
    // Required external input: skeleton state does not own store selection yet.
    storeId: string | null;
    storeName: string | null;
    region: string | null;
  };
  schedule: LegacyBookingTimeDraft;
  service: {
    primaryServiceId: string | null;
    primaryServiceName: string | null;
  };
  customer: {
    name: string;
    phone: string;
    request: string;
    currentImageUrl?: string | null;
    styleImageUrl?: string | null;
  };
  images: {
    flattened: FlattenedSkeletonImageDraft[];
    currentStateCount: number;
    desiredStyleCount: number;
    totalCount: number;
    preserveSourceMetadata: true;
  };
  agreements: LegacyDraftAgreements;
  unresolved: {
    missingStoreId: boolean;
    missingBookingDate: boolean;
    bookingTimeIsPlaceholder: boolean;
  };
};

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildLegacyBookingDraftFromSkeleton(params: {
  state: BookingFlowState;
  // Required external input in the future HomeBookingFlowEntry/submitAdapter.
  storeId: string | null;
  storeName?: string | null;
  region?: string | null;
  primaryServiceName?: string | null;
  agreements?: Partial<BookingConfirmationState>;
  bookingTimePolicy?: {
    placeholderTime?: string;
  };
}): LegacyBookingDraftFromSkeleton | null {
  const { state } = params;

  if (!state.category) {
    return null;
  }

  const schedule = buildLegacyBookingTimeDraft(
    state.selectedDate,
    state.selectedTime,
    params.bookingTimePolicy,
  );
  const flattenedImages = flattenSkeletonImageDrafts(state.customerDetails);

  const serviceTermsAgreed = params.agreements?.serviceTermsAgreed ?? false;
  const privacyPolicyAgreed = params.agreements?.privacyPolicyAgreed ?? false;
  const thirdPartySharingAgreed = params.agreements?.thirdPartySharingAgreed ?? false;
  const marketingConsentAgreed = params.agreements?.marketingConsentAgreed ?? false;
  const refundPolicyAgreed = params.agreements?.refundPolicyAgreed ?? false;
  const refundPolicyAgreedAt = params.agreements?.refundPolicyAgreedAt ?? null;

  const agreementSource: LegacyDraftAgreements["source"] =
    params.agreements &&
    ("serviceTermsAgreed" in params.agreements ||
      "privacyPolicyAgreed" in params.agreements ||
      "thirdPartySharingAgreed" in params.agreements ||
      "marketingConsentAgreed" in params.agreements ||
      "refundPolicyAgreed" in params.agreements)
      ? "explicit-input"
      : "placeholder-default";

  const storeId = normalizeOptionalText(params.storeId);

  return {
    category: {
      newCategory: state.category,
      legacyCategory: mapNewCategoryToLegacyCategory(state.category),
    },
    store: {
      storeId,
      storeName: normalizeOptionalText(params.storeName),
      region: normalizeOptionalText(params.region),
    },
    schedule,
    service: {
      primaryServiceId: state.selectedServiceId,
      primaryServiceName: normalizeOptionalText(params.primaryServiceName),
    },
    customer: {
      name: state.customerDetails.name,
      phone: state.customerDetails.phone,
      request: state.customerDetails.requestNote,
    },
    images: {
      flattened: flattenedImages,
      currentStateCount: state.customerDetails.currentStateImages.length,
      desiredStyleCount: state.customerDetails.desiredStyleImages.length,
      totalCount: flattenedImages.length,
      preserveSourceMetadata: true,
    },
    agreements: {
      serviceTermsAgreed,
      privacyPolicyAgreed,
      thirdPartySharingAgreed,
      marketingConsentAgreed,
      refundPolicyAgreed,
      refundPolicyAgreedAt,
      source: agreementSource,
    },
    unresolved: {
      missingStoreId: !storeId,
      missingBookingDate: schedule.bookingDate === null,
      bookingTimeIsPlaceholder: schedule.usesPlaceholderTime,
    },
  };
}
