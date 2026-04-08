import type {
  BookingCustomerDetailsState,
  BookingImageDraft,
  BookingFlowState,
  BookingImageGroupStateKey,
  BookingUploadedImageResultState,
} from "./types.ts";

export type WriteBookingUploadedImageResultInput = {
  details: BookingCustomerDetailsState;
  stateKey: BookingImageGroupStateKey;
  draftImageId: string;
  uploadedUrl: string;
};

export type BookingUploadedImageResultCompletion = {
  stateKey: BookingImageGroupStateKey;
  draftImageId: string;
  uploadedUrl: string;
};

export type BookingImageUploadBridgeItem = {
  stateKey: BookingImageGroupStateKey;
  draft: BookingImageDraft;
  file: File;
};

// Upload bridge adapters only translate step3 request items into upload completions.
// `File` stays at this adapter boundary, while submit continues to trust only `string[] uploadedImageUrls`.
// Future partial-failure or retry policy is intentionally left out of scope for this turn.
export type BookingImageUploadBridgeAdapterInput = ReadonlyArray<BookingImageUploadBridgeItem>;
export type BookingImageUploadBridgeAdapterOutput = BookingUploadedImageResultCompletion[];
export type BookingImageUploadBridgeAdapter = (
  items: BookingImageUploadBridgeAdapterInput,
) => Promise<BookingImageUploadBridgeAdapterOutput>;

function createEmptyUploadedImageResultState(): BookingUploadedImageResultState {
  return {
    currentStateImages: [],
    desiredStyleImages: [],
  };
}

function normalizeRequiredText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function writeBookingUploadedImageResultToCustomerDetails(
  input: WriteBookingUploadedImageResultInput,
): BookingCustomerDetailsState {
  const draftImageId = normalizeRequiredText(input.draftImageId);
  const uploadedUrl = normalizeRequiredText(input.uploadedUrl);

  if (!draftImageId || !uploadedUrl) {
    return input.details;
  }

  const selectedImages = input.details[input.stateKey];
  const hasSelectedDraftImage = selectedImages.some((item) => item.id === draftImageId);

  // Ignore stale upload completions when the draft image no longer exists in step3 state.
  if (!hasSelectedDraftImage) {
    return input.details;
  }

  const uploadedImageResults =
    input.details.uploadedImageResults ?? createEmptyUploadedImageResultState();
  const existingGroupItem = uploadedImageResults[input.stateKey].find(
    (item) => item.draftImageId === draftImageId,
  );

  if (existingGroupItem?.uploadedUrl === uploadedUrl) {
    return input.details;
  }

  const nextGroupItems = [
    ...uploadedImageResults[input.stateKey].filter((item) => item.draftImageId !== draftImageId),
    {
      draftImageId,
      uploadedUrl,
    },
  ];

  return {
    ...input.details,
    uploadedImageResults: {
      ...uploadedImageResults,
      [input.stateKey]: nextGroupItems,
    },
  };
}

export function applyBookingUploadedImageResultToFlowState(input: {
  state: BookingFlowState;
  result: BookingUploadedImageResultCompletion | null | undefined;
}): BookingFlowState {
  if (!input.result) {
    return input.state;
  }

  const nextCustomerDetails = writeBookingUploadedImageResultToCustomerDetails({
    details: input.state.customerDetails,
    stateKey: input.result.stateKey,
    draftImageId: input.result.draftImageId,
    uploadedUrl: input.result.uploadedUrl,
  });

  if (nextCustomerDetails === input.state.customerDetails) {
    return input.state;
  }

  return {
    ...input.state,
    customerDetails: nextCustomerDetails,
  };
}

export function buildBookingUploadedImageResultCompletion(input: {
  item: Pick<BookingImageUploadBridgeItem, "stateKey" | "draft">;
  uploadedUrl: string;
}): BookingUploadedImageResultCompletion | null {
  const draftImageId = normalizeRequiredText(input.item.draft.id);
  const uploadedUrl = normalizeRequiredText(input.uploadedUrl);

  if (!draftImageId || !uploadedUrl) {
    return null;
  }

  return {
    stateKey: input.item.stateKey,
    draftImageId,
    uploadedUrl,
  };
}

export function buildBookingUploadedImageResultCompletionsFromBridgeItems(input: {
  items: ReadonlyArray<Pick<BookingImageUploadBridgeItem, "stateKey" | "draft">>;
  resolveUploadedUrl: (
    item: Pick<BookingImageUploadBridgeItem, "stateKey" | "draft">,
    index: number,
  ) => string;
}): BookingUploadedImageResultCompletion[] {
  return input.items.flatMap((item, index) => {
    const completion = buildBookingUploadedImageResultCompletion({
      item,
      uploadedUrl: input.resolveUploadedUrl(item, index),
    });

    return completion ? [completion] : [];
  });
}
