import assert from "node:assert/strict";

import { shouldShowSkeletonDraftDebugPanel } from "../../app/components/home/HomeBookingFlowEntry.helpers.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await run("legacy booking (flow missing) keeps debug panel hidden", () => {
  const visible = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: false,
    debugParam: null,
  });

  assert.equal(visible, false);
});

await run("skeleton flow without debug=draft keeps panel hidden", () => {
  const visible = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: null,
  });

  assert.equal(visible, false);
});

await run("debug only without skeleton flow keeps panel hidden", () => {
  const visible = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: false,
    debugParam: "draft",
  });

  assert.equal(visible, false);
});

await run("skeleton flow with debug=draft shows panel", () => {
  const visible = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: "draft",
  });

  assert.equal(visible, true);
});

await run("non-skeleton flow equivalent keeps panel hidden", () => {
  const flow: string = "legacy";
  const visible = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: flow === "skeleton",
    debugParam: "draft",
  });

  assert.equal(visible, false);
});

await run("debug value other than draft keeps panel hidden", () => {
  const visible = shouldShowSkeletonDraftDebugPanel({
    isSkeletonFlowEnabled: true,
    debugParam: "verbose",
  });

  assert.equal(visible, false);
});
