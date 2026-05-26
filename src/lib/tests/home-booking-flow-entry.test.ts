import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const pageSource = readFileSync(
  new URL("../../app/page.tsx", import.meta.url),
  "utf8",
);

const entrySource = readFileSync(
  new URL("../../app/components/home/HomeBookingFlowEntry.tsx", import.meta.url),
  "utf8",
);

await run("home page still opens booking through HomeBookingFlowEntry", () => {
  assert.match(pageSource, /<HomeBookingFlowEntry/);
});

await run("home page no longer passes skeleton mode or skeleton debug props", () => {
  assert.doesNotMatch(pageSource, /mode=\{/);
  assert.doesNotMatch(pageSource, /enableSkeletonMode=/);
  assert.doesNotMatch(pageSource, /skeletonDebugPanel=/);
});

await run("HomeBookingFlowEntry uses BookingFlowSkeleton as the active booking flow", () => {
  assert.match(entrySource, /BookingFlowSkeleton/);
  assert.doesNotMatch(entrySource, /HomeBeautyBookingFlow/);
});
