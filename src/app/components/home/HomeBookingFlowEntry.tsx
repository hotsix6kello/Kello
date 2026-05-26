'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const draftSequenceSnapshotRef = useRef<HomeBookingDraftReadySequenceSnapshot>({
    lastEmittedSignature: null,
  });
  const [activeSubmitStatus, setActiveSubmitStatus] = useState<SkeletonSubmitAttemptStatus>("idle");
  const localImageFilesRef = useRef<Map<string, File>>(new Map());

  const skeletonInitialCategory = useMemo(
    () => resolveSkeletonCategoryFromLegacy(initialCategory),
    [initialCategory],
  );

  // Reset submit status when flow closes
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmitStatus("idle");
      localImageFilesRef.current.clear();
    }
  }, [isOpen]);

  const handleImageUploadBridgeRequest = useCallback((items: BookingImageUploadBridgeItem[]) => {
    items.forEach((item) => {
      localImageFilesRef.current.set(item.draft.id, item.file);
    });
  }, []);

  const handleDraftStateChange = useCallback(
    (snapshot: BookingFlowSkeletonDraftStateSnapshot) => {
      const draftCandidate = buildHomeBookingLegacyDraftFromSkeletonState({
        state: snapshot.state,
        storeContext: snapshot.storeContext,
        agreements: snapshot.state.confirmation,
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

      if (!preparation.canAttemptSubmit || !preparation.payloadCandidate) {
        onSubmitAttemptStateChange?.({
          status: "idle",
          message: "Submit did not start because current draft is blocked.",
          errorSummary: null,
        });
        return;
      }

      setActiveSubmitStatus("submitting");
      onSubmitAttemptStateChange?.({
        status: "submitting",
        message: t("home_beauty.booking.submitting_images"),
        errorSummary: null,
      });

      try {
        const currentStateDrafts = snapshot.state.customerDetails.currentStateImages;
        const desiredStyleDrafts = snapshot.state.customerDetails.desiredStyleImages;

        const hasImages = currentStateDrafts.length > 0 || desiredStyleDrafts.length > 0;

        if (hasImages) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error(t("home_beauty.booking.login_required"));
          }
        }

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
          const { data: sessionData } = await supabase.auth.getSession();
          result = await submitBeautyBooking(preparation.payloadCandidate, sessionData.session?.access_token);
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
        onSubmitAttemptStateChange?.({
          status: "submitted",
          message: `${t("home_beauty.booking.booking_completed")} (ID: ${result.bookingId})`,
          errorSummary: null,
        });
      } catch (err: unknown) {
        setActiveSubmitStatus("submit-error");
        const errorMessage = err instanceof Error ? err.message : t("home_beauty.booking.booking_failed");
        onSubmitAttemptStateChange?.({
          status: "submit-error",
          message: errorMessage,
          errorSummary: "Submission failed.",
        });
      }
    },
    [
      activeSubmitStatus,
      onSubmitAttemptStateChange,
      onSubmitPreparationChange,
      uploadedImageUrls,
      t,
    ]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(circle at top left, rgba(244, 91, 135, 0.08), transparent 35%), radial-gradient(circle at top right, rgba(75, 58, 66, 0.06), transparent 30%), linear-gradient(180deg, #ffffff 0%, #fcf7f8 100%)'
      }}
    >
      <div className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-bottom duration-300">
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
                storeContext={storeContext}
                onImageUploadBridgeRequest={handleImageUploadBridgeRequest}
                completedImageUploadResult={completedImageUploadResult}
                onDraftStateChange={handleDraftStateChange}
                onSubmitIntent={handleSubmitIntent}
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
