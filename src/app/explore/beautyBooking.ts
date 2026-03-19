export type BeautyBookingPayload = {
  category: 'beauty';
  beautyCategory: string;
  region: string;
  storeId: string;
  storeName: string;
  bookingDate: string;
  bookingTime: string;
  designerId: string | null;
  designerName: string | null;
  primaryServiceId: string;
  primaryServiceName: string;
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
    phone: string;
    request: string;
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
    bookingConfirmed: boolean;
    privacyConsent: boolean;
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
  bookingDate: string | null;
  bookingTime: string | null;
  designerId: string | null;
  designerName: string | null;
  primaryServiceId: string | null;
  primaryServiceName: string | null;
  addOnIds: string[];
  addOnNames: string[];
  priceSummary: BeautyBookingPayload['priceSummary'];
  customer: BeautyBookingPayload['customer'];
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
  input: BeautyBookingPayloadDraftInput,
): BeautyBookingPayload | null {
  if (
    !hasRequiredText(input.beautyCategory) ||
    !hasRequiredText(input.region) ||
    !hasRequiredText(input.storeId) ||
    !hasRequiredText(input.storeName) ||
    !hasRequiredText(input.bookingDate) ||
    !hasRequiredText(input.bookingTime) ||
    !hasRequiredText(input.primaryServiceId) ||
    !hasRequiredText(input.primaryServiceName) ||
    !hasRequiredText(input.customer.name) ||
    !hasRequiredText(input.customer.phone) ||
    !hasRequiredText(input.communication.language) ||
    !hasRequiredText(input.communication.intent) ||
    !isFiniteNumber(input.priceSummary.basePrice) ||
    !isFiniteNumber(input.priceSummary.addOnPrice) ||
    !isFiniteNumber(input.priceSummary.designerSurcharge) ||
    !isFiniteNumber(input.priceSummary.totalPrice)
  ) {
    return null;
  }

  return {
    category: 'beauty',
    beautyCategory: input.beautyCategory,
    region: input.region,
    storeId: input.storeId,
    storeName: input.storeName.trim(),
    bookingDate: input.bookingDate,
    bookingTime: input.bookingTime,
    designerId: hasRequiredText(input.designerId) ? input.designerId : null,
    designerName: hasRequiredText(input.designerName) ? input.designerName.trim() : null,
    primaryServiceId: input.primaryServiceId,
    primaryServiceName: input.primaryServiceName.trim(),
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
      phone: input.customer.phone.trim(),
      request: input.customer.request.trim(),
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
      bookingConfirmed: input.agreements.bookingConfirmed,
      privacyConsent: input.agreements.privacyConsent,
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
  const createdFrom =
    candidate.createdFrom && typeof candidate.createdFrom === 'object'
      ? (candidate.createdFrom as Record<string, unknown>)
      : {};
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

  if (candidate.category !== 'beauty' || createdFrom.flow !== 'beauty-explore') {
    return null;
  }

  if (!isBoolean(agreements.bookingConfirmed) || !isBoolean(agreements.privacyConsent)) {
    return null;
  }

  return buildBeautyBookingPayload({
    beautyCategory: typeof candidate.beautyCategory === 'string' ? candidate.beautyCategory : null,
    region: typeof candidate.region === 'string' ? candidate.region : null,
    storeId: typeof candidate.storeId === 'string' ? candidate.storeId : null,
    storeName: typeof candidate.storeName === 'string' ? candidate.storeName : null,
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
      phone: typeof customer.phone === 'string' ? customer.phone : '',
      request: typeof customer.request === 'string' ? customer.request : '',
    },
    communication: {
      language: typeof communication.language === 'string' ? communication.language : '',
      intent: typeof communication.intent === 'string' ? communication.intent : '',
      koreanMessage: typeof messages.korean === 'string' ? messages.korean : '',
      localizedMessage: typeof messages.localized === 'string' ? messages.localized : '',
    },
    agreements: {
      bookingConfirmed: agreements.bookingConfirmed,
      privacyConsent: agreements.privacyConsent,
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
    primaryServiceName: payload.primaryServiceName,
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
  accessToken?: string | null,
): Promise<BeautyBookingSubmitResult> {
  let response: Response;

  try {
    response = await fetch('/api/bookings/beauty', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
