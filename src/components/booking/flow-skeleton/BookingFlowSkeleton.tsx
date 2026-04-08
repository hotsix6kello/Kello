'use client';

import { useEffect, useMemo, useState } from "react";
import { ConfirmationStepShell } from "@/components/booking/flow-skeleton/ConfirmationStepShell";
import { CustomerDetailsStepShell } from "@/components/booking/flow-skeleton/CustomerDetailsStepShell";
import { DateTimeSelectionStepShell } from "@/components/booking/flow-skeleton/DateTimeSelectionStepShell";
import { ServiceSelectionStepShell } from "@/components/booking/flow-skeleton/ServiceSelectionStepShell";
import {
  BOOKING_FLOW_CATEGORY_OPTIONS,
  BOOKING_FLOW_STEP_LOOKUP,
  BOOKING_FLOW_STEPS,
} from "@/lib/bookings/bookingFlowSkeleton/constants";
import { BOOKING_FLOW_SERVICE_MENUS } from "@/lib/bookings/bookingFlowSkeleton/serviceMenus";
import {
  buildUploadedImageUrlsFromCustomerDetails,
  buildBookingFlowSummary,
  canMoveToNextBookingFlowStep,
  createEmptyBookingUploadedImageResultState,
  createInitialBookingFlowState,
  getNextBookingFlowStep,
  getPreviousBookingFlowStep,
} from "@/lib/bookings/bookingFlowSkeleton/state";
import {
  applyBookingUploadedImageResultToFlowState,
  type BookingImageUploadBridgeItem,
} from "@/lib/bookings/bookingFlowSkeleton/uploadedImageResults";
import { supabase } from "@/lib/supabaseClient";
import type {
  BookingFlowCategory,
  BookingFlowState,
  BookingImageDraft,
  BookingImageGroupStateKey,
  BookingImageKind,
} from "@/lib/bookings/bookingFlowSkeleton/types";
import type { BookingUploadedImageResultCompletion } from "@/lib/bookings/bookingFlowSkeleton/uploadedImageResults";

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
        if (!isMounted) return;
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

  const activeStep = BOOKING_FLOW_STEP_LOOKUP[state.currentStep];
  const serviceMenu = state.category ? BOOKING_FLOW_SERVICE_MENUS[state.category] : null;
  const summary = useMemo(() => buildBookingFlowSummary(state), [state]);
  const canMoveNext = canMoveToNextBookingFlowStep(state);
  const isFirstStep = state.currentStep === BOOKING_FLOW_STEPS[0]!.id;
  const selectedServiceSummary = summary.selectedServiceTitle;
  const selectedDateSummary = summary.selectedDate;
  const hasStoreContext = Boolean(
    storeContext?.storeId || storeContext?.storeName || storeContext?.region,
  );
  const submitDraftSnapshot: BookingFlowSkeletonDraftStateSnapshot = {
    state,
    storeContext: {
      storeId: storeContext?.storeId ?? null,
      storeName: storeContext?.storeName ?? null,
      region: storeContext?.region ?? null,
    },
    uploadedImageUrls: draftStateUploadedImageUrls,
  };
  const storeContextSummary = [
    storeContext?.storeName?.trim() || null,
    storeContext?.storeId?.trim() || null,
    storeContext?.region?.trim() || null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return (
    <div className="flex flex-col gap-6 rounded-[32px] border border-neutral-200 bg-neutral-50 p-6">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Booking Flow Skeleton
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-neutral-950">{activeStep.title}</h1>
            <p className="mt-1 text-sm text-neutral-600">{activeStep.description}</p>
            {hasStoreContext ? (
              <p className="mt-2 text-xs text-neutral-500">
                Store context (read-only): {storeContextSummary}
              </p>
            ) : null}
          </div>
          <div className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-700">
            {state.category ?? "category pending"}
          </div>
        </div>

        <ol className="grid gap-2 md:grid-cols-4">
          {BOOKING_FLOW_STEPS.map((step) => {
            const isActive = step.id === state.currentStep;
            const isComplete = step.order < activeStep.order;

            return (
              <li
                key={step.id}
                className={`rounded-2xl border px-4 py-3 text-sm transition ${
                  isActive
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : isComplete
                      ? "border-neutral-300 bg-white text-neutral-900"
                      : "border-neutral-200 bg-neutral-100 text-neutral-500"
                }`}
              >
                <div className="text-xs uppercase tracking-[0.14em]">{step.key}</div>
                <div className="mt-1 font-medium">{step.title}</div>
              </li>
            );
          })}
        </ol>
      </header>

      {state.currentStep !== "service-selection" && selectedServiceSummary ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Current selection
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-sm font-medium text-white">
              {selectedServiceSummary}
            </span>
            {selectedDateSummary ? (
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-800">
                {selectedDateSummary}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            Your step 1 choice stays in local skeleton state while moving through the preview.
            {selectedDateSummary ? " The selected date stays with it." : ""}
          </p>
        </section>
      ) : null}

      {state.currentStep === "service-selection" ? (
        <ServiceSelectionStepShell
          categories={BOOKING_FLOW_CATEGORY_OPTIONS}
          selectedCategory={state.category}
          serviceMenu={serviceMenu}
          selectedServiceId={state.selectedServiceId}
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
      ) : null}

      {state.currentStep === "date-time-selection" ? (
        <DateTimeSelectionStepShell
          category={state.category}
          selectedDate={state.selectedDate}
          selectedTime={state.selectedTime}
          onSelectDate={(selectedDate) =>
            setState((currentState) => ({
              ...currentState,
              selectedDate,
              selectedTime: null,
            }))
          }
          onSelectTime={(selectedTime) =>
            setState((currentState) => ({
              ...currentState,
              selectedTime,
            }))
          }
        />
      ) : null}

      {state.currentStep === "customer-details" ? (
        <CustomerDetailsStepShell
          category={state.category}
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
      ) : null}

      {state.currentStep === "confirmation" ? (
        <ConfirmationStepShell
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
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() =>
            setState((currentState) => ({
              ...currentState,
              currentStep: getPreviousBookingFlowStep(currentState.currentStep),
            }))
          }
          disabled={isFirstStep}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            isFirstStep
              ? "cursor-not-allowed border border-neutral-200 bg-neutral-100 text-neutral-400"
              : "border border-neutral-300 bg-white text-neutral-800"
          }`}
        >
          Back
        </button>

        <div className="flex items-center gap-3">
          {state.currentStep === "confirmation" ? (
            <p className="text-sm text-neutral-500">
              Submission is intentionally left unconnected in this turn.
            </p>
          ) : null}

          <button
            type="button"
            onClick={() =>
              setState((currentState) => ({
                ...currentState,
                currentStep: getNextBookingFlowStep(currentState.currentStep),
              }))
            }
            disabled={!canMoveNext}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              canMoveNext
                ? "bg-neutral-900 text-white"
                : "cursor-not-allowed bg-neutral-200 text-neutral-500"
            }`}
          >
            {state.currentStep === "customer-details" ? "Review confirmation" : "Next"}
          </button>
        </div>
      </footer>
    </div>
  );
}
