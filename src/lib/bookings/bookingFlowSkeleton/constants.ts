import type {
  BookingFlowCategory,
  BookingFlowCategoryCapabilities,
  BookingFlowCategoryConfig,
  BookingImageGroupConfig,
  BookingImageGroupStateKey,
  BookingFlowStepDefinition,
  BookingFlowStepId,
} from "@/lib/bookings/bookingFlowSkeleton/types";

export const BOOKING_FLOW_CATEGORY_ORDER = [
  "hair",
  "nail",
  "aesthetic",
  "eyelash",
  "makeup",
  "waxing",
] satisfies BookingFlowCategory[];

export const BOOKING_FLOW_CATEGORY_CONFIG: Record<BookingFlowCategory, BookingFlowCategoryConfig> = {
  hair: {
    id: "hair",
    label: "Hair",
    legacyBeautyCategoryId: "hair",
  },
  nail: {
    id: "nail",
    label: "Nail",
    legacyBeautyCategoryId: "nail",
  },
  aesthetic: {
    id: "aesthetic",
    label: "Aesthetic",
    legacyBeautyCategoryId: "esthetic",
  },
  eyelash: {
    id: "eyelash",
    label: "Eyelash",
    legacyBeautyCategoryId: "lash",
  },
  makeup: {
    id: "makeup",
    label: "Makeup",
    legacyBeautyCategoryId: "makeup",
  },
  waxing: {
    id: "waxing",
    label: "Waxing",
    legacyBeautyCategoryId: "waxing",
  },
};

export const BOOKING_FLOW_CATEGORY_OPTIONS = BOOKING_FLOW_CATEGORY_ORDER.map(
  (categoryId) => BOOKING_FLOW_CATEGORY_CONFIG[categoryId],
);

export const BOOKING_FLOW_CATEGORY_CAPABILITIES: Record<
  BookingFlowCategory,
  BookingFlowCategoryCapabilities
> = {
  hair: {
    interactiveDateSelection: true,
    interactiveCustomerDetails: true,
    interactiveReview: true,
  },
  nail: {
    interactiveDateSelection: true,
    interactiveCustomerDetails: true,
    interactiveReview: true,
  },
  aesthetic: {
    interactiveDateSelection: true,
    interactiveCustomerDetails: true,
    interactiveReview: true,
  },
  eyelash: {
    interactiveDateSelection: true,
    interactiveCustomerDetails: true,
    interactiveReview: true,
  },
  makeup: {
    interactiveDateSelection: true,
    interactiveCustomerDetails: true,
    interactiveReview: true,
  },
  waxing: {
    interactiveDateSelection: true,
    interactiveCustomerDetails: true,
    interactiveReview: true,
  },
};

export function getBookingFlowCategoryCapabilities(category: BookingFlowCategory | null) {
  return category ? BOOKING_FLOW_CATEGORY_CAPABILITIES[category] : null;
}

export const BOOKING_FLOW_IMAGE_GROUPS: BookingImageGroupConfig[] = [
  {
    id: "current-hair",
    kind: "current-state",
    stateKey: "currentStateImages",
    editorTitle: "Current hair condition",
    reviewTitle: "Current hair images",
  },
  {
    id: "desired-style",
    kind: "desired-style",
    stateKey: "desiredStyleImages",
    editorTitle: "Desired style references",
    reviewTitle: "Desired style images",
  },
];

const BOOKING_FLOW_IMAGE_GROUP_LABELS_BY_CATEGORY: Record<
  BookingFlowCategory,
  Record<BookingImageGroupStateKey, Pick<BookingImageGroupConfig, "editorTitle" | "reviewTitle">>
> = {
  hair: {
    currentStateImages: {
      editorTitle: "Current hair condition",
      reviewTitle: "Current hair images",
    },
    desiredStyleImages: {
      editorTitle: "Desired style references",
      reviewTitle: "Desired style images",
    },
  },
  nail: {
    currentStateImages: {
      editorTitle: "Current nail condition",
      reviewTitle: "Current condition images",
    },
    desiredStyleImages: {
      editorTitle: "Desired nail style references",
      reviewTitle: "Desired style images",
    },
  },
  aesthetic: {
    currentStateImages: {
      editorTitle: "Current skin condition",
      reviewTitle: "Current condition images",
    },
    desiredStyleImages: {
      editorTitle: "Desired result references",
      reviewTitle: "Desired result images",
    },
  },
  eyelash: {
    currentStateImages: {
      editorTitle: "Current lash condition",
      reviewTitle: "Current condition images",
    },
    desiredStyleImages: {
      editorTitle: "Desired lash style references",
      reviewTitle: "Desired style images",
    },
  },
  makeup: {
    currentStateImages: {
      editorTitle: "Current face condition",
      reviewTitle: "Current condition images",
    },
    desiredStyleImages: {
      editorTitle: "Desired makeup references",
      reviewTitle: "Desired reference images",
    },
  },
  waxing: {
    currentStateImages: {
      editorTitle: "Current skin condition",
      reviewTitle: "Current condition images",
    },
    desiredStyleImages: {
      editorTitle: "Desired result references",
      reviewTitle: "Desired result images",
    },
  },
};

export function getBookingFlowImageGroups(category: BookingFlowCategory | null): BookingImageGroupConfig[] {
  if (!category) {
    return BOOKING_FLOW_IMAGE_GROUPS;
  }

  const labelSet = BOOKING_FLOW_IMAGE_GROUP_LABELS_BY_CATEGORY[category];

  return BOOKING_FLOW_IMAGE_GROUPS.map((group) => ({
    ...group,
    editorTitle: labelSet[group.stateKey].editorTitle,
    reviewTitle: labelSet[group.stateKey].reviewTitle,
  }));
}

export const BOOKING_FLOW_REVIEW_COPY = {
  noRequestNote: "No request note added yet.",
  noImages: "No images selected.",
  noService: "No service selected",
  noDate: "No date selected",
  noTime: "No time selected",
  noCustomerName: "No name added yet",
  noContact: "No contact added yet",
  previewOnlyTitle: "Preview only: submission is not connected yet.",
  previewOnlyButton: "Preview only - Submission not connected yet",
} as const;

export const BOOKING_FLOW_CONFIRMATION_COPY = {
  bookingConfirmedLabel: "I confirm that the booking details are correct.",
  privacyConsentLabel: "I agree to provide my personal information for this booking.",
  intentButtonLabel: "Preview submit intent (not submitted)",
  intentDescription: "This only sends a local intent signal to the wrapper. No network request is made.",
} as const;

export const BOOKING_FLOW_STEPS = [
  {
    key: "step1",
    id: "service-selection",
    order: 1,
    title: "service selection",
    description: "Start the new flow with service menu selection instead of store selection.",
  },
  {
    key: "step2",
    id: "date-time-selection",
    order: 2,
    title: "date selection",
    description: "Choose a visit date after selecting a service.",
  },
  {
    key: "step3",
    id: "customer-details",
    order: 3,
    title: "customer details",
    description: "Keep room for profile autofill, request notes, and reference images.",
  },
  {
    key: "step4",
    id: "confirmation",
    order: 4,
    title: "confirmation",
    description: "Review the new flow payload shape before wiring submission.",
  },
] satisfies BookingFlowStepDefinition[];

export const BOOKING_FLOW_INITIAL_STEP_ID = BOOKING_FLOW_STEPS[0]!.id;

export const BOOKING_FLOW_STEP_LOOKUP = Object.fromEntries(
  BOOKING_FLOW_STEPS.map((step) => [step.id, step]),
) as Record<BookingFlowStepId, BookingFlowStepDefinition>;

export const BOOKING_FLOW_IMAGE_LIMITS = {
  currentState: 5,
  desiredStyle: 5,
} as const;
