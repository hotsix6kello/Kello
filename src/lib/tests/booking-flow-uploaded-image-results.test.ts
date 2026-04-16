import assert from "node:assert/strict";

import {
  applyBookingUploadedImageResultToFlowState,
  buildBookingUploadedImageResultCompletion,
  buildBookingUploadedImageResultCompletionsFromBridgeItems,
  writeBookingUploadedImageResultToCustomerDetails,
} from "../bookings/bookingFlowSkeleton/uploadedImageResults.ts";
import { createMockBookingImageUploadBridgeAdapter } from "../bookings/bookingFlowSkeleton/mockUploadBridgeAdapter.ts";
import type { BookingCustomerDetailsState, BookingFlowState } from "../bookings/bookingFlowSkeleton/types.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createCustomerDetails(): BookingCustomerDetailsState {
  return {
    name: "Mina",
    phone: "01012345678",
    requestNote: "Natural look",
    profileSource: "none",
    profileSnapshot: null,
    currentStateImages: [
      {
        id: "current-1",
        kind: "current-state",
        fileName: "current-front.jpg",
        fileSize: 1200,
        mimeType: "image/jpeg",
      },
    ],
    desiredStyleImages: [
      {
        id: "desired-1",
        kind: "desired-style",
        fileName: "desired-style.jpg",
        fileSize: 2200,
        mimeType: "image/jpeg",
      },
    ],
    uploadedImageResults: {
      currentStateImages: [
        {
          draftImageId: "current-1",
          uploadedUrl: "https://cdn.test/current-old.jpg",
        },
      ],
      desiredStyleImages: [],
    },
  };
}

function createFlowState(): BookingFlowState {
  return {
    currentStep: "customer-details",
    category: "hair",
    selectedServiceId: "hair-cut",
    selectedDate: "2026-12-12",
    selectedTime: "14:30",
    customerDetails: createCustomerDetails(),
    confirmation: {
      bookingConfirmed: false,
      privacyConsent: false,
    },
  };
}

await run("uploaded image result writer replaces same draft id with the latest uploaded url", () => {
  const details = createCustomerDetails();

  const nextDetails = writeBookingUploadedImageResultToCustomerDetails({
    details,
    stateKey: "currentStateImages",
    draftImageId: " current-1 ",
    uploadedUrl: " https://cdn.test/current-latest.jpg ",
  });

  assert.notEqual(nextDetails, details);
  assert.deepStrictEqual(nextDetails.uploadedImageResults, {
    currentStateImages: [
      {
        draftImageId: "current-1",
        uploadedUrl: "https://cdn.test/current-latest.jpg",
      },
    ],
    desiredStyleImages: [],
  });
  assert.equal(nextDetails.currentStateImages, details.currentStateImages);
  assert.equal(nextDetails.desiredStyleImages, details.desiredStyleImages);
});

await run("uploaded image result writer ignores stale writes after the draft image is gone", () => {
  const details = createCustomerDetails();
  const resetDetails: BookingCustomerDetailsState = {
    ...details,
    currentStateImages: [],
    uploadedImageResults: {
      currentStateImages: [],
      desiredStyleImages: [],
    },
  };

  const nextDetails = writeBookingUploadedImageResultToCustomerDetails({
    details: resetDetails,
    stateKey: "currentStateImages",
    draftImageId: "current-1",
    uploadedUrl: "https://cdn.test/stale-result.jpg",
  });

  assert.equal(nextDetails, resetDetails);
  assert.deepStrictEqual(nextDetails.uploadedImageResults, {
    currentStateImages: [],
    desiredStyleImages: [],
  });
});

await run("flow-state upload result bridge writes uploaded refs and keeps repeated completions idempotent", () => {
  const state = createFlowState();

  const nextState = applyBookingUploadedImageResultToFlowState({
    state,
    result: {
      stateKey: "desiredStyleImages",
      draftImageId: "desired-1",
      uploadedUrl: "https://cdn.test/desired-latest.jpg",
    },
  });

  assert.notEqual(nextState, state);
  assert.deepStrictEqual(nextState.customerDetails.uploadedImageResults, {
    currentStateImages: [
      {
        draftImageId: "current-1",
        uploadedUrl: "https://cdn.test/current-old.jpg",
      },
    ],
    desiredStyleImages: [
      {
        draftImageId: "desired-1",
        uploadedUrl: "https://cdn.test/desired-latest.jpg",
      },
    ],
  });
  assert.equal(nextState.currentStep, state.currentStep);
  assert.equal(nextState.selectedServiceId, state.selectedServiceId);

  const repeatedState = applyBookingUploadedImageResultToFlowState({
    state: nextState,
    result: {
      stateKey: "desiredStyleImages",
      draftImageId: "desired-1",
      uploadedUrl: "https://cdn.test/desired-latest.jpg",
    },
  });

  assert.equal(repeatedState, nextState);
});

await run("upload bridge item can be converted into a minimal completion object after success", () => {
  const completion = buildBookingUploadedImageResultCompletion({
    item: {
      stateKey: "currentStateImages",
      draft: {
        id: "current-1",
        kind: "current-state",
        fileName: "current-front.jpg",
        fileSize: 1200,
        mimeType: "image/jpeg",
      },
    },
    uploadedUrl: " https://cdn.test/current-success.jpg ",
  });

  assert.deepStrictEqual(completion, {
    stateKey: "currentStateImages",
    draftImageId: "current-1",
    uploadedUrl: "https://cdn.test/current-success.jpg",
  });
});

await run("bridge request items can be mapped into completion objects for an outer mock caller seam", () => {
  const completions = buildBookingUploadedImageResultCompletionsFromBridgeItems({
    items: [
      {
        stateKey: "currentStateImages",
        draft: {
          id: "current-1",
          kind: "current-state",
          fileName: "current-front.jpg",
          fileSize: 1200,
          mimeType: "image/jpeg",
        },
      },
      {
        stateKey: "desiredStyleImages",
        draft: {
          id: "desired-1",
          kind: "desired-style",
          fileName: "desired-style.jpg",
          fileSize: 2200,
          mimeType: "image/jpeg",
        },
      },
    ],
    resolveUploadedUrl: (item, index) =>
      `https://debug.local/mock-bridge/${item.stateKey}/${index + 1}.jpg`,
  });

  assert.deepStrictEqual(completions, [
    {
      stateKey: "currentStateImages",
      draftImageId: "current-1",
      uploadedUrl: "https://debug.local/mock-bridge/currentStateImages/1.jpg",
    },
    {
      stateKey: "desiredStyleImages",
      draftImageId: "desired-1",
      uploadedUrl: "https://debug.local/mock-bridge/desiredStyleImages/2.jpg",
    },
  ]);
});

await run("mock upload bridge adapter keeps the same request-to-completion seam for a future uploader swap", async () => {
  const adapter = createMockBookingImageUploadBridgeAdapter({
    resolveUploadedUrl: (item, index) =>
      `https://debug.local/mock-adapter/${item.stateKey}/${index + 1}.jpg`,
  });

  const completions = await adapter([
    {
      stateKey: "currentStateImages",
      draft: {
        id: "current-1",
        kind: "current-state",
        fileName: "current-front.jpg",
        fileSize: 1200,
        mimeType: "image/jpeg",
      },
      file: new File(["current"], "current-front.jpg", { type: "image/jpeg" }),
    },
  ]);

  assert.deepStrictEqual(completions, [
    {
      stateKey: "currentStateImages",
      draftImageId: "current-1",
      uploadedUrl: "https://debug.local/mock-adapter/currentStateImages/1.jpg",
    },
  ]);
});
