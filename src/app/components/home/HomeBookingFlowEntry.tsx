'use client';

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BookingFlowSkeleton,
  type BookingFlowSkeletonDraftStateSnapshot,
} from "@/components/booking/flow-skeleton";
import {
  buildHomeBookingDraftDebugState,
  resolveHomeBookingDraftReadySequence,
  resolveHomeBookingMode,
  resolveHomeBookingUploadedImageUrls,
  resolveSkeletonCategoryFromLegacy,
  buildHomeBookingLegacyDraftFromSkeletonState,
} from "./HomeBookingFlowEntry.helpers";
import HomeBeautyBookingFlow from "./HomeBeautyBookingFlow";
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
  t,
  mode = "legacy",
  enableSkeletonMode = false,
  storeContext,
  onDraftReady,
  onDraftDebugStateChange,
  onSubmitPreparationChange,
  uploadedImageUrls,
  onImageUploadBridgeRequest,
  completedImageUploadResult,
  onSubmitAttemptStateChange,
  onResolvedMode,
}: HomeBookingFlowEntryProps) {
  const resolvedMode = resolveHomeBookingMode({ mode, enableSkeletonMode });
  const draftSequenceSnapshotRef = useRef<HomeBookingDraftReadySequenceSnapshot>({
    lastEmittedSignature: null,
  });
  const submitAttemptStatusRef = useRef<SkeletonSubmitAttemptStatus>("idle");

  const skeletonInitialCategory = useMemo(
    () => resolveSkeletonCategoryFromLegacy(initialCategory),
    [initialCategory],
  );

  useEffect(() => {
    onResolvedMode?.(resolvedMode);
  }, [onResolvedMode, resolvedMode]);

  useEffect(() => {
    if (resolvedMode !== "skeleton") {
      draftSequenceSnapshotRef.current = { lastEmittedSignature: null };
      submitAttemptStatusRef.current = "idle";
      onSubmitAttemptStateChange?.({
        status: "idle",
        message: null,
        errorSummary: null,
      });
    }
  }, [onSubmitAttemptStateChange, resolvedMode]);

  const handleDraftStateChange = useCallback(
    (snapshot: BookingFlowSkeletonDraftStateSnapshot) => {
      if (resolvedMode !== "skeleton") {
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
          resolvedMode,
          enableSkeletonMode,
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
      enableSkeletonMode,
      onDraftDebugStateChange,
      onDraftReady,
      onSubmitPreparationChange,
      resolvedMode,
      uploadedImageUrls,
    ],
  );

  const handleSubmitIntent = useCallback(
    async (snapshot: BookingFlowSkeletonDraftStateSnapshot) => {
      if (resolvedMode !== "skeleton") {
        return;
      }

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
      resolvedMode,
      uploadedImageUrls,
    ],
  );

  // NOTE: Keep legacy as hard default until Home runtime rollout is explicitly started.
  if (resolvedMode === "skeleton") {
    // NOTE: Draft bridge hooks (store/deeplink/submit adapter) are intentionally not wired yet.
    return (
      <BookingFlowSkeleton
        initialCategory={skeletonInitialCategory}
        storeContext={storeContext}
        onImageUploadBridgeRequest={onImageUploadBridgeRequest}
        completedImageUploadResult={completedImageUploadResult}
        onDraftStateChange={handleDraftStateChange}
        onSubmitIntent={handleSubmitIntent}
      />
    );
  }

  return (
    <HomeBeautyBookingFlow
      isOpen={isOpen}
      onClose={onClose}
      initialCategory={initialCategory}
      t={t}
    />
  );
}
