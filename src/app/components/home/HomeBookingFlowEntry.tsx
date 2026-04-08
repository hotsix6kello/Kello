'use client';

import { useCallback, useEffect, useMemo, useRef } from "react";
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
import type {
  HomeBookingDraftReadySequenceSnapshot,
  HomeBookingFlowEntryProps,
  SkeletonSubmitAttemptStatus,
} from "./HomeBookingFlowEntry.types";
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
  t: _,
  storeContext,
  onDraftReady,
  onDraftDebugStateChange,
  onSubmitPreparationChange,
  uploadedImageUrls,
  completedImageUploadResult,
  onSubmitAttemptStateChange,
  skeletonDebugPanel,
  onResolvedMode,
}: HomeBookingFlowEntryProps) {
  const draftSequenceSnapshotRef = useRef<HomeBookingDraftReadySequenceSnapshot>({
    lastEmittedSignature: null,
  });
  const submitAttemptStatusRef = useRef<SkeletonSubmitAttemptStatus>("idle");
  const localImageFilesRef = useRef<Map<string, File>>(new Map());

  const skeletonInitialCategory = useMemo(
    () => resolveSkeletonCategoryFromLegacy(initialCategory),
    [initialCategory],
  );

  useEffect(() => {
    onResolvedMode?.("skeleton");
  }, [onResolvedMode]);

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
          // Keep draftStateChange debug payload read-only and step3-state-derived only.
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

      if (submitAttemptStatusRef.current === "submitting") {
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

      if (submitAttemptStatusRef.current === "submitted") {
        onSubmitAttemptStateChange?.({
          status: "submitted",
          message: "Submit already completed for this skeleton session.",
          errorSummary: null,
        });
        return;
      }

      submitAttemptStatusRef.current = "submitting";
      onSubmitAttemptStateChange?.({
        status: "submitting",
        message: "이미지를 업로드하고 있어요...",
        errorSummary: null,
      });

      try {
        // Multi-image upload phase (Parallel)
        const currentStateDrafts = snapshot.state.customerDetails.currentStateImages;
        const desiredStyleDrafts = snapshot.state.customerDetails.desiredStyleImages;

        // Match files with drafts from the local map
        const currentStateFiles = currentStateDrafts
          .map(d => localImageFilesRef.current.get(d.id))
          .filter((f): f is File => !!f);
        
        const desiredStyleFiles = desiredStyleDrafts
          .map(d => localImageFilesRef.current.get(d.id))
          .filter((f): f is File => !!f);

        // We take the first image if multiple are present, or handle according to requirement (usually one each)
        const currentUploadPromise = currentStateFiles[0] 
          ? uploadBookingImage(currentStateFiles[0], 'current')
          : Promise.resolve(null);
          
        const styleUploadPromise = desiredStyleFiles[0]
          ? uploadBookingImage(desiredStyleFiles[0], 'style')
          : Promise.resolve(null);

        const [currentResult, styleResult] = await Promise.all([currentUploadPromise, styleUploadPromise]);

        if (currentResult?.error || styleResult?.error) {
          throw new Error(`이미지 업로드 실패: ${currentResult?.error || styleResult?.error}`);
        }

        // Enrich the draft with the uploaded URLs
        if (preparation.payloadCandidate) {
          preparation.payloadCandidate.customer.currentImageUrl = currentResult?.url ?? undefined;
          preparation.payloadCandidate.customer.styleImageUrl = styleResult?.url ?? undefined;
        }

        onSubmitAttemptStateChange?.({
          status: "submitting",
          message: "예약 요청을 보내는 중입니다...",
          errorSummary: null,
        });

        const result = await submitBeautyBooking(preparation.payloadCandidate);
        submitAttemptStatusRef.current = "submitted";
        onSubmitAttemptStateChange?.({
          status: "submitted",
          message: `예약이 완료되었습니다! (ID: ${result.bookingId})`,
          errorSummary: null,
        });
      } catch (err: unknown) {
        submitAttemptStatusRef.current = "submit-error";
        const errorMessage = err instanceof Error ? err.message : "예약 제출 중 오류가 발생했습니다.";
        onSubmitAttemptStateChange?.({
          status: "submit-error",
          message: errorMessage,
          errorSummary: "Submission failed.",
        });
      }
    },
    [
      onSubmitAttemptStateChange,
      onSubmitPreparationChange,
      uploadedImageUrls,
    ],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[400] flex justify-center bg-black/60 sm:bg-black/40">
      <div className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-bottom duration-300">
        <button
          type="button"
          onClick={() => onClose()}
          className="absolute left-3 top-6 z-[50] flex items-center justify-center text-neutral-500 transition-colors hover:text-neutral-900"
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
            <BookingFlowSkeleton
              initialCategory={skeletonInitialCategory}
              storeContext={storeContext}
              onImageUploadBridgeRequest={handleImageUploadBridgeRequest}
              completedImageUploadResult={completedImageUploadResult}
              onDraftStateChange={handleDraftStateChange}
              onSubmitIntent={handleSubmitIntent}
            />
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
