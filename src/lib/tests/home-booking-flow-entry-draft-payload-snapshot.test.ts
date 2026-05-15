import assert from "node:assert/strict";

import { resolveHomeBookingDraftReadyEmission } from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";
import type { BookingFlowState } from "../bookings/bookingFlowSkeleton/types.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await run("draft emission snapshot keeps final payload policy for complete skeleton state", () => {
  const state: BookingFlowState = {
    currentStep: "customer-details",
    category: "aesthetic",
    selectedServiceId: "aesthetic-basic-care",
    selectedDate: "2026-11-20",
    selectedTime: null,
    customerDetails: {
      name: "Jina",
      phone: "+821012345678",
      requestNote: "Calming focus",
      profileSource: "none",
      profileSnapshot: null,
      currentStateImages: [
        {
          id: "current-skin-1",
          kind: "current-state",
          fileName: "current-skin.jpg",
          fileSize: 1111,
          mimeType: "image/jpeg",
        },
      ],
      desiredStyleImages: [
        {
          id: "desired-result-1",
          kind: "desired-style",
          fileName: "desired-result.jpg",
          fileSize: 2222,
          mimeType: "image/jpeg",
        },
      ],
    },
    confirmation: {
      serviceTermsAgreed: false,
      privacyPolicyAgreed: false,
      thirdPartySharingAgreed: false,
      marketingConsentAgreed: false,
    },
  };

  const result = resolveHomeBookingDraftReadyEmission({
    timingInput: {
      resolvedMode: "skeleton",
      enableSkeletonMode: true,
      currentStep: "customer-details",
      selectedServiceId: state.selectedServiceId,
      selectedDate: state.selectedDate,
      customerName: state.customerDetails.name,
      customerContact: state.customerDetails.phone,
      previousEmittedSignature: null,
    },
    draftInput: {
      state,
      storeContext: {
        storeId: "store-skin-42",
        storeName: "Skin Studio",
        region: "Seoul",
      },
      primaryServiceName: "Aesthetic basic care",
    },
  });

  assert.equal(result.shouldEmit, true);
  assert.equal(result.reason, "ready");
  assert.notEqual(result.payload, null);

  const payload = result.payload!;
  assert.equal(payload.category.legacyCategory, "esthetic");
  assert.equal(payload.schedule.bookingTime, "10:00");
  assert.equal(payload.store.storeId, "store-skin-42");
  assert.equal(payload.store.storeName, "Skin Studio");
  assert.equal(payload.store.region, "Seoul");
  assert.equal(payload.images.flattened[0]?.sourceGroup, "currentStateImages");
  assert.equal(payload.images.flattened[1]?.sourceGroup, "desiredStyleImages");
  assert.equal(payload.unresolved.missingStoreId, false);
  assert.equal(payload.customer.request, "Calming focus");

  assert.deepStrictEqual(payload, {
    category: {
      newCategory: "aesthetic",
      legacyCategory: "esthetic",
    },
    store: {
      storeId: "store-skin-42",
      storeName: "Skin Studio",
      region: "Seoul",
    },
    schedule: {
      bookingDate: "2026-11-20",
      bookingTime: "10:00",
      usesPlaceholderTime: true,
      strategy: "fixed-placeholder",
      unresolvedReason: null,
    },
    service: {
      primaryServiceId: "aesthetic-basic-care",
      primaryServiceName: "Aesthetic basic care",
    },
    customer: {
      name: "Jina",
      phone: "+821012345678",
      request: "Calming focus",
    },
    images: {
      flattened: [
        {
          id: "current-skin-1",
          sourceGroup: "currentStateImages",
          sourceKind: "current-state",
          fileName: "current-skin.jpg",
          fileSize: 1111,
          mimeType: "image/jpeg",
          flatIndex: 0,
          groupIndex: 0,
        },
        {
          id: "desired-result-1",
          sourceGroup: "desiredStyleImages",
          sourceKind: "desired-style",
          fileName: "desired-result.jpg",
          fileSize: 2222,
          mimeType: "image/jpeg",
          flatIndex: 1,
          groupIndex: 0,
        },
      ],
      currentStateCount: 1,
      desiredStyleCount: 1,
      totalCount: 2,
      preserveSourceMetadata: true,
    },
    agreements: {
      serviceTermsAgreed: false,
      privacyPolicyAgreed: false,
      thirdPartySharingAgreed: false,
      marketingConsentAgreed: false,
      source: "placeholder-default",
    },
    unresolved: {
      missingStoreId: false,
      missingBookingDate: false,
      bookingTimeIsPlaceholder: true,
    },
  });
});



