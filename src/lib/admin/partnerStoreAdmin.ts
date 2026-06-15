export type PartnerStoreReviewStatus = "pending" | "approved" | "rejected";

export const PARTNER_STORE_REVIEW_STATUSES: readonly PartnerStoreReviewStatus[] = [
  "pending",
  "approved",
  "rejected",
];

export function isPartnerStoreReviewStatus(value: unknown): value is PartnerStoreReviewStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

export type PartnerStoreListStatusFilter = PartnerStoreReviewStatus | "all";

export function isPartnerStoreListStatusFilter(value: unknown): value is PartnerStoreListStatusFilter {
  return value === "all" || isPartnerStoreReviewStatus(value);
}

export type PartnerStoreListItem = {
  id: string;
  name: string | null;
  businessTypes: string[];
  address: string | null;
  published: boolean;
  reviewStatus: PartnerStoreReviewStatus;
  createdAt: string | null;
  pendingMenuItemsCount: number;
  pendingPhotosCount: number;
};

export type PartnerStoreDetailStore = {
  id: string;
  ownerId: string | null;
  name: string | null;
  businessTypes: string[];
  address: string | null;
  phone: string | null;
  capacity: number | null;
  leadTimeHours: number | null;
  slotIntervalMinutes: number | null;
  published: boolean;
  reviewStatus: PartnerStoreReviewStatus;
  reviewReason: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string | null;
};

export type PartnerStoreCategory = {
  id: string;
  storeId: string;
  name: string | null;
  orderIndex: number | null;
};

export type PartnerStoreMenuItemOption = {
  id: string;
  menuItemId: string;
  name: string | null;
  price: number | null;
};

export type PartnerStoreMenuItem = {
  id: string;
  storeId: string;
  categoryId: string | null;
  name: string | null;
  priceType: string | null;
  price: number | null;
  priceMin: number | null;
  priceMax: number | null;
  durationMin: number | null;
  visible: boolean;
  reviewStatus: PartnerStoreReviewStatus;
  orderIndex: number | null;
  options: PartnerStoreMenuItemOption[];
};

export type PartnerStoreBusinessHours = {
  storeId: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
};

export type PartnerStorePhoto = {
  id: string;
  storeId: string;
  slotType: string | null;
  slotIndex: number | null;
  storagePath: string;
  reviewStatus: PartnerStoreReviewStatus;
  categoryId: string | null;
  signedUrl: string | null;
};

export type PartnerStoreDetail = {
  store: PartnerStoreDetailStore;
  categories: PartnerStoreCategory[];
  menuItems: PartnerStoreMenuItem[];
  businessHours: PartnerStoreBusinessHours[];
  photos: PartnerStorePhoto[];
};

export type PartnerStoreReviewPatchBody = {
  review_status: "approved" | "rejected";
  review_reason?: string | null;
};

export type PartnerStoreBulkReviewPatchItem = {
  id: string;
  review_status: "approved" | "rejected";
};

export function isPartnerStoreBulkReviewPatchItem(value: unknown): value is PartnerStoreBulkReviewPatchItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && (item.review_status === "approved" || item.review_status === "rejected");
}

export const STORE_PHOTOS_BUCKET = "store-photos";
export const STORE_PHOTOS_SIGNED_URL_EXPIRES_SECONDS = 60 * 60;
