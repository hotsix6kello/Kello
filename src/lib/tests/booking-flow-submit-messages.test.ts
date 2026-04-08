import assert from "node:assert/strict";

import {
  resolveLegacySubmitStatusCopy,
} from "../bookings/bookingFlowSkeleton/submitMessages.ts";
import {
  LEGACY_SUBMIT_ADAPTER_BLOCKERS,
  type LegacySubmitAdapterBlocker,
} from "../bookings/bookingFlowSkeleton/submitAdapter.ts";
import type { LegacySubmitUiState } from "../bookings/bookingFlowSkeleton/submitUiState.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createUiState(
  overrides: Partial<LegacySubmitUiState> & Pick<LegacySubmitUiState, "uiState">,
): LegacySubmitUiState {
  return {
    uiState: overrides.uiState,
    primaryMessage: overrides.primaryMessage ?? "base-message",
    blockers: overrides.blockers ?? [],
    canSubmit: overrides.canSubmit ?? false,
    hasPayload: overrides.hasPayload ?? false,
    payloadPreview: overrides.payloadPreview ?? null,
    sourceStatus: overrides.sourceStatus ?? "none",
  };
}

await run("submit messages: submit-ready copy is positive but not misleading as submitted", () => {
  const uiState = createUiState({
    uiState: "submit-ready",
    canSubmit: true,
    hasPayload: true,
    sourceStatus: "ready-to-submit",
  });

  const copy = resolveLegacySubmitStatusCopy(uiState);

  assert.equal(copy.title, "Submit ready (preview)");
  assert.equal(copy.tone, "success");
  assert.ok(copy.message.toLowerCase().includes("not mean the request was submitted".toLowerCase()));
  assert.equal(copy.isUserFacingSafe, true);
});

await run("submit messages: show-blockers copy provides warning with blocker summary", () => {
  const uiState = createUiState({
    uiState: "show-blockers",
    blockers: [LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId],
    sourceStatus: "blocked",
  });

  const copy = resolveLegacySubmitStatusCopy(uiState);

  assert.equal(copy.title, "Submit blocked");
  assert.equal(copy.tone, "warning");
  assert.ok(copy.message.includes("Resolve blockers"));
  assert.notEqual(copy.blockerSummary, null);
  assert.ok(copy.blockerSummary?.includes("Store ID is missing"));
});

await run("submit messages: invalid-plan copy clearly reports non-invocable state", () => {
  const uiState = createUiState({
    uiState: "invalid-plan",
    canSubmit: false,
    hasPayload: false,
    sourceStatus: "invalid-plan",
  });

  const copy = resolveLegacySubmitStatusCopy(uiState);

  assert.equal(copy.title, "Submit plan invalid");
  assert.equal(copy.tone, "danger");
  assert.ok(copy.message.includes("cannot be attempted"));
});

await run("submit messages: idle copy stays informational and non-submitted", () => {
  const uiState = createUiState({
    uiState: "idle",
    sourceStatus: "none",
  });

  const copy = resolveLegacySubmitStatusCopy(uiState);

  assert.equal(copy.title, "Submit preparation pending");
  assert.equal(copy.tone, "info");
  assert.ok(copy.message.includes("prepare a submit plan"));
  assert.equal(copy.blockerSummary, null);
});

await run("submit messages: multiple blockers are summarized with cap and +N remainder", () => {
  const blockers: LegacySubmitAdapterBlocker[] = [
    LEGACY_SUBMIT_ADAPTER_BLOCKERS.missingStoreId,
    LEGACY_SUBMIT_ADAPTER_BLOCKERS.bookingTimePlaceholder,
    LEGACY_SUBMIT_ADAPTER_BLOCKERS.privacyConsentRequired,
  ];
  const uiState = createUiState({
    uiState: "show-blockers",
    blockers,
    sourceStatus: "blocked",
  });

  const copy = resolveLegacySubmitStatusCopy(uiState);

  assert.equal(copy.tone, "warning");
  assert.equal(copy.blockerSummary, "Store ID is missing, Booking time is still placeholder +1 more");
});
