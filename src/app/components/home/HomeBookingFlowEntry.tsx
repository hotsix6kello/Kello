'use client';

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BookingFlowSkeleton,
  type BookingFlowSkeletonDraftStateSnapshot,
} from "@/components/booking/flow-skeleton";
import {
  buildHomeBookingDraftDebugState,
  resolveHomeBookingDraftReadySequence,
  resolveHomeBookingUploadedImageUrls,
  resolveSkeletonCategoryFromLegacy,
  buildHomeBookingLegacyDraftFromSkeletonState,
} from "./HomeBookingFlowEntry.helpers";

import { runLegacySubmitPreparation } from "@/lib/bookings/bookingFlowSkeleton/submitRunner";
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
  t: _t,
  storeContext,
  onDraftReady,
  onDraftDebugStateChange,
  onSubmitPreparationChange,
  uploadedImageUrls,
  onImageUploadBridgeRequest,
  completedImageUploadResult,
  onSubmitAttemptStateChange,
  skeletonDebugPanel,
  onResolvedMode,
}: HomeBookingFlowEntryProps) {
  const draftSequenceSnapshotRef = useRef<HomeBookingDraftReadySequenceSnapshot>({
    lastEmittedSignature: null,
  });
  const submitAttemptStatusRef = useRef<SkeletonSubmitAttemptStatus>("idle");

  const skeletonInitialCategory = useMemo(
    () => resolveSkeletonCategoryFromLegacy(initialCategory),
    [initialCategory],
  );

  useEffect(() => {
    onResolvedMode?.("skeleton");
  }, [onResolvedMode]);

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
        message: "Submitting booking request...",
        errorSummary: null,
      });
      try {
        // Submit path still never uploads images here; completed upload refs must arrive via step3 bridge seam.
        const result = await submitBeautyBooking(preparation.payloadCandidate);
        submitAttemptStatusRef.current = "submitted";
        onSubmitAttemptStateChange?.({
          status: "submitted",
          message: `Submit completed with booking id ${result.bookingId}.`,
          errorSummary: null,
        });
      } catch {
        submitAttemptStatusRef.current = "submit-error";
        onSubmitAttemptStateChange?.({
          status: "submit-error",
          message: "Submit failed in skeleton debug path.",
          errorSummary: "Submit request failed.",
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
              onImageUploadBridgeRequest={onImageUploadBridgeRequest}
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
