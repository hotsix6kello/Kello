import { supabase } from "@/lib/supabaseClient";
export type BeautyBookingPayload = {
  id?: string;
  category: 'beauty';
  beautyCategory: string;
  region: string;
  storeId: string;
  storeName: string;
  storeSource?: 'google' | 'partner';
  bookingDate: string;
  bookingTime: string;
  designerId: string | null;
  designerName: string | null;
  primaryServiceId: string | null;
  primaryServiceName: string | null;
  addOnIds: string[];
  addOnNames: string[];
  priceSummary: {
    basePrice: number;
    addOnPrice: number;
    designerSurcharge: number;
    totalPrice: number;
  };
  customer: {
    name: string;
    email?: string;
    phone: string;
    request: string;
    imageUrls?: string[];
    currentImageUrl?: string;
    styleImageUrl?: string;
    currentImagePath?: string;
    styleImagePath?: string;
    currentImageName?: string;
    styleImageName?: string;
  };
  communication: {
    language: string;
    intent: string;
    messages: {
      korean: string;
      localized: string;
    };
  };
  agreements: {
    serviceTermsAgreed: boolean;
    privacyPolicyAgreed: boolean;
    thirdPartySharingAgreed: boolean;
    marketingConsentAgreed: boolean;
    refundPolicyAgreed: boolean;
    refundPolicyAgreedAt: string | null;
  };
  createdFrom: {
    flow: 'beauty-explore';
  };
};

export type BeautyBookingPayloadDraftInput = {
  beautyCategory: string | null;
  region: string | null;
  storeId: string | null;
  storeName: string | null;
  storeSource?: 'google' | 'partner';
  bookingDate: string | null;
  bookingTime: string | null;
  designerId: string | null;
  designerName: string | null;
  primaryServiceId: string | null;
  primaryServiceName: string | null;
  addOnIds: string[];
  addOnNames: string[];
  priceSummary: BeautyBookingPayload['priceSummary'];
  customer: BeautyBookingPayload['customer'] & {
    currentImageUrl?: string | null;
    styleImageUrl?: string | null;
    currentImagePath?: string | null;
    styleImagePath?: string | null;
    currentImageName?: string | null;
    styleImageName?: string | null;
  };
  communication: {
    language: string;
    intent: string;
    koreanMessage: string;
    localizedMessage: string;
  };
  agreements: BeautyBookingPayload['agreements'];
};

export type BeautyBookingCompletionDisplay = {
  category: string;
  storeName: string;
  region: string;
  date: string;
  time: string;
  designerName: string;
  primaryServiceName: string;
  addOnNames: string[];
  basePrice: number;
  addOnPrice: number;
  designerSurcharge: number;
  estimatedTotal: number;
  customerName: string;
  customerPhone: string;
  customerRequest: string;
  communicationLanguageLabel: string;
  communicationIntentLabel: string;
  koreanMessage: string;
  localizedMessage: string;
};

export type BeautyBookingCompletionDisplayMeta = {
  categoryLabel: string;
  regionLabel: string;
  dateLabel: string;
  communicationLanguageLabel: string;
  communicationIntentLabel: string;
  designerDefaultLabel: string;
  primaryServiceDefaultLabel: string;
};

export type BeautyBookingSubmitResult = {
  bookingId: string;
  status: 'requested';
  createdAt: string;
  payload: BeautyBookingPayload;
};

function hasRequiredText(value: string | null | undefined): value is string {
  return Boolean(value && value.trim());
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function buildBeautyBookingPayload(
  input: BeautyBookingPayloadDraftInput & { id?: string },
): BeautyBookingPayload | null {
  if (
    !hasRequiredText(input.beautyCategory) ||
    !hasRequiredText(input.region) ||
    !hasRequiredText(input.storeId) ||
    !hasRequiredText(input.storeName) ||
    !hasRequiredText(input.bookingDate) ||
    !hasRequiredText(input.bookingTime)
  ) {
    return null;
  }

  return {
    id: input.id,
    category: 'beauty',
    beautyCategory: input.beautyCategory ?? '',
    region: input.region ?? '',
    storeId: input.storeId ?? '',
    storeName: (input.storeName ?? '').trim(),
    storeSource: input.storeSource === 'partner' ? 'partner' : 'google',
    bookingDate: input.bookingDate ?? '',
    bookingTime: input.bookingTime ?? '',
    designerId: hasRequiredText(input.designerId) ? input.designerId : null,
    designerName: hasRequiredText(input.designerName) ? input.designerName.trim() : null,
    primaryServiceId: input.primaryServiceId ?? null,
    primaryServiceName: input.primaryServiceName ? input.primaryServiceName.trim() : null,
    addOnIds: input.addOnIds,
    addOnNames: input.addOnNames.map((name) => name.trim()).filter(Boolean),
    priceSummary: {
      basePrice: input.priceSummary.basePrice,
      addOnPrice: input.priceSummary.addOnPrice,
      designerSurcharge: input.priceSummary.designerSurcharge,
      totalPrice: input.priceSummary.totalPrice,
    },
    customer: {
      name: input.customer.name.trim(),
      email:
        typeof input.customer.email === "string" && input.customer.email.trim().length > 0
          ? input.customer.email.trim()
          : undefined,
      phone: input.customer.phone.trim(),
      request: input.customer.request.trim(),
      imageUrls: input.customer.imageUrls || [],
      currentImageUrl: input.customer.currentImageUrl ?? undefined,
      styleImageUrl: input.customer.styleImageUrl ?? undefined,
      currentImagePath: input.customer.currentImagePath ?? undefined,
      styleImagePath: input.customer.styleImagePath ?? undefined,
      currentImageName: input.customer.currentImageName ?? undefined,
      styleImageName: input.customer.styleImageName ?? undefined,
    },
    communication: {
      language: input.communication.language,
      intent: input.communication.intent,
      messages: {
        korean: input.communication.koreanMessage.trim(),
        localized: input.communication.localizedMessage.trim(),
      },
    },
    agreements: {
      serviceTermsAgreed: input.agreements.serviceTermsAgreed,
      privacyPolicyAgreed: input.agreements.privacyPolicyAgreed,
      thirdPartySharingAgreed: input.agreements.thirdPartySharingAgreed,
      marketingConsentAgreed: input.agreements.marketingConsentAgreed,
      refundPolicyAgreed: input.agreements.refundPolicyAgreed,
      refundPolicyAgreedAt: input.agreements.refundPolicyAgreedAt,
    },
    createdFrom: {
      flow: 'beauty-explore',
    },
  };
}

export function coerceBeautyBookingPayload(input: unknown): BeautyBookingPayload | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  const customer =
    candidate.customer && typeof candidate.customer === 'object'
      ? (candidate.customer as Record<string, unknown>)
      : {};
  const communication =
    candidate.communication && typeof candidate.communication === 'object'
      ? (candidate.communication as Record<string, unknown>)
      : {};
  const messages =
    communication.messages && typeof communication.messages === 'object'
      ? (communication.messages as Record<string, unknown>)
      : {};
  const agreements =
    candidate.agreements && typeof candidate.agreements === 'object'
      ? (candidate.agreements as Record<string, unknown>)
      : {};
  const priceSummary =
    candidate.priceSummary && typeof candidate.priceSummary === 'object'
      ? (candidate.priceSummary as Record<string, unknown>)
      : {};

  if (candidate.category !== 'beauty') {
    return null;
  }

  if (
    !isBoolean(agreements.serviceTermsAgreed) ||
    !isBoolean(agreements.privacyPolicyAgreed) ||
    !isBoolean(agreements.thirdPartySharingAgreed) ||
    !isBoolean(agreements.marketingConsentAgreed)
  ) {
    return null;
  }

  return buildBeautyBookingPayload({
    beautyCategory: typeof candidate.beautyCategory === 'string' ? candidate.beautyCategory : null,
    region: typeof candidate.region === 'string' ? candidate.region : null,
    storeId: typeof candidate.storeId === 'string' ? candidate.storeId : null,
    storeName: typeof candidate.storeName === 'string' ? candidate.storeName : null,
    storeSource: candidate.storeSource === 'partner' ? 'partner' : 'google',
    bookingDate: typeof candidate.bookingDate === 'string' ? candidate.bookingDate : null,
    bookingTime: typeof candidate.bookingTime === 'string' ? candidate.bookingTime : null,
    designerId: typeof candidate.designerId === 'string' ? candidate.designerId : null,
    designerName: typeof candidate.designerName === 'string' ? candidate.designerName : null,
    primaryServiceId: typeof candidate.primaryServiceId === 'string' ? candidate.primaryServiceId : null,
    primaryServiceName: typeof candidate.primaryServiceName === 'string' ? candidate.primaryServiceName : null,
    addOnIds: normalizeStringArray(candidate.addOnIds),
    addOnNames: normalizeStringArray(candidate.addOnNames),
    priceSummary: {
      basePrice: isFiniteNumber(priceSummary.basePrice) ? priceSummary.basePrice : Number.NaN,
      addOnPrice: isFiniteNumber(priceSummary.addOnPrice) ? priceSummary.addOnPrice : Number.NaN,
      designerSurcharge: isFiniteNumber(priceSummary.designerSurcharge) ? priceSummary.designerSurcharge : Number.NaN,
      totalPrice: isFiniteNumber(priceSummary.totalPrice) ? priceSummary.totalPrice : Number.NaN,
    },
    customer: {
      name: typeof customer.name === 'string' ? customer.name : '',
      email: typeof customer.email === 'string' ? customer.email : undefined,
      phone: typeof customer.phone === 'string' ? customer.phone : '',
      request: typeof customer.request === 'string' ? customer.request : '',
      imageUrls: normalizeStringArray(customer.imageUrls),
      currentImageUrl: typeof customer.currentImageUrl === 'string' ? customer.currentImageUrl : undefined,
      styleImageUrl: typeof customer.styleImageUrl === 'string' ? customer.styleImageUrl : undefined,
      currentImagePath: typeof customer.currentImagePath === 'string' ? customer.currentImagePath : undefined,
      styleImagePath: typeof customer.styleImagePath === 'string' ? customer.styleImagePath : undefined,
      currentImageName: typeof customer.currentImageName === 'string' ? customer.currentImageName : undefined,
      styleImageName: typeof customer.styleImageName === 'string' ? customer.styleImageName : undefined,
    },
    communication: {
      language: typeof communication.language === 'string' ? communication.language : '',
      intent: typeof communication.intent === 'string' ? communication.intent : '',
      koreanMessage: typeof messages.korean === 'string' ? messages.korean : '',
      localizedMessage: typeof messages.localized === 'string' ? messages.localized : '',
    },
    agreements: {
      serviceTermsAgreed: agreements.serviceTermsAgreed === true,
      privacyPolicyAgreed: agreements.privacyPolicyAgreed === true,
      thirdPartySharingAgreed: agreements.thirdPartySharingAgreed === true,
      marketingConsentAgreed: agreements.marketingConsentAgreed === true,
      refundPolicyAgreed: agreements.refundPolicyAgreed === true,
      refundPolicyAgreedAt: typeof agreements.refundPolicyAgreedAt === 'string' ? agreements.refundPolicyAgreedAt : null,
    },
  });
}

export function buildBeautyBookingCompletionDisplay(
  payload: BeautyBookingPayload,
  meta: BeautyBookingCompletionDisplayMeta,
): BeautyBookingCompletionDisplay {
  return {
    category: meta.categoryLabel,
    storeName: payload.storeName,
    region: meta.regionLabel,
    date: meta.dateLabel,
    time: payload.bookingTime,
    designerName: payload.designerName ?? meta.designerDefaultLabel,
    primaryServiceName: payload.primaryServiceName ?? meta.primaryServiceDefaultLabel,
    addOnNames: payload.addOnNames,
    basePrice: payload.priceSummary.basePrice,
    addOnPrice: payload.priceSummary.addOnPrice,
    designerSurcharge: payload.priceSummary.designerSurcharge,
    estimatedTotal: payload.priceSummary.totalPrice,
    customerName: payload.customer.name,
    customerPhone: payload.customer.phone,
    customerRequest: payload.customer.request,
    communicationLanguageLabel: meta.communicationLanguageLabel,
    communicationIntentLabel: meta.communicationIntentLabel,
    koreanMessage: payload.communication.messages.korean,
    localizedMessage: payload.communication.messages.localized,
  };
}

export async function submitBeautyBooking(
  payload: BeautyBookingPayload,
  accessToken: string,
): Promise<BeautyBookingSubmitResult> {
  let response: Response;

  try {
    response = await fetch('/api/bookings/beauty', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('예약 요청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  const body = (await response.json().catch(() => null)) as
    | { ok?: boolean; bookingId?: string; status?: string; createdAt?: string; error?: string }
    | null;

  if (!response.ok || body?.ok !== true || !body.bookingId || !body.createdAt) {
    if (response.status === 401) {
      throw new Error('로그인이 필요해요. 로그인 후 다시 시도해 주세요.');
    }

    throw new Error(
      response.status === 400
        ? '예약 정보를 다시 확인해 주세요.'
        : '예약 요청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  }

  return {
    bookingId: body.bookingId,
    status: 'requested',
    createdAt: body.createdAt,
    payload,
  };
}

export async function uploadBookingImages(
  images: string[] // Array of base64 strings
): Promise<string[]> {
  if (!images || images.length === 0) return [];
  
  const uploadPromises = images.map(async (base64, idx) => {
    try {
      // 1. Remove base64 metadata prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(',')[1];
      if (!base64Data) return null;
      
      // 2. Convert to binary Blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      // 3. Generate a reasonably unique filename
      const fileName = `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}.jpg`;
      const filePath = `beauty/${fileName}`;
      
      // 4. Upload to Supabase Storage bucket 'beauty-bookings'
      const { error } = await supabase.storage
        .from('beauty-bookings')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });
        
      if (error) throw error;
      
      // 5. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('beauty-bookings')
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (err) {
      console.error(`[uploadBookingImages] Failed to upload image ${idx}:`, err);
      return null;
    }
  });
  
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}
