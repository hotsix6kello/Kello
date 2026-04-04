export type PartnerStatus = "none" | "pending" | "approved" | "rejected";

export interface MyPagePermissionContext {
  permissionsResolved: boolean;
  profileRole: string | null | undefined;
  partnerStatus: PartnerStatus | null;
}

export interface MyPageCapabilities {
  canViewAdminConsole: boolean;
  showPartnerBanner: boolean;
  canApplyForPartner: boolean;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function getMyPageCapabilities({
  permissionsResolved,
  profileRole,
  partnerStatus,
}: MyPagePermissionContext): MyPageCapabilities {
  if (!permissionsResolved) {
    return {
      canViewAdminConsole: false,
      showPartnerBanner: false,
      canApplyForPartner: false,
    };
  }

  const isAdmin = isAdminRole(profileRole);
  const showPartnerBanner = !isAdmin && partnerStatus !== null && partnerStatus !== "none";

  return {
    canViewAdminConsole: isAdmin,
    showPartnerBanner,
    canApplyForPartner: !isAdmin && partnerStatus === "rejected",
  };
}
