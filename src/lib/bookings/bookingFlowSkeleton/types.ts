export const BOOKING_FLOW_CATEGORY_IDS = [
  "hair",
  "nail",
  "aesthetic",
  "eyelash",
  "makeup",
  "waxing",
] as const;

export type BookingFlowCategory = (typeof BOOKING_FLOW_CATEGORY_IDS)[number];

export const BOOKING_FLOW_STEP_KEYS = ["step1", "step2", "step3", "step4"] as const;
export type BookingFlowStepKey = (typeof BOOKING_FLOW_STEP_KEYS)[number];

export const BOOKING_FLOW_STEP_IDS = [
  "service-selection",
  "date-time-selection",
  "customer-details",
  "confirmation",
] as const;

export type BookingFlowStepId = (typeof BOOKING_FLOW_STEP_IDS)[number];

export type LegacyBeautyCategoryId =
  | "hair"
  | "nail"
  | "esthetic"
  | "lash"
  | "makeup"
  | "waxing";

export type BookingFlowCategoryConfig = {
  id: BookingFlowCategory;
  label: string;
  legacyBeautyCategoryId: LegacyBeautyCategoryId;
};

export type BookingFlowStepDefinition = {
  key: BookingFlowStepKey;
  id: BookingFlowStepId;
  order: 1 | 2 | 3 | 4;
  title: string;
  description: string;
};

export type BookingServiceMenuItem = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number | null;
  priceLabel: string | null;
};

export type BookingServiceMenuSection = {
  id: string;
  title: string;
  items: BookingServiceMenuItem[];
};

export type BookingServiceMenuConfig = {
  category: BookingFlowCategory;
  title: string;
  description: string;
  sections: BookingServiceMenuSection[];
};

export type BookingImageKind = "current-state" | "desired-style";
export type BookingImageGroupStateKey = "currentStateImages" | "desiredStyleImages";

export type BookingImageDraft = {
  id: string;
  kind: BookingImageKind;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export type BookingUploadedImageResultReference = {
  draftImageId: string;
  uploadedUrl: string;
};

export type BookingUploadedImageResultState = {
  currentStateImages: BookingUploadedImageResultReference[];
  desiredStyleImages: BookingUploadedImageResultReference[];
};

export type BookingImageGroupConfig = {
  id: "current-hair" | "desired-style";
  kind: BookingImageKind;
  stateKey: BookingImageGroupStateKey;
  editorTitle: string;
  reviewTitle: string;
};

export type BookingProfileSnapshot = {
  displayName: string;
  phone: string;
  avatarUrl: string | null;
};

export type BookingCustomerDetailsState = {
  name: string;
  phone: string;
  requestNote: string;
  profileSource: "none" | "auth-profile";
  profileSnapshot: BookingProfileSnapshot | null;
  currentStateImages: BookingImageDraft[];
  desiredStyleImages: BookingImageDraft[];
  uploadedImageResults?: BookingUploadedImageResultState;
};

export type BookingConfirmationState = {
  serviceTermsAgreed: boolean;
  privacyPolicyAgreed: boolean;
  thirdPartySharingAgreed: boolean;
  marketingConsentAgreed: boolean;
  refundPolicyAgreed: boolean;
  refundPolicyAgreedAt: string | null;
};

export type BookingFlowCategoryCapabilities = {
  interactiveDateSelection: boolean;
  interactiveCustomerDetails: boolean;
  interactiveReview: boolean;
};

export type BookingFlowState = {
  currentStep: BookingFlowStepId;
  category: BookingFlowCategory | null;
  selectedServiceId: string | null;
  selectedDate: string | null;
  selectedTime: string | null;
  customerDetails: BookingCustomerDetailsState;
  confirmation: BookingConfirmationState;
};

export type BookingFlowSummary = {
  categoryLabel: string;
  selectedServiceTitle: string | null;
  selectedDate: string | null;
  selectedTime: string | null;
  customerName: string;
  contact: string;
  requestNote: string;
  hasRequestNote: boolean;
  currentStateImageCount: number;
  desiredStyleImageCount: number;
};
