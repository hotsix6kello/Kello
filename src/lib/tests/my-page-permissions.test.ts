import assert from "node:assert/strict";

import { getMyPageCapabilities } from "../../app/my/pagePermissions.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await run("admin accounts only see the admin console capability", () => {
  const capabilities = getMyPageCapabilities({
    permissionsResolved: true,
    profileRole: "admin",
    partnerStatus: "approved",
  });

  assert.equal(capabilities.canViewAdminConsole, true);
  assert.equal(capabilities.showPartnerBanner, false);
  assert.equal(capabilities.canApplyForPartner, false);
});

await run("general accounts hide admin and partner affordances by default", () => {
  const capabilities = getMyPageCapabilities({
    permissionsResolved: true,
    profileRole: "customer",
    partnerStatus: "none",
  });

  assert.equal(capabilities.canViewAdminConsole, false);
  assert.equal(capabilities.showPartnerBanner, false);
  assert.equal(capabilities.canApplyForPartner, false);
});

await run("business accounts use partner status without exposing admin UI", () => {
  const capabilities = getMyPageCapabilities({
    permissionsResolved: true,
    profileRole: "customer",
    partnerStatus: "rejected",
  });

  assert.equal(capabilities.canViewAdminConsole, false);
  assert.equal(capabilities.showPartnerBanner, true);
  assert.equal(capabilities.canApplyForPartner, true);
});

await run("loading state hides both admin and partner UI", () => {
  const capabilities = getMyPageCapabilities({
    permissionsResolved: false,
    profileRole: "super_admin",
    partnerStatus: "rejected",
  });

  assert.equal(capabilities.canViewAdminConsole, false);
  assert.equal(capabilities.showPartnerBanner, false);
  assert.equal(capabilities.canApplyForPartner, false);
});
