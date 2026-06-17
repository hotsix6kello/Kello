'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookingFlowSkeleton,
  type BookingFlowSkeletonDraftStateSnapshot,
} from "@/components/booking/flow-skeleton";
import { type BookingImageUploadBridgeItem } from "@/lib/bookings/bookingFlowSkeleton/uploadedImageResults";
import {
  buildHomeBookingDraftDebugState,
  resolveHomeBookingDraftReadySequence,
  resolveHomeBookingUploadedImageUrls,
  resolveSkeletonCategoryFromLegacy,
  buildHomeBookingLegacyDraftFromSkeletonState,
} from "./HomeBookingFlowEntry.helpers";

import { runLegacySubmitPreparation } from "@/lib/bookings/bookingFlowSkeleton/submitRunner";
import { uploadBookingImage } from "@/lib/bookings/SupabaseUploadAdapter";
import { submitBeautyBooking } from "@/app/explore/beautyBooking";
import type { LegacySubmitAdapterBlocker } from "@/lib/bookings/bookingFlowSkeleton/submitAdapter";
import type { BookingFlowCategory } from "@/lib/bookings/bookingFlowSkeleton/types";
import type { PartnerMenuServiceConfig } from "@/lib/bookings/partnerMenuShared";
import { useTrip, type SharedBusiness } from "@/lib/contexts/TripContext";
import {
  HomeBookingDraftReadySequenceSnapshot,
  HomeBookingFlowEntryProps,
  SkeletonSubmitAttemptStatus,
} from "./HomeBookingFlowEntry.types";
import { supabase } from "@/lib/supabaseClient";

export {
  buildHomeBookingDraftDebugState,
  buildHomeBookingDraftReadyEvent,
  buildHomeBookingLegacyDraftFromSkeletonState,
  resolveHomeBookingMode,
  resolveHomeBookingDraftReadyEmission,
  resolveHomeBookingDraftReadySequence,
  resolveHomeBookingDraftReadyTiming,
  resolveHomeBookingUploadedImageUrls,
  resolveHomeBookingUploadedImageUrlsOverrideStatus,
  resolveLegacyCategoryFromSkeleton,
  resolveSkeletonCategoryFromLegacy,
} from "./HomeBookingFlowEntry.helpers";

type SubmitFeedbackTone = "info" | "error";

const HOME_CONCIERGE_STORE_ID = "kello-concierge-home";
const HOME_CONCIERGE_STORE_NAME = "Kello Concierge";
const HOME_CONCIERGE_REGION = "Seoul";

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolveStoreSourceFromQuery(value: string | null | undefined): 'google' | 'partner' | null {
  if (value === 'partner') return 'partner';
  if (value === 'google') return 'google';
  return null;
}

function resolveBusinessStoreId(business: SharedBusiness | null | undefined): string | null {
  return normalizeText(business?.id) ?? normalizeText(business?.place_id);
}

function resolveBusinessStoreName(business: SharedBusiness | null | undefined): string | null {
  return (
    normalizeText(business?.name) ??
    normalizeText(business?.title) ??
    normalizeText(business?.displayName?.text)
  );
}

function resolveBusinessAddress(business: SharedBusiness | null | undefined): string | null {
  return (
    normalizeText(business?.address) ??
    normalizeText(business?.formattedAddress) ??
    normalizeText(business?.formatted_address) ??
    normalizeText(business?.vicinity)
  );
}

function resolveRegionFromAddress(address: string | null): string | null {
  const normalizedAddress = normalizeText(address);

  if (!normalizedAddress) {
    return null;
  }

  const primarySegment = normalizedAddress.split(",")[0]?.trim() ?? normalizedAddress;
  const tokens = primarySegment.split(/\s+/).filter(Boolean);

  if (tokens.length >= 2) {
    return `${tokens[0]} ${tokens[1]}`;
  }

  return tokens[0] ?? null;
}

function resolveBlockedSubmitMessage(params: {
  blockers: LegacySubmitAdapterBlocker[];
  t: HomeBookingFlowEntryProps["t"];
}): string {
  const { blockers, t } = params;

  if (
    blockers.includes("missing-store-id") ||
    blockers.includes("missing-store-name") ||
    blockers.includes("missing-region")
  ) {
    return t("home_beauty.booking.submit_blocked_store", {
      defaultValue: "선택된 매장 정보가 없어 예약 요청을 보낼 수 없습니다. 매장을 다시 선택한 뒤 다시 시도해 주세요.",
    });
  }

  if (blockers.includes("missing-primary-service-id")) {
    return t("home_beauty.booking.submit_blocked_service", {
      defaultValue: "시술 메뉴를 선택한 뒤 다시 시도해 주세요.",
    });
  }

  if (blockers.includes("missing-booking-date") || blockers.includes("missing-booking-time")) {
    return t("home_beauty.booking.submit_blocked_schedule", {
      defaultValue: "예약 날짜 정보를 확인한 뒤 다시 시도해 주세요.",
    });
  }

  if (blockers.includes("missing-customer-name") || blockers.includes("missing-customer-phone")) {
    return t("home_beauty.booking.submit_blocked_customer", {
      defaultValue: "이름과 연락처를 모두 입력한 뒤 다시 시도해 주세요.",
    });
  }

  if (
    blockers.includes("booking-confirmed-required") ||
    blockers.includes("privacy-consent-required")
  ) {
    return t("home_beauty.booking.submit_blocked_agreements", {
      defaultValue: "필수 약관 동의 후 다시 시도해 주세요.",
    });
  }

  return t("home_beauty.booking.submit_blocked_generic", {
    defaultValue: "예약 요청을 시작할 수 없습니다. 입력한 정보를 다시 확인해 주세요.",
  });
}

export default function HomeBookingFlowEntry({
  isOpen,
  onClose,
  initialCategory,
  storeContext,
  onDraftReady,
  onDraftDebugStateChange,
  onSubmitPreparationChange,
  uploadedImageUrls,
  completedImageUploadResult,
  onSubmitAttemptStateChange,
  skeletonDebugPanel,
  t,
}: HomeBookingFlowEntryProps) {
  const searchParams = useSearchParams();
  const { sharedBusinesses } = useTrip();
  const draftSequenceSnapshotRef = useRef<HomeBookingDraftReadySequenceSnapshot>({
    lastEmittedSignature: null,
  });
  const [activeSubmitStatus, setActiveSubmitStatus] = useState<SkeletonSubmitAttemptStatus>("idle");
  const [submitFeedback, setSubmitFeedback] = useState<{
    tone: SubmitFeedbackTone;
    message: string;
  } | null>(null);
  const localImageFilesRef = useRef<Map<string, File>>(new Map());

  const skeletonInitialCategory = useMemo(
    () => resolveSkeletonCategoryFromLegacy(initialCategory),
    [initialCategory],
  );
  const queryStoreId = searchParams.get("store_id");
  const queryBusinessName = searchParams.get("business_name");
  const queryStoreSource = searchParams.get("store_source");

  const resolvedLinkedBusiness = useMemo(() => {
    const targetStoreId =
      normalizeText(storeContext?.storeId) ??
      normalizeText(queryStoreId);

    if (!targetStoreId) {
      return null;
    }

    return (
      sharedBusinesses.find((business) => resolveBusinessStoreId(business) === targetStoreId) ?? null
    );
  }, [queryStoreId, sharedBusinesses, storeContext?.storeId]);

  const resolvedStoreContext = useMemo(
    () => ({
      storeId:
        normalizeText(storeContext?.storeId) ??
        normalizeText(queryStoreId) ??
        resolveBusinessStoreId(resolvedLinkedBusiness) ??
        HOME_CONCIERGE_STORE_ID,
      storeName:
        normalizeText(storeContext?.storeName) ??
        normalizeText(queryBusinessName) ??
        resolveBusinessStoreName(resolvedLinkedBusiness) ??
        HOME_CONCIERGE_STORE_NAME,
      region:
        normalizeText(storeContext?.region) ??
        resolveRegionFromAddress(resolveBusinessAddress(resolvedLinkedBusiness)) ??
        HOME_CONCIERGE_REGION,
      storeSource:
        storeContext?.storeSource ??
        resolveStoreSourceFromQuery(queryStoreSource) ??
        (resolvedLinkedBusiness?.source === 'partner' ? 'partner' : 'google'),
    }),
    [
      queryBusinessName,
      queryStoreId,
      queryStoreSource,
      resolvedLinkedBusiness,
      storeContext?.region,
      storeContext?.storeId,
      storeContext?.storeName,
      storeContext?.storeSource,
    ],
  );

  const [skeletonCategory, setSkeletonCategory] = useState<BookingFlowCategory | null>(
    skeletonInitialCategory,
  );
  const [partnerServiceMenu, setPartnerServiceMenu] = useState<PartnerMenuServiceConfig | null>(null);

  // Reset submit status when flow closes
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmitStatus("idle");
      setSubmitFeedback(null);
      localImageFilesRef.current.clear();
    }
  }, [isOpen]);

  // 제휴 매장(store_source=partner)이면 해당 매장의 실제 메뉴를 불러와 기본 시술 메뉴 대신 사용한다.
  useEffect(() => {
    const storeId = resolvedStoreContext.storeId;

    if (resolvedStoreContext.storeSource !== "partner" || !storeId || !skeletonCategory) {
      setPartnerServiceMenu(null);
      return;
    }

    let isMounted = true;

    const loadPartnerMenu = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (isMounted) setPartnerServiceMenu(null);
          return;
        }

        const response = await fetch(
          `/api/partner-stores/${encodeURIComponent(storeId)}/menu?category=${skeletonCategory}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );

        if (!response.ok) {
          if (isMounted) setPartnerServiceMenu(null);
          return;
        }

        const data = await response.json();
        if (isMounted) {
          setPartnerServiceMenu(data?.ok ? data.menu ?? null : null);
        }
      } catch (error) {
        console.error("[HomeBookingFlowEntry] Failed to load partner menu", error);
        if (isMounted) setPartnerServiceMenu(null);
      }
    };

    void loadPartnerMenu();

    return () => {
      isMounted = false;
    };
  }, [resolvedStoreContext.storeId, resolvedStoreContext.storeSource, skeletonCategory]);

  const handleImageUploadBridgeRequest = useCallback((items: BookingImageUploadBridgeItem[]) => {
    items.forEach((item) => {
      localImageFilesRef.current.set(item.draft.id, item.file);
    });
  }, []);

  const handleDraftStateChange = useCallback(
    (snapshot: BookingFlowSkeletonDraftStateSnapshot) => {
      setSkeletonCategory(snapshot.state.category);

      const draftCandidate = buildHomeBookingLegacyDraftFromSkeletonState({
        state: snapshot.state,
        storeContext: snapshot.storeContext,
        agreements: snapshot.state.confirmation,
        partnerServiceMenu,
      });
      const resolvedUploadedImageUrls = resolveHomeBookingUploadedImageUrls({
        draftStateUploadedImageUrls: snapshot.uploadedImageUrls,
        uploadedImageUrlsOverride: uploadedImageUrls,
      });
      onDraftDebugStateChange?.(
        buildHomeBookingDraftDebugState({
          draftCandidate,
          draftStateUploadedImageResults: snapshot.state.customerDetails.uploadedImageResults,
          draftStateUploadedImageUrls: snapshot.uploadedImageUrls,
        }),
      );

      onSubmitPreparationChange?.(
        runLegacySubmitPreparation({
          draft: draftCandidate,
          uploadedImageUrls: resolvedUploadedImageUrls,
        }),
      );

      const emission = resolveHomeBookingDraftReadySequence({
        previousSnapshot: draftSequenceSnapshotRef.current,
        timingInput: {
          resolvedMode: "skeleton",
          enableSkeletonMode: true,
          currentStep: snapshot.state.currentStep,
          selectedServiceId: snapshot.state.selectedServiceId,
          selectedDate: snapshot.state.selectedDate,
          customerName: snapshot.state.customerDetails.name,
          customerContact: snapshot.state.customerDetails.phone,
          previousEmittedSignature: draftSequenceSnapshotRef.current.lastEmittedSignature,
        },
        draftInput: {
          state: snapshot.state,
          storeContext: snapshot.storeContext,
          agreements: snapshot.state.confirmation,
        },
      });

      draftSequenceSnapshotRef.current = emission.nextSnapshot;

      if (onDraftReady && emission.shouldEmit && emission.payload) {
        onDraftReady(emission.payload);
      }
    },
    [
      onDraftDebugStateChange,
      onDraftReady,
      onSubmitPreparationChange,
      partnerServiceMenu,
      uploadedImageUrls,
    ],
  );

  const handleSubmitIntent = useCallback(
    async (snapshot: BookingFlowSkeletonDraftStateSnapshot) => {
      if (activeSubmitStatus === "submitting" || activeSubmitStatus === "submitted") {
        return;
      }

      const draftCandidate = buildHomeBookingLegacyDraftFromSkeletonState({
        state: snapshot.state,
        storeContext: snapshot.storeContext,
        agreements: snapshot.state.confirmation,
        partnerServiceMenu,
      });
      const resolvedUploadedImageUrls = resolveHomeBookingUploadedImageUrls({
        draftStateUploadedImageUrls: snapshot.uploadedImageUrls,
        uploadedImageUrlsOverride: uploadedImageUrls,
      });

      const preparation = runLegacySubmitPreparation({
        draft: draftCandidate,
        uploadedImageUrls: resolvedUploadedImageUrls,
      });

      onSubmitPreparationChange?.(preparation);
      setSubmitFeedback(null);

      if (!preparation.canAttemptSubmit || !preparation.payloadCandidate) {
        const blockedMessage = resolveBlockedSubmitMessage({
          blockers: preparation.blockers,
          t,
        });

        setSubmitFeedback({
          tone: "error",
          message: blockedMessage,
        });
        onSubmitAttemptStateChange?.({
          status: "idle",
          message: blockedMessage,
          errorSummary: blockedMessage,
        });
        window.alert(blockedMessage);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const loginRequiredMessage = t("booking_skeleton.login_required.title");

        setSubmitFeedback({
          tone: "error",
          message: loginRequiredMessage,
        });
        onSubmitAttemptStateChange?.({
          status: "idle",
          message: loginRequiredMessage,
          errorSummary: loginRequiredMessage,
        });
        window.alert(loginRequiredMessage);
        return;
      }

      setActiveSubmitStatus("submitting");
      setSubmitFeedback({
        tone: "info",
        message: t("home_beauty.booking.submit_in_progress", {
          defaultValue: "예약 요청을 보내는 중입니다.",
        }),
      });
      onSubmitAttemptStateChange?.({
        status: "submitting",
        message: t("home_beauty.booking.submitting_images"),
        errorSummary: null,
      });

      try {
        const currentStateDrafts = snapshot.state.customerDetails.currentStateImages;
        const desiredStyleDrafts = snapshot.state.customerDetails.desiredStyleImages;

        const currentStateFiles = currentStateDrafts
          .map(d => localImageFilesRef.current.get(d.id))
          .filter((f): f is File => !!f);

        const desiredStyleFiles = desiredStyleDrafts
          .map(d => localImageFilesRef.current.get(d.id))
          .filter((f): f is File => !!f);

        const requestId = crypto.randomUUID();

        const currentUploadPromise = currentStateFiles[0]
          ? uploadBookingImage(currentStateFiles[0], 'current', requestId)
          : Promise.resolve(null);

        const styleUploadPromise = desiredStyleFiles[0]
          ? uploadBookingImage(desiredStyleFiles[0], 'style', requestId)
          : Promise.resolve(null);

        const [currentResult, styleResult] = await Promise.all([currentUploadPromise, styleUploadPromise]);

        if (currentResult?.error || styleResult?.error) {
          throw new Error(`${t("home_beauty.booking.booking_failed")}: ${currentResult?.error || styleResult?.error}`);
        }

        const uploadedPathsForCleanup: string[] = [
          currentResult?.path,
          styleResult?.path,
        ].filter((p): p is string => !!p);

        if (preparation.payloadCandidate) {
          preparation.payloadCandidate.id = requestId;
          preparation.payloadCandidate.customer.currentImageUrl = undefined;
          preparation.payloadCandidate.customer.styleImageUrl = undefined;
          preparation.payloadCandidate.customer.currentImagePath = currentResult?.path ?? undefined;
          preparation.payloadCandidate.customer.styleImagePath = styleResult?.path ?? undefined;
          preparation.payloadCandidate.customer.currentImageName = currentStateFiles[0]?.name;
          preparation.payloadCandidate.customer.styleImageName = desiredStyleFiles[0]?.name;
        }

        onSubmitAttemptStateChange?.({
          status: "submitting",
          message: t("home_beauty.booking.sending_request"),
          errorSummary: null,
        });

        let result;
        try {
          result = await submitBeautyBooking(preparation.payloadCandidate, session.access_token);
        } catch (submitErr: unknown) {
          if (uploadedPathsForCleanup.length > 0) {
            const { error: cleanupError } = await supabase.storage
              .from('booking')
              .remove(uploadedPathsForCleanup);
            if (cleanupError) {
              console.error('[HomeBookingFlowEntry] Storage cleanup failed', {
                paths: uploadedPathsForCleanup,
                error: cleanupError.message,
              });
            }
          }
          throw submitErr;
        }

        setActiveSubmitStatus("submitted");
        setSubmitFeedback(null);
        onSubmitAttemptStateChange?.({
          status: "submitted",
          message: `${t("home_beauty.booking.booking_completed")} (ID: ${result.bookingId})`,
          errorSummary: null,
        });
      } catch (err: unknown) {
        setActiveSubmitStatus("submit-error");
        const rawMsg = err instanceof Error ? err.message : '';
        const errorMessage = rawMsg === 'BOOKING_LOGIN_REQUIRED'
          ? t('beauty_booking_errors.login_required')
          : rawMsg === 'BOOKING_REVIEW_INFO'
          ? t('beauty_booking_errors.review_info')
          : rawMsg === 'BOOKING_SAVE_FAILED' || !rawMsg
          ? t('beauty_booking_errors.save_failed')
          : rawMsg;
        setSubmitFeedback({
          tone: "error",
          message: errorMessage,
        });
        onSubmitAttemptStateChange?.({
          status: "submit-error",
          message: errorMessage,
          errorSummary: errorMessage,
        });
        window.alert(errorMessage);
      }
    },
    [
      activeSubmitStatus,
      onSubmitAttemptStateChange,
      onSubmitPreparationChange,
      partnerServiceMenu,
      uploadedImageUrls,
      t,
    ]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="kello-soft-booking-flow fixed inset-0 z-[400] flex justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(circle at top left, rgba(244, 91, 135, 0.08), transparent 35%), radial-gradient(circle at top right, rgba(75, 58, 66, 0.06), transparent 30%), linear-gradient(180deg, #ffffff 0%, #fcf7f8 100%)'
      }}
    >
      <div className="kello-soft-booking-flow-panel relative flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-bottom duration-300">
        <button
          type="button"
          onClick={() => onClose()}
          className="absolute start-3 top-6 z-[50] flex items-center justify-center text-neutral-500 transition-colors hover:text-neutral-900"
          aria-label="Close booking flow"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto pb-10 pt-20">
          <div className="px-4">
            {activeSubmitStatus === "submitted" ? (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-fuchsia-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <svg className="w-10 h-10 text-fuchsia-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-[22px] font-black text-neutral-900 mb-2">{t("home_beauty.booking.completion_title")}</h2>
                <p className="text-[14px] font-medium text-neutral-500 leading-relaxed px-6 whitespace-pre-wrap">
                  {t("home_beauty.booking.completion_desc")}
                </p>
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="mt-12 px-10 py-4 bg-fuchsia-600 text-white font-bold rounded-2xl shadow-lg hover:bg-fuchsia-700 transition-colors"
                >
                  {t("home_beauty.booking.confirm_button")}
                </button>
              </div>
            ) : (
              <BookingFlowSkeleton
                initialCategory={skeletonInitialCategory}
                storeContext={resolvedStoreContext}
                partnerServiceMenu={partnerServiceMenu}
                onImageUploadBridgeRequest={handleImageUploadBridgeRequest}
                completedImageUploadResult={completedImageUploadResult}
                onDraftStateChange={handleDraftStateChange}
                onSubmitIntent={handleSubmitIntent}
                submitFeedbackMessage={submitFeedback?.message ?? null}
                submitFeedbackTone={submitFeedback?.tone ?? null}
                isSubmitting={activeSubmitStatus === "submitting"}
              />
            )}
          </div>
        </div>
      </div>

      {skeletonDebugPanel ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[430] hidden justify-end px-4 lg:flex">
          <details className="pointer-events-auto w-full max-w-[320px] rounded-2xl border border-dashed border-neutral-300 bg-white/95 px-3 py-2 text-xs text-neutral-500 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur">
            <summary className="cursor-pointer font-medium text-neutral-600">
              Debug draft panel
            </summary>
            <div className="mt-3">{skeletonDebugPanel}</div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
