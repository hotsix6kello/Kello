import {
  BOOKING_FLOW_CATEGORY_CONFIG,
  getBookingFlowCategoryCapabilities,
  BOOKING_FLOW_INITIAL_STEP_ID,
  BOOKING_FLOW_STEPS,
} from "@/lib/bookings/bookingFlowSkeleton/constants";
import { BOOKING_FLOW_SERVICE_MENUS } from "@/lib/bookings/bookingFlowSkeleton/serviceMenus";
import type {
  BookingCustomerDetailsState,
  BookingFlowCategory,
  BookingFlowState,
  BookingFlowStepId,
  BookingFlowSummary,
  BookingServiceMenuConfig,
  BookingUploadedImageResultState,
} from "@/lib/bookings/bookingFlowSkeleton/types";

function findSelectedServiceTitle(
  serviceMenu: BookingServiceMenuConfig | null,
  selectedServiceId: string | null,
): string | null {
  if (!serviceMenu || !selectedServiceId) {
    return null;
  }

  for (const section of serviceMenu.sections) {
    const selectedItem = section.items.find((item) => item.id === selectedServiceId);
    if (selectedItem) {
      return selectedItem.title;
    }
  }

  return null;
}

export function hasConfiguredServiceItems(category: BookingFlowCategory | null): boolean {
  if (!category) {
    return false;
  }

  return BOOKING_FLOW_SERVICE_MENUS[category].sections.some((section) => section.items.length > 0);
}

export function createEmptyBookingUploadedImageResultState(): BookingUploadedImageResultState {
  return {
    currentStateImages: [],
    desiredStyleImages: [],
  };
}

function normalizeUploadedImageUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildUploadedImageUrlLookup(
  items: BookingUploadedImageResultState["currentStateImages"],
): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const item of items) {
    const normalizedUrl = normalizeUploadedImageUrl(item.uploadedUrl);
    if (!normalizedUrl) {
      continue;
    }

    lookup.set(item.draftImageId, normalizedUrl);
  }

  return lookup;
}

export function createInitialCustomerDetailsState(): BookingCustomerDetailsState {
  return {
    name: "",
    phone: "",
    requestNote: "",
    profileSource: "none",
    profileSnapshot: null,
    currentStateImages: [],
    desiredStyleImages: [],
    uploadedImageResults: createEmptyBookingUploadedImageResultState(),
  };
}

export function createInitialBookingFlowState(
  initialCategory: BookingFlowCategory | null = null,
): BookingFlowState {
  return {
    currentStep: BOOKING_FLOW_INITIAL_STEP_ID,
    category: initialCategory,
    selectedServiceId: null,
    selectedDate: null,
    selectedTime: null,
    customerDetails: createInitialCustomerDetailsState(),
    confirmation: {
      bookingConfirmed: false,
      privacyConsent: false,
    },
  };
}

export function getNextBookingFlowStep(currentStep: BookingFlowStepId): BookingFlowStepId {
  const currentIndex = BOOKING_FLOW_STEPS.findIndex((step) => step.id === currentStep);
  const fallbackStep = BOOKING_FLOW_STEPS[0]!;
  const nextIndex =
    currentIndex < 0 ? 0 : Math.min(currentIndex + 1, BOOKING_FLOW_STEPS.length - 1);

  return BOOKING_FLOW_STEPS[nextIndex]?.id ?? fallbackStep.id;
}

export function getPreviousBookingFlowStep(currentStep: BookingFlowStepId): BookingFlowStepId {
  const currentIndex = BOOKING_FLOW_STEPS.findIndex((step) => step.id === currentStep);
  const fallbackStep = BOOKING_FLOW_STEPS[0]!;
  const previousIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);

  return BOOKING_FLOW_STEPS[previousIndex]?.id ?? fallbackStep.id;
}

export function canMoveToNextBookingFlowStep(state: BookingFlowState): boolean {
  const capabilities = getBookingFlowCategoryCapabilities(state.category);

  switch (state.currentStep) {
    case "service-selection":
      return (
        state.category !== null &&
        (!hasConfiguredServiceItems(state.category) || state.selectedServiceId !== null)
      );
    case "date-time-selection":
      return capabilities?.interactiveDateSelection === true
        ? Boolean(state.selectedDate && state.selectedTime)
        : false;
    case "customer-details":
      return capabilities?.interactiveCustomerDetails === true
        ? Boolean(state.customerDetails.name.trim() && state.customerDetails.phone.trim())
        : false;
    case "confirmation":
      return false;
    default:
      return false;
  }
}

export function buildBookingFlowSummary(state: BookingFlowState): BookingFlowSummary {
  const serviceMenu = state.category ? BOOKING_FLOW_SERVICE_MENUS[state.category] : null;
  const selectedServiceTitle = findSelectedServiceTitle(serviceMenu, state.selectedServiceId);

  return {
    categoryLabel: state.category ? BOOKING_FLOW_CATEGORY_CONFIG[state.category].label : "Unselected",
    selectedServiceTitle,
    selectedDate: state.selectedDate,
    selectedTime: state.selectedTime,
    customerName: state.customerDetails.name,
    contact: state.customerDetails.phone,
    requestNote: state.customerDetails.requestNote,
    hasRequestNote: state.customerDetails.requestNote.trim().length > 0,
    currentStateImageCount: state.customerDetails.currentStateImages.length,
    desiredStyleImageCount: state.customerDetails.desiredStyleImages.length,
  };
}

export function buildUploadedImageUrlsFromCustomerDetails(
  details: Pick<
    BookingCustomerDetailsState,
    "currentStateImages" | "desiredStyleImages" | "uploadedImageResults"
  >,
): string[] {
  const uploadedImageResults =
    details.uploadedImageResults ?? createEmptyBookingUploadedImageResultState();
  const currentStateImageLookup = buildUploadedImageUrlLookup(uploadedImageResults.currentStateImages);
  const desiredStyleImageLookup = buildUploadedImageUrlLookup(uploadedImageResults.desiredStyleImages);

  return [
    ...details.currentStateImages.map((item) => currentStateImageLookup.get(item.id) ?? null),
    ...details.desiredStyleImages.map((item) => desiredStyleImageLookup.get(item.id) ?? null),
  ].filter((value): value is string => value !== null);
}
