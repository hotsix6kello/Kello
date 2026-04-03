import assert from "node:assert/strict";

import {
  isInternationalPhoneInputValid,
  normalizeInternationalPhoneInput,
  sanitizeSnsInput,
} from "../settings/contact.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await run("international phone input normalizes to E.164-style compact format", () => {
  assert.equal(normalizeInternationalPhoneInput("+82 10 1234 5678"), "+821012345678");
  assert.equal(normalizeInternationalPhoneInput("+1 (415) 555-0100"), "+14155550100");
});

await run("international phone input rejects numbers without a country code prefix", () => {
  assert.equal(normalizeInternationalPhoneInput("010-1234-5678"), null);
  assert.equal(isInternationalPhoneInputValid("010-1234-5678"), false);
});

await run("blank international phone input stays optional", () => {
  assert.equal(normalizeInternationalPhoneInput("   "), null);
  assert.equal(isInternationalPhoneInputValid("   "), true);
});

await run("sns input trims surrounding whitespace and clears empty input", () => {
  assert.equal(sanitizeSnsInput("  @kello_user  "), "@kello_user");
  assert.equal(sanitizeSnsInput("   "), null);
});
