import type { LegacyBookingDraftFromSkeleton } from "@/lib/bookings/bookingFlowSkeleton/bridge";

export type LegacySubmitImageReadinessKind =
  | "no-images-selected"
  | "images-selected-upload-pending"
  | "images-upload-ready";

export type ResolveLegacySubmitImageReadinessInput = {
  draft: LegacyBookingDraftFromSkeleton | null;
  uploadedImageUrls?: string[];
};

export type LegacySubmitImageReadiness = {
  kind: LegacySubmitImageReadinessKind;
  selectedImageCount: number;
  uploadedImageUrlCount: number;
  expectedUploadedImageUrlCount: number;
  requiresUpload: boolean;
  isUploadSatisfied: boolean;
  shouldBlockSubmitUntilUpload: boolean;
};

function normalizeUploadedImageUrls(value: string[] | undefined): string[] {
  if (!value || value.length === 0) {
    return [];
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

export function resolveLegacySubmitImageReadiness(
  input: ResolveLegacySubmitImageReadinessInput,
): LegacySubmitImageReadiness {
  const selectedImageCount = input.draft?.images.totalCount ?? 0;
  const uploadedImageUrls = normalizeUploadedImageUrls(input.uploadedImageUrls);
  const uploadedImageUrlCount = uploadedImageUrls.length;
  const requiresUpload = selectedImageCount > 0;
  const isUploadSatisfied = !requiresUpload || uploadedImageUrlCount >= selectedImageCount;

  if (!requiresUpload) {
    return {
      kind: "no-images-selected",
      selectedImageCount,
      uploadedImageUrlCount,
      expectedUploadedImageUrlCount: selectedImageCount,
      requiresUpload,
      isUploadSatisfied,
      shouldBlockSubmitUntilUpload: false,
    };
  }

  if (!isUploadSatisfied) {
    return {
      kind: "images-selected-upload-pending",
      selectedImageCount,
      uploadedImageUrlCount,
      expectedUploadedImageUrlCount: selectedImageCount,
      requiresUpload,
      isUploadSatisfied,
      shouldBlockSubmitUntilUpload: true,
    };
  }

  return {
    kind: "images-upload-ready",
    selectedImageCount,
    uploadedImageUrlCount,
    expectedUploadedImageUrlCount: selectedImageCount,
    requiresUpload,
    isUploadSatisfied,
    shouldBlockSubmitUntilUpload: false,
  };
}

