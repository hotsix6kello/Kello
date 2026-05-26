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
    label: "categories.hair.label",
    legacyBeautyCategoryId: "hair",
  },
  nail: {
    id: "nail",
    label: "categories.nail.label",
    legacyBeautyCategoryId: "nail",
  },
  aesthetic: {
    id: "aesthetic",
    label: "categories.esthetic.label",
    legacyBeautyCategoryId: "nail",
  },
  eyelash: {
    id: "eyelash",
    label: "categories.lash.label",
    legacyBeautyCategoryId: "lash",
  },
  makeup: {
    id: "makeup",
    label: "categories.makeup.label",
    legacyBeautyCategoryId: "makeup",
  },
  waxing: {
    id: "waxing",
    label: "categories.waxing.label",
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
    editorTitle: "booking_skeleton.image_groups.hair.current_editor",
    reviewTitle: "booking_skeleton.image_groups.hair.current_review",
  },
  {
    id: "desired-style",
    kind: "desired-style",
    stateKey: "desiredStyleImages",
    editorTitle: "booking_skeleton.image_groups.hair.style_editor",
    reviewTitle: "booking_skeleton.image_groups.hair.style_review",
  },
];

const BOOKING_FLOW_IMAGE_GROUP_LABELS_BY_CATEGORY: Record<
  BookingFlowCategory,
  Record<BookingImageGroupStateKey, Pick<BookingImageGroupConfig, "editorTitle" | "reviewTitle">>
> = {
  hair: {
    currentStateImages: {
      editorTitle: "booking_skeleton.image_groups.hair.current_editor",
      reviewTitle: "booking_skeleton.image_groups.hair.current_review",
    },
    desiredStyleImages: {
      editorTitle: "booking_skeleton.image_groups.hair.style_editor",
      reviewTitle: "booking_skeleton.image_groups.hair.style_review",
    },
  },
  nail: {
    currentStateImages: {
      editorTitle: "booking_skeleton.image_groups.nail.current_editor",
      reviewTitle: "booking_skeleton.image_groups.nail.current_review",
    },
    desiredStyleImages: {
      editorTitle: "booking_skeleton.image_groups.nail.style_editor",
      reviewTitle: "booking_skeleton.image_groups.nail.style_review",
    },
  },
  aesthetic: {
    currentStateImages: {
      editorTitle: "booking_skeleton.image_groups.aesthetic.current_editor",
      reviewTitle: "booking_skeleton.image_groups.aesthetic.current_review",
    },
    desiredStyleImages: {
      editorTitle: "booking_skeleton.image_groups.aesthetic.style_editor",
      reviewTitle: "booking_skeleton.image_groups.aesthetic.style_review",
    },
  },
  eyelash: {
    currentStateImages: {
      editorTitle: "booking_skeleton.image_groups.eyelash.current_editor",
      reviewTitle: "booking_skeleton.image_groups.eyelash.current_review",
    },
    desiredStyleImages: {
      editorTitle: "booking_skeleton.image_groups.eyelash.style_editor",
      reviewTitle: "booking_skeleton.image_groups.eyelash.style_review",
    },
  },
  makeup: {
    currentStateImages: {
      editorTitle: "booking_skeleton.image_groups.makeup.current_editor",
      reviewTitle: "booking_skeleton.image_groups.makeup.current_review",
    },
    desiredStyleImages: {
      editorTitle: "booking_skeleton.image_groups.makeup.style_editor",
      reviewTitle: "booking_skeleton.image_groups.makeup.style_review",
    },
  },
  waxing: {
    currentStateImages: {
      editorTitle: "booking_skeleton.image_groups.waxing.current_editor",
      reviewTitle: "booking_skeleton.image_groups.waxing.current_review",
    },
    desiredStyleImages: {
      editorTitle: "booking_skeleton.image_groups.waxing.style_editor",
      reviewTitle: "booking_skeleton.image_groups.waxing.style_review",
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
  noRequestNote: "아직 요청사항이 없습니다.",
  noImages: "선택한 이미지가 없습니다.",
  noService: "선택한 서비스가 없습니다.",
  noDate: "선택한 날짜가 없습니다.",
  noTime: "선택한 시간이 없습니다.",
  noCustomerName: "이름이 입력되지 않았습니다.",
  noContact: "연락처가 입력되지 않았습니다.",
  previewOnlyTitle: "현재는 예약 확인 단계만 연결되어 있으며 실제 제출은 진행되지 않습니다.",
  previewOnlyButton: "예약 확인만 진행 (미제출)",
} as const;

export const BOOKING_FLOW_CONFIRMATION_COPY = {
  bookingConfirmedLabel: "선택한 예약 정보가 맞는지 확인했습니다.",
  privacyConsentLabel: "예약 진행을 위해 개인정보 제공에 동의합니다.",
  intentButtonLabel: "예약 요청 확인하기 (미제출)",
  intentDescription: "이 버튼은 skeleton 내부에서 제출 준비 상태만 확인합니다. 실제 네트워크 요청은 발생하지 않습니다.",
} as const;

export const BOOKING_FLOW_STEPS = [
  {
    key: "step1",
    id: "service-selection",
    order: 1,
    title: "서비스 선택",
    description: "매장 선택 대신 원하는 시술을 먼저 고르는 단계입니다.",
  },
  {
    key: "step2",
    id: "date-time-selection",
    order: 2,
    title: "날짜 선택",
    description: "선택한 시술을 기준으로 방문 일정을 정합니다.",
  },
  {
    key: "step3",
    id: "customer-details",
    order: 3,
    title: "고객 정보",
    description: "연락처, 요청사항, 참고 이미지를 입력합니다.",
  },
  {
    key: "step4",
    id: "confirmation",
    order: 4,
    title: "예약 확인",
    description: "선택한 예약 정보를 마지막으로 확인합니다.",
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
