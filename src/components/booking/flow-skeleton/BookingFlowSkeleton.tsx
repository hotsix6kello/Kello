'use client';

import { useEffect, useMemo, useState } from "react";
import { ConfirmationStepShell } from "@/components/booking/flow-skeleton/ConfirmationStepShell";
import { CustomerDetailsStepShell } from "@/components/booking/flow-skeleton/CustomerDetailsStepShell";
import { DateTimeSelectionStepShell } from "@/components/booking/flow-skeleton/DateTimeSelectionStepShell";
import { ServiceSelectionStepShell } from "@/components/booking/flow-skeleton/ServiceSelectionStepShell";
import { BOOKING_FLOW_CATEGORY_OPTIONS } from "@/lib/bookings/bookingFlowSkeleton/constants";
import { BOOKING_FLOW_SERVICE_MENUS } from "@/lib/bookings/bookingFlowSkeleton/serviceMenus";
import {
  buildBookingFlowSummary,
  buildUploadedImageUrlsFromCustomerDetails,
  createEmptyBookingUploadedImageResultState,
  createInitialBookingFlowState,
  hasConfiguredServiceItems,
} from "@/lib/bookings/bookingFlowSkeleton/state";
import {
  applyBookingUploadedImageResultToFlowState,
  type BookingImageUploadBridgeItem,
  type BookingUploadedImageResultCompletion,
} from "@/lib/bookings/bookingFlowSkeleton/uploadedImageResults";
import { supabase } from "@/lib/supabaseClient";
import type {
  BookingFlowCategory,
  BookingFlowState,
  BookingFlowStepId,
  BookingImageDraft,
  BookingImageGroupStateKey,
  BookingImageKind,
} from "@/lib/bookings/bookingFlowSkeleton/types";

export type BookingFlowSkeletonDraftStateSnapshot = {
  state: BookingFlowState;
  storeContext: {
    storeId: string | null;
    storeName: string | null;
    region: string | null;
  };
  uploadedImageUrls: string[];
};

type BookingFlowSkeletonProps = {
  initialCategory?: BookingFlowCategory | null;
  storeContext?: {
    storeId?: string | null;
    storeName?: string | null;
    region?: string | null;
  };
  onImageUploadBridgeRequest?: (items: BookingImageUploadBridgeItem[]) => void;
  completedImageUploadResult?: BookingUploadedImageResultCompletion | null;
  onDraftStateChange?: (snapshot: BookingFlowSkeletonDraftStateSnapshot) => void;
  onSubmitIntent?: (snapshot: BookingFlowSkeletonDraftStateSnapshot) => void;
};

type BookingFlowVisualStepId = "service-selection" | "details-entry" | "confirmation";

type BookingFlowVisualStepDefinition = {
  id: BookingFlowVisualStepId;
  order: 1 | 2 | 3;
  title: string;
  description: string;
};

const BOOKING_FLOW_VISUAL_STEPS: BookingFlowVisualStepDefinition[] = [
  {
    id: "service-selection",
    order: 1,
    title: "서비스 선택",
    description: "원하는 시술을 고르고 다음 단계로 넘어가세요.",
  },
  {
    id: "details-entry",
    order: 2,
    title: "날짜 및 정보 입력",
    description: "예약 날짜와 고객 정보를 한 화면에서 입력하세요.",
  },
  {
    id: "confirmation",
    order: 3,
    title: "최종 예약 확인",
    description: "입력한 내용을 확인한 뒤 예약 요청을 보내세요.",
  },
];

function resolveVisualStepId(currentStep: BookingFlowStepId): BookingFlowVisualStepId {
  switch (currentStep) {
    case "service-selection":
      return "service-selection";
    case "confirmation":
      return "confirmation";
    case "date-time-selection":
    case "customer-details":
    default:
      return "details-entry";
  }
}

function getVisualStepDefinition(stepId: BookingFlowVisualStepId): BookingFlowVisualStepDefinition {
  return BOOKING_FLOW_VISUAL_STEPS.find((step) => step.id === stepId) ?? BOOKING_FLOW_VISUAL_STEPS[0]!;
}

export function BookingFlowSkeleton({
  initialCategory = null,
  storeContext,
  onImageUploadBridgeRequest,
  completedImageUploadResult,
  onDraftStateChange,
  onSubmitIntent,
}: BookingFlowSkeletonProps) {
  const [state, setState] = useState(() => createInitialBookingFlowState(initialCategory));

  useEffect(() => {
    let isMounted = true;

    const fillProfileDefaults = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted || !user) {
          return;
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name, nickname, phone, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        const displayName =
          (typeof profileData?.nickname === "string" ? profileData.nickname : "") ||
          (typeof profileData?.display_name === "string" ? profileData.display_name : "") ||
          (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
          (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "") ||
          (typeof user.email === "string" ? user.email.split("@")[0] ?? "" : "") ||
          "";
        const contact =
          (typeof profileData?.phone === "string" ? profileData.phone : "") ||
          (typeof user.phone === "string" ? user.phone : "") ||
          "";
        const avatarUrl =
          typeof profileData?.avatar_url === "string" && profileData.avatar_url.length > 0
            ? profileData.avatar_url
            : null;

        setState((currentState) => ({
          ...currentState,
          customerDetails: {
            ...currentState.customerDetails,
            name: currentState.customerDetails.name.trim() ? currentState.customerDetails.name : displayName,
            phone: currentState.customerDetails.phone.trim() ? currentState.customerDetails.phone : contact,
            profileSource: "auth-profile",
            profileSnapshot: {
              displayName,
              phone: contact,
              avatarUrl,
            },
          },
        }));
      } catch {
        if (!isMounted) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          customerDetails: {
            ...currentState.customerDetails,
            profileSource: "none",
            profileSnapshot: null,
          },
        }));
      }
    };

    void fillProfileDefaults();

    return () => {
      isMounted = false;
    };
  }, []);

  const mapFilesToDrafts = (files: File[], kind: BookingImageKind): BookingImageDraft[] => {
    const now = Date.now();

    return files.map((file, index) => ({
      id: `${kind}-${now}-${index}-${file.name}`,
      kind,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }));
  };

  const appendImageDrafts = (
    stateKey: BookingImageGroupStateKey,
    files: File[],
    kind: BookingImageKind,
  ) => {
    const nextDrafts = mapFilesToDrafts(files, kind);

    setState((currentState) => ({
      ...currentState,
      customerDetails: {
        ...currentState.customerDetails,
        [stateKey]: [...currentState.customerDetails[stateKey], ...nextDrafts],
        uploadedImageResults: {
          ...(currentState.customerDetails.uploadedImageResults ??
            createEmptyBookingUploadedImageResultState()),
          [stateKey]: [],
        },
      },
    }));

    onImageUploadBridgeRequest?.(
      nextDrafts.map((draft, index) => ({
        stateKey,
        draft,
        file: files[index]!,
      })),
    );
  };

  const resetImageGroup = (stateKey: BookingImageGroupStateKey) => {
    setState((currentState) => ({
      ...currentState,
      customerDetails: {
        ...currentState.customerDetails,
        [stateKey]: [],
        uploadedImageResults: {
          ...(currentState.customerDetails.uploadedImageResults ??
            createEmptyBookingUploadedImageResultState()),
          [stateKey]: [],
        },
      },
    }));
  };

  useEffect(() => {
    setState((currentState) => {
      if (currentState.category === initialCategory) {
        return currentState;
      }

      return {
        ...currentState,
        category: initialCategory,
        selectedServiceId: null,
        selectedDate: null,
        selectedTime: null,
      };
    });
  }, [initialCategory]);

  useEffect(() => {
    if (state.currentStep !== "date-time-selection") {
      return;
    }

    setState((currentState) =>
      currentState.currentStep === "date-time-selection"
        ? {
            ...currentState,
            currentStep: "customer-details",
          }
        : currentState,
    );
  }, [state.currentStep]);

  useEffect(() => {
    if (!completedImageUploadResult) {
      return;
    }

    setState((currentState) =>
      applyBookingUploadedImageResultToFlowState({
        state: currentState,
        result: completedImageUploadResult,
      }),
    );
  }, [completedImageUploadResult]);

  const draftStateUploadedImageUrls = useMemo(
    () => buildUploadedImageUrlsFromCustomerDetails(state.customerDetails),
    [state.customerDetails],
  );

  useEffect(() => {
    onDraftStateChange?.({
      state,
      storeContext: {
        storeId: storeContext?.storeId ?? null,
        storeName: storeContext?.storeName ?? null,
        region: storeContext?.region ?? null,
      },
      uploadedImageUrls: draftStateUploadedImageUrls,
    });
  }, [
    onDraftStateChange,
    state,
    storeContext?.storeId,
    storeContext?.storeName,
    storeContext?.region,
    draftStateUploadedImageUrls,
  ]);

  const serviceMenu = state.category ? BOOKING_FLOW_SERVICE_MENUS[state.category] : null;
  const summary = useMemo(() => buildBookingFlowSummary(state), [state]);
  const selectedCategoryLabel =
    BOOKING_FLOW_CATEGORY_OPTIONS.find((option) => option.id === state.category)?.label ?? null;
  const activeVisualStepId = resolveVisualStepId(state.currentStep);
  const activeVisualStep = getVisualStepDefinition(activeVisualStepId);
  const isConfirmationStep = activeVisualStepId === "confirmation";
  const canAdvanceFromServiceSelection =
    state.category !== null &&
    (!hasConfiguredServiceItems(state.category) || state.selectedServiceId !== null);
  const canAdvanceFromDetailsEntry = Boolean(
    state.selectedDate &&
      state.customerDetails.name.trim() &&
      state.customerDetails.phone.trim(),
  );
  const canMoveNext =
    activeVisualStepId === "service-selection"
      ? canAdvanceFromServiceSelection
      : activeVisualStepId === "details-entry"
        ? canAdvanceFromDetailsEntry
        : false;
  const submitDraftSnapshot: BookingFlowSkeletonDraftStateSnapshot = {
    state,
    storeContext: {
      storeId: storeContext?.storeId ?? null,
      storeName: storeContext?.storeName ?? null,
      region: storeContext?.region ?? null,
    },
    uploadedImageUrls: draftStateUploadedImageUrls,
  };

  const handleNext = () => {
    setState((currentState) => ({
      ...currentState,
      currentStep:
        resolveVisualStepId(currentState.currentStep) === "service-selection"
          ? "customer-details"
          : "confirmation",
    }));
  };

  const renderCurrentStep = () => {
    switch (activeVisualStepId) {
      case "service-selection":
        return (
          <ServiceSelectionStepShell
            embedded
            categories={BOOKING_FLOW_CATEGORY_OPTIONS}
            selectedCategory={state.category}
            serviceMenu={serviceMenu}
            selectedServiceId={state.selectedServiceId}
            isCategoryLocked={Boolean(initialCategory)}
            onSelectCategory={(category) =>
              setState((currentState) => ({
                ...currentState,
                category,
                selectedServiceId: null,
                selectedDate: null,
                selectedTime: null,
              }))
            }
            onSelectService={(serviceId) =>
              setState((currentState) => ({
                ...currentState,
                selectedServiceId: serviceId,
              }))
            }
          />
        );

      case "details-entry":
        return (
          <div className="flex flex-col gap-8">
            <DateTimeSelectionStepShell
              embedded
              dateOnly
              category={state.category}
              categoryLabel={selectedCategoryLabel}
              selectedServiceTitle={summary.selectedServiceTitle}
              selectedDate={state.selectedDate}
              selectedTime={null}
              onSelectDate={(selectedDate) =>
                setState((currentState) => ({
                  ...currentState,
                  selectedDate,
                  selectedTime: null,
                }))
              }
            />

            <CustomerDetailsStepShell
              embedded
              hideBookingSummary
              hideSelectedTime
              category={state.category}
              categoryLabel={selectedCategoryLabel}
              selectedServiceTitle={summary.selectedServiceTitle}
              selectedDate={summary.selectedDate}
              selectedTime={null}
              details={state.customerDetails}
              onChangeName={(name) =>
                setState((currentState) => ({
                  ...currentState,
                  customerDetails: {
                    ...currentState.customerDetails,
                    name,
                  },
                }))
              }
              onChangePhone={(phone) =>
                setState((currentState) => ({
                  ...currentState,
                  customerDetails: {
                    ...currentState.customerDetails,
                    phone,
                  },
                }))
              }
              onChangeRequestNote={(requestNote) =>
                setState((currentState) => ({
                  ...currentState,
                  customerDetails: {
                    ...currentState.customerDetails,
                    requestNote,
                  },
                }))
              }
              onSelectCurrentHairImages={(files) =>
                appendImageDrafts("currentStateImages", files, "current-state")
              }
              onSelectDesiredStyleImages={(files) =>
                appendImageDrafts("desiredStyleImages", files, "desired-style")
              }
              onResetCurrentHairImages={() => resetImageGroup("currentStateImages")}
              onResetDesiredStyleImages={() => resetImageGroup("desiredStyleImages")}
            />
          </div>
        );

      case "confirmation":
        return (
          <ConfirmationStepShell
            embedded
            category={state.category}
            customerDetails={state.customerDetails}
            confirmation={state.confirmation}
            summary={summary}
            onToggleBookingConfirmed={(bookingConfirmed) =>
              setState((currentState) => ({
                ...currentState,
                confirmation: {
                  ...currentState.confirmation,
                  bookingConfirmed,
                },
              }))
            }
            onTogglePrivacyConsent={(privacyConsent) =>
              setState((currentState) => ({
                ...currentState,
                confirmation: {
                  ...currentState.confirmation,
                  privacyConsent,
                },
              }))
            }
            onSubmitIntent={() => onSubmitIntent?.(submitDraftSnapshot)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col bg-white px-4 pb-4">
      <header className="border-b border-neutral-200 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="inline-flex w-fit rounded-full bg-pink-50 px-3 py-1 text-[11px] font-semibold text-pink-700">
              예약 플로우
            </span>
            <div className="flex max-w-[22rem] flex-col items-center">
              <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-neutral-950">
                {activeVisualStep.title}
              </h1>
              <p className="mt-1 text-[13px] leading-5 text-neutral-500">{activeVisualStep.description}</p>
            </div>
          </div>

          <ol className="flex w-full">
            {BOOKING_FLOW_VISUAL_STEPS.map((step) => {
              const isActive = step.id === activeVisualStepId;
              const isComplete = step.order < activeVisualStep.order;

              return (
                <li
                  key={step.id}
                  className={`flex-1 flex flex-col items-center justify-end pb-3 border-b-[3px] text-sm transition-colors ${
                    isActive || isComplete
                      ? "border-pink-600 text-pink-700"
                      : "border-neutral-100 text-neutral-400"
                  }`}
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em]">
                    {`STEP ${step.order}`}
                  </div>
                  <div className="mt-1 font-semibold leading-5">{step.title}</div>
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <section className="py-4">{renderCurrentStep()}</section>

      {!isConfirmationStep ? (
        <section className="sticky bottom-0 z-10 -mx-4 mt-2 bg-white px-4 pb-10 pt-4 shadow-[0_-20px_40px_rgba(255,255,255,1)]">
          <button
            type="button"
            onClick={() => handleNext()}
            disabled={!canMoveNext}
            className={`w-full p-4 rounded-xl font-bold transition-colors ${
              canMoveNext
                ? "text-white bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/30"
                : "text-neutral-400 bg-neutral-100 cursor-not-allowed"
            }`}
          >
            {activeVisualStepId === "service-selection" ? "다음 단계로 이동" : "최종 예약 확인"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
