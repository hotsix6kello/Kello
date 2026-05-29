import {
  buildBookingUploadedImageResultCompletionsFromBridgeItems,
  type BookingImageUploadBridgeAdapter,
  type BookingImageUploadBridgeItem,
} from "./uploadedImageResults.ts";

// This mock lives beside the shared adapter interface/helper so page-level orchestration can swap
// mock and future real uploaders without changing the request -> completion seam.
export function createMockBookingImageUploadBridgeAdapter(input: {
  resolveUploadedUrl: (
    item: Pick<BookingImageUploadBridgeItem, "stateKey" | "draft">,
    index: number,
  ) => string;
}): BookingImageUploadBridgeAdapter {
  return async (items) =>
    buildBookingUploadedImageResultCompletionsFromBridgeItems({
      items,
      resolveUploadedUrl: input.resolveUploadedUrl,
    });
}
