'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import styles from './explore.module.css';
import {
  BeautyBookingCompletionDisplay,
  BeautyBookingPayload,
  buildBeautyBookingCompletionDisplay,
  buildBeautyBookingPayload,
  submitBeautyBooking,
} from './beautyBooking';
import { MOCK_ITEMS, ServiceItem, CityId } from './mock/data';
import ExploreHeader from './components/ExploreHeader';
import FilterSheet from './components/FilterSheet';
import AddToPlanModal from './components/AddToPlanModal';
import ExploreMap from './components/ExploreMap';

import { useTrip } from '@/lib/contexts/TripContext';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from 'react-i18next';

type ActiveFilters = Record<string, string[]>;
type BeautyCategoryId = 'hair' | 'nail' | 'esthetic' | 'waxing' | 'makeup' | 'lash';
type BeautyRegionId = 'all' | 'gangnam' | 'hongdae' | 'seongsu' | 'jamsil' | 'konkuk' | 'pangyo';

type BeautyStore = {
  id: string;
  name: string;
  category: BeautyCategoryId;
  region: Exclude<BeautyRegionId, 'all'>;
  rating: number;
  reviewCount: number;
  priceLabel: string;
  shortDescription: string;
  tags: string[];
};

type NearbyPlacesResponse = {
  places?: Array<{
    id: string;
    displayName: { text: string };
    formattedAddress: string;
    location: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
  }>;
};

type BeautyAvailability = {
  availableDates: string[];
  slotsByDate: Record<string, string[]>;
};

type BeautyDateOption = {
  key: string;
  shortLabel: string;
  label: string;
};

type BeautyDesigner = {
  id: string;
  name: string;
  specialty: string;
  experienceLabel: string;
  shortNote: string;
  surcharge: number;
};

type BeautyServiceOption = {
  id: string;
  name: string;
  description: string;
  price: number;
};

type CommunicationLanguageId = 'ko' | 'en' | 'ja' | 'zh-CN';
type CommunicationIntentId = 'booking_confirm' | 'service_request' | 'allergy_notice' | 'style_consultation';

type PriceSummary = {
  basePrice: number;
  addOnPrice: number;
  designerSurcharge: number;
  totalPrice: number;
};

type CustomerFormState = {
  name: string;
  phone: string;
  request: string;
};

type AgreementState = {
  bookingConfirmed: boolean;
  privacyConsent: boolean;
};

type AgreementKey = keyof AgreementState;
type FormErrorKey = 'name' | 'phone' | 'primaryService' | 'bookingConfirmed' | 'privacyConsent';
type CustomerFormFieldKey = keyof CustomerFormState;
type CustomerFieldConfig = {
  key: CustomerFormFieldKey;
  label: string;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
};

type AgreementFieldConfig = {
  key: AgreementKey;
  label: string;
  description: string;
};

type CommunicationLanguageConfig = {
  id: CommunicationLanguageId;
  label: string;
  badge: string;
};

type CommunicationIntentConfig = {
  id: CommunicationIntentId;
  label: string;
  description: string;
};

type CommunicationMessagePayload = {
  categoryLabel: string;
  storeName: string;
  dateLabel: string;
  timeLabel: string;
  primaryServiceName: string | null;
  addOnNames: string[];
  customerRequest: string;
  designerName: string | null;
  intent: CommunicationIntentId;
};

const CUSTOMER_FORM_FIELDS: (t: any) => CustomerFieldConfig[] = (t) => [
  {
    key: 'name',
    label: t('beauty_explore.form_name'),
    placeholder: t('beauty_explore.form_name_placeholder'),
    required: true,
  },
  {
    key: 'phone',
    label: t('beauty_explore.form_phone'),
    placeholder: t('beauty_explore.form_phone_placeholder'),
    required: true,
  },
  {
    key: 'request',
    label: t('beauty_explore.form_request'),
    placeholder: t('beauty_explore.form_request_placeholder'),
    multiline: true,
  },
];

const AGREEMENT_FIELDS: (t: any) => AgreementFieldConfig[] = (t) => [
  {
    key: 'bookingConfirmed',
    label: t('beauty_explore.agreement_confirm'),
    description: t('beauty_explore.agreement_confirm_desc'),
  },
  {
    key: 'privacyConsent',
    label: t('beauty_explore.agreement_privacy'),
    description: t('beauty_explore.agreement_privacy_desc'),
  },
];

const INITIAL_CUSTOMER_FORM_STATE: CustomerFormState = {
  name: '',
  phone: '',
  request: '',
};

const INITIAL_AGREEMENT_STATE: AgreementState = {
  bookingConfirmed: false,
  privacyConsent: false,
};

const COMMUNICATION_LANGUAGES: (t: any) => CommunicationLanguageConfig[] = (t) => [
  { id: 'ko', label: t('beauty_bookings.lang_ko'), badge: 'KO' },
  { id: 'en', label: t('beauty_bookings.lang_en'), badge: 'EN' },
  { id: 'ja', label: t('beauty_bookings.lang_ja'), badge: 'JA' },
  { id: 'zh-CN', label: t('beauty_bookings.lang_zh_cn'), badge: 'ZH' },
];

const COMMUNICATION_INTENTS: (t: any) => CommunicationIntentConfig[] = (t) => [
  {
    id: 'booking_confirm',
    label: t('beauty_bookings.intent_booking_confirm'),
    description: t('beauty_bookings.intent_booking_confirm_desc') || '예약 시간과 시술 내용을 간단히 확인할 때 적합해요.',
  },
  {
    id: 'service_request',
    label: t('beauty_bookings.intent_service_request'),
    description: t('beauty_bookings.intent_service_request_desc') || '원하는 시술과 부가 옵션을 미리 전달할 때 적합해요.',
  },
  {
    id: 'allergy_notice',
    label: t('beauty_bookings.intent_allergy_notice'),
    description: t('beauty_bookings.intent_allergy_notice_desc') || '민감한 피부나 주의사항을 미리 공유할 때 적합해요.',
  },
  {
    id: 'style_consultation',
    label: t('beauty_bookings.intent_style_consultation'),
    description: t('beauty_bookings.intent_style_consultation_desc') || '방문 전 스타일 상담 의도를 간단히 전달할 때 적합해요.',
  },
];

const COMMUNICATION_LANGUAGE_LABELS: Record<CommunicationLanguageId, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  'zh-CN': '中文',
};

const COMMUNICATION_INTENT_LABELS: Record<CommunicationIntentId, string> = {
  booking_confirm: '예약 확인',
  service_request: '시술 요청 전달',
  allergy_notice: '알레르기/민감 사항 전달',
  style_consultation: '스타일 상담 도움',
};

function createDesigner(
  id: string,
  name: string,
  specialty: string,
  experienceLabel: string,
  shortNote: string,
  surcharge: number,
): BeautyDesigner {
  return {
    id,
    name,
    specialty,
    experienceLabel,
    shortNote,
    surcharge,
  };
}

function createServiceOption(id: string, name: string, description: string, price: number): BeautyServiceOption {
  return {
    id,
    name,
    description,
    price,
  };
}

function truncatePreview(text: string, maxLength = 140): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}…`;
}

function joinItemsForLanguage(items: string[], language: CommunicationLanguageId): string {
  if (items.length === 0) {
    return '';
  }

  if (language === 'ja' || language === 'zh-CN') {
    return items.join('、');
  }

  return items.join(', ');
}

function buildKoreanBookingMessage(payload: CommunicationMessagePayload): string {
  const introMap: Record<CommunicationIntentId, string> = {
    booking_confirm: '안녕하세요. 아래 예약 내용을 확인 부탁드립니다.',
    service_request: '안녕하세요. 예약과 함께 시술 요청사항을 전달드립니다.',
    allergy_notice: '안녕하세요. 예약 전 민감 사항을 미리 전달드립니다.',
    style_consultation: '안녕하세요. 방문 전에 스타일 상담 요청을 전달드립니다.',
  };
  const serviceText = payload.primaryServiceName
    ? `${payload.primaryServiceName}${payload.addOnNames.length > 0 ? `, 부가 옵션은 ${payload.addOnNames.join(', ')}입니다.` : ' 예약입니다.'}`
    : '시술 내용은 매장 상담 후 확정 예정입니다.';
  const designerText = payload.designerName ? `희망 디자이너는 ${payload.designerName}입니다.` : '디자이너는 매장 추천으로 진행해 주세요.';
  const requestText = payload.customerRequest ? `요청사항은 "${payload.customerRequest}" 입니다.` : '';

  return [
    introMap[payload.intent],
    `${payload.dateLabel} ${payload.timeLabel}에 ${payload.storeName}에서 ${payload.categoryLabel} 예약이 있습니다.`,
    serviceText,
    designerText,
    requestText,
  ]
    .filter(Boolean)
    .join(' ');
}

function buildLocalizedBookingMessage(
  language: CommunicationLanguageId,
  payload: CommunicationMessagePayload,
): string {
  const addOnText = joinItemsForLanguage(payload.addOnNames, language);

  if (language === 'ko') {
    return buildKoreanBookingMessage(payload);
  }

  if (language === 'en') {
    const introMap: Record<CommunicationIntentId, string> = {
      booking_confirm: 'Hello. Please review the booking details below.',
      service_request: 'Hello. I would like to share my service request in advance.',
      allergy_notice: 'Hello. I would like to share a sensitivity note before the appointment.',
      style_consultation: 'Hello. I would like some help with style consultation before the visit.',
    };
    const serviceText = payload.primaryServiceName
      ? `The main service is ${payload.primaryServiceName}${addOnText ? `, with add-ons: ${addOnText}.` : '.'}`
      : 'The final service details can be confirmed at the store.';
    const designerText = payload.designerName ? `Preferred designer: ${payload.designerName}.` : 'Designer can be recommended by the salon.';
    const requestText = payload.customerRequest ? `Request note: ${payload.customerRequest}.` : '';

    return [
      introMap[payload.intent],
      `I have a ${payload.categoryLabel} booking at ${payload.storeName} on ${payload.dateLabel} at ${payload.timeLabel}.`,
      serviceText,
      designerText,
      requestText,
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (language === 'ja') {
    const introMap: Record<CommunicationIntentId, string> = {
      booking_confirm: 'こんにちは。以下の予約内容をご確認ください。',
      service_request: 'こんにちは。施術の希望内容を事前に共有します。',
      allergy_notice: 'こんにちは。来店前に敏感事項を共有します。',
      style_consultation: 'こんにちは。来店前にスタイル相談をお願いしたいです。',
    };
    const serviceText = payload.primaryServiceName
      ? `主な施術は${payload.primaryServiceName}${addOnText ? `、追加オプションは${addOnText}です。` : 'です。'}`
      : '施術内容は来店後に相談して決めたいです。';
    const designerText = payload.designerName ? `希望デザイナーは${payload.designerName}です。` : '担当者はお店のおすすめでお願いします。';
    const requestText = payload.customerRequest ? `要望は「${payload.customerRequest}」です。` : '';

    return [
      introMap[payload.intent],
      `${payload.dateLabel} ${payload.timeLabel}に${payload.storeName}で${payload.categoryLabel}の予約があります。`,
      serviceText,
      designerText,
      requestText,
    ]
      .filter(Boolean)
      .join(' ');
  }

  const introMap: Record<CommunicationIntentId, string> = {
    booking_confirm: '您好，请确认以下预约信息。',
    service_request: '您好，我想提前说明这次预约的服务需求。',
    allergy_notice: '您好，我想在到店前提前说明敏感事项。',
    style_consultation: '您好，我希望到店前先说明一下风格咨询需求。',
  };
  const serviceText = payload.primaryServiceName
    ? `主要项目是${payload.primaryServiceName}${addOnText ? `，附加项目是${addOnText}。` : '。'}`
    : '项目内容可以到店后再确认。';
  const designerText = payload.designerName ? `希望安排的设计师是${payload.designerName}。` : '设计师可由门店推荐安排。';
  const requestText = payload.customerRequest ? `备注：${payload.customerRequest}。` : '';

  return [
    introMap[payload.intent],
    `我在${payload.dateLabel} ${payload.timeLabel}预约了${payload.storeName}的${payload.categoryLabel}服务。`,
    serviceText,
    designerText,
    requestText,
  ]
    .filter(Boolean)
    .join(' ');
}

const DESIGNERS_BY_STORE: Record<string, BeautyDesigner[]> = {
  beauty_hair_1: [
    createDesigner('designer_hair_1_a', '지아 디자이너', '레이어드 컷 · 컬러', '경력 9년', '상담이 꼼꼼하고 얼굴형 맞춤 컷이 강점이에요.', 15000),
    createDesigner('designer_hair_1_b', '민서 원장', '프리미엄 펌 · 클리닉', '경력 14년', '손상도에 맞춘 시술 순서를 세심하게 잡아드려요.', 25000),
  ],
  beauty_hair_2: [
    createDesigner('designer_hair_2_a', '하린 디자이너', '볼륨 펌 · 중단발', '경력 8년', '자연스러운 볼륨과 얼굴선 정리를 잘해드려요.', 12000),
    createDesigner('designer_hair_2_b', '윤아 실장', '컬러 체인지 · 케어', '경력 11년', '탈색 이력 상담과 컬러 톤 제안이 강점이에요.', 18000),
  ],
  beauty_nail_1: [
    createDesigner('designer_nail_1_a', '서윤 아티스트', '젤 네일 · 시즌 아트', '경력 7년', '트렌디한 컬러 조합과 깔끔한 마감으로 유명해요.', 10000),
    createDesigner('designer_nail_1_b', '채린 아티스트', '드로잉 아트 · 파츠', '경력 5년', '행사 전용 포인트 아트를 빠르게 제안해드려요.', 15000),
  ],
  beauty_nail_2: [
    createDesigner('designer_nail_2_a', '나연 실장', '케어 · 웨딩 네일', '경력 10년', '웨딩과 촬영 일정에 맞춘 컬러 큐레이션이 강점이에요.', 12000),
    createDesigner('designer_nail_2_b', '다빈 아티스트', '시럽 네일 · 그라데이션', '경력 6년', '맑고 은은한 무드 연출을 잘해드려요.', 8000),
  ],
  beauty_esthetic_1: [
    createDesigner('designer_esthetic_1_a', '유진 테라피스트', '진정 · 보습 관리', '경력 8년', '예민한 피부를 편안하게 케어해드려요.', 10000),
    createDesigner('designer_esthetic_1_b', '소희 원장', '탄력 · 윤곽 관리', '경력 13년', '탄력 프로그램과 상담 만족도가 높은 편이에요.', 20000),
  ],
  beauty_esthetic_2: [
    createDesigner('designer_esthetic_2_a', '가영 테라피스트', '여드름 · 민감성 케어', '경력 7년', '피부 상태에 따라 제품 구성을 유연하게 조정해드려요.', 8000),
    createDesigner('designer_esthetic_2_b', '예린 실장', '탄력 · 광채 관리', '경력 9년', '중요한 일정 전 빠른 컨디션 회복을 도와드려요.', 12000),
  ],
  beauty_waxing_1: [
    createDesigner('designer_waxing_1_a', '도연 매니저', '브라질리언 · 바디 왁싱', '경력 6년', '빠르고 깔끔한 시술 진행으로 재방문이 많아요.', 10000),
    createDesigner('designer_waxing_1_b', '현아 원장', '민감부위 진정 케어', '경력 12년', '민감한 고객 상담과 사후 진정 가이드가 강점이에요.', 18000),
  ],
  beauty_waxing_2: [
    createDesigner('designer_waxing_2_a', '시아 매니저', '팔 · 다리 왁싱', '경력 5년', '짧은 일정에서도 빠르게 시술을 마무리해드려요.', 6000),
    createDesigner('designer_waxing_2_b', '주희 실장', '풀바디 · 진정 관리', '경력 9년', '통증을 줄이는 템포 조절이 강점이에요.', 12000),
  ],
  beauty_makeup_1: [
    createDesigner('designer_makeup_1_a', '보라 메이크업 아티스트', '데일리 · 촬영 메이크업', '경력 8년', '맑고 또렷한 피부 표현이 강점이에요.', 18000),
    createDesigner('designer_makeup_1_b', '수아 실장', '웨딩 하객 · 행사', '경력 11년', '사진발이 잘 받는 톤 정리를 잘해드려요.', 25000),
  ],
  beauty_makeup_2: [
    createDesigner('designer_makeup_2_a', '지민 아티스트', '면접 · 방송 메이크업', '경력 7년', '선명하고 단정한 인상을 빠르게 잡아드려요.', 12000),
    createDesigner('designer_makeup_2_b', '혜원 원장', '프리미엄 행사 메이크업', '경력 15년', '중요 일정 전 완성도 높은 스타일링을 제안해드려요.', 30000),
  ],
  beauty_lash_1: [
    createDesigner('designer_lash_1_a', '소정 아티스트', '속눈썹 펌 · 틴팅', '경력 6년', '자연스러운 컬감과 유지력이 좋은 편이에요.', 10000),
    createDesigner('designer_lash_1_b', '세아 실장', '연장 · 눈매 디자인', '경력 9년', '눈매에 맞춘 컬과 길이 추천이 꼼꼼해요.', 15000),
  ],
  beauty_lash_2: [
    createDesigner('designer_lash_2_a', '다은 아티스트', '연장 · 리터치', '경력 5년', '풍성한 디자인도 가볍게 연출해드려요.', 8000),
    createDesigner('designer_lash_2_b', '시은 원장', '펌 · 손상 케어', '경력 10년', '속눈썹 상태를 보고 시술 강도를 세심하게 조정해드려요.', 15000),
  ],
};

const PRIMARY_SERVICES_BY_CATEGORY: Record<BeautyCategoryId, BeautyServiceOption[]> = {
  hair: [
    createServiceOption('hair_women_cut', '여성 컷', '길이 정리와 얼굴형 맞춤 커트', 55000),
    createServiceOption('hair_men_cut', '남성 컷', '쉐입 정리와 스타일링 커트', 38000),
    createServiceOption('hair_root_color', '뿌리염색', '자란 모발 위주 톤 보정', 89000),
    createServiceOption('hair_clinic', '클리닉', '손상도 케어 중심 프로그램', 99000),
  ],
  nail: [
    createServiceOption('nail_gel', '젤 네일', '기본 젤 컬러 시술', 79000),
    createServiceOption('nail_care', '네일 케어', '큐티클 정리와 손톱 케어', 45000),
    createServiceOption('nail_pedi', '젤 페디', '풋 케어 포함 젤 시술', 89000),
  ],
  esthetic: [
    createServiceOption('esthetic_calming', '진정 관리', '예민한 피부 진정 중심 프로그램', 88000),
    createServiceOption('esthetic_moisture', '보습 관리', '건조한 피부 보습 충전 프로그램', 95000),
    createServiceOption('esthetic_lifting', '탄력 관리', '탄력 개선 중심 케어', 118000),
  ],
  waxing: [
    createServiceOption('waxing_brazilian', '브라질리언', '민감부위 중심 왁싱', 99000),
    createServiceOption('waxing_arm', '팔 왁싱', '양팔 전체 정리', 55000),
    createServiceOption('waxing_leg', '다리 왁싱', '종아리 또는 하프 레그 기준', 69000),
  ],
  makeup: [
    createServiceOption('makeup_daily', '데일리 메이크업', '가벼운 일정용 메이크업', 85000),
    createServiceOption('makeup_interview', '면접 메이크업', '단정하고 선명한 인상 정리', 99000),
    createServiceOption('makeup_guest', '웨딩 하객 메이크업', '행사 일정에 맞춘 스타일링', 132000),
  ],
  lash: [
    createServiceOption('lash_perm', '속눈썹 펌', '컬 고정 중심 시술', 69000),
    createServiceOption('lash_extension', '속눈썹 연장', '길이와 컬 선택형 연장 시술', 99000),
    createServiceOption('lash_retouch', '리터치', '기존 연장 보완 시술', 59000),
  ],
};

const ADD_ONS_BY_CATEGORY: Record<BeautyCategoryId, BeautyServiceOption[]> = {
  hair: [
    createServiceOption('hair_add_scalp', '두피 스케일링', '시술 전 두피 정리 케어', 25000),
    createServiceOption('hair_add_blowdry', '스타일링 마무리', '드라이와 간단한 스타일링', 18000),
    createServiceOption('hair_add_ampoule', '앰플 케어', '손상 부위 집중 영양 케어', 30000),
  ],
  nail: [
    createServiceOption('nail_add_removal', '제거 포함', '기존 젤 제거 포함 진행', 15000),
    createServiceOption('nail_add_art', '포인트 아트', '양손 기준 포인트 아트 추가', 22000),
    createServiceOption('nail_add_strength', '강화 코팅', '유지력 보강 코팅', 12000),
  ],
  esthetic: [
    createServiceOption('esthetic_add_modeling', '모델링 팩', '진정 마무리 팩 추가', 20000),
    createServiceOption('esthetic_add_neck', '목 관리 추가', '목선 집중 케어', 18000),
    createServiceOption('esthetic_add_led', 'LED 케어', '진정 보조 광 케어', 25000),
  ],
  waxing: [
    createServiceOption('waxing_add_care', '진정 케어', '시술 후 진정 젤 관리', 15000),
    createServiceOption('waxing_add_pack', '수분 팩', '자극 완화용 팩 추가', 12000),
    createServiceOption('waxing_add_trim', '트리밍 포함', '시술 전 정리 포함', 10000),
  ],
  makeup: [
    createServiceOption('makeup_add_hair', '헤어 드라이', '간단한 블로우 스타일링', 25000),
    createServiceOption('makeup_add_lash', '속눈썹 부착', '부분 가닥 또는 포인트 래쉬', 18000),
    createServiceOption('makeup_add_touchup', '현장 수정 키트', '간단한 수정용 키트 제공', 15000),
  ],
  lash: [
    createServiceOption('lash_add_remove', '제거 포함', '기존 연장 제거 포함', 15000),
    createServiceOption('lash_add_tinting', '블랙 틴팅', '또렷한 컬러 보정', 12000),
    createServiceOption('lash_add_coating', '영양 코팅', '유지력 보조 코팅', 10000),
  ],
};

const BEAUTY_CATEGORY_ORDER: BeautyCategoryId[] = [
  'hair',
  'nail',
  'esthetic',
  'waxing',
  'makeup',
  'lash',
];

const BEAUTY_CATEGORY_META: (t: any) => Record<
  BeautyCategoryId,
  { label: string; english: string; badge: string; description: string }
> = (t) => ({
  hair: {
    label: t('home_beauty.categories.hair.label'),
    english: 'Hair',
    badge: 'HAIR',
    description: t('home_beauty.categories.hair.summary'),
  },
  nail: {
    label: t('home_beauty.categories.nail.label'),
    english: 'Nail',
    badge: 'NAIL',
    description: t('home_beauty.categories.nail.summary'),
  },
  esthetic: {
    label: t('home_beauty.categories.esthetic.label'),
    english: 'Esthetic',
    badge: 'CARE',
    description: t('home_beauty.categories.esthetic.summary'),
  },
  waxing: {
    label: t('home_beauty.categories.waxing.label'),
    english: 'Waxing',
    badge: 'WAX',
    description: t('home_beauty.categories.waxing.summary'),
  },
  makeup: {
    label: t('home_beauty.categories.makeup.label'),
    english: 'Makeup',
    badge: 'MAKE',
    description: t('home_beauty.categories.makeup.summary'),
  },
  lash: {
    label: t('home_beauty.categories.lash.label'),
    english: 'Lash',
    badge: 'LASH',
    description: t('home_beauty.categories.lash.summary'),
  },
});

const BEAUTY_REGIONS: (t: any) => Array<{ id: BeautyRegionId; label: string }> = (t) => [
  { id: 'all', label: t('beauty_explore.region_all') },
  { id: 'gangnam', label: t('transport.stations.gangnam') },
  { id: 'hongdae', label: '홍대' },
  { id: 'seongsu', label: t('transport.stations.seongsu') },
  { id: 'jamsil', label: '잠실' },
  { id: 'konkuk', label: '건대' },
  { id: 'pangyo', label: '판교' },
];

const BEAUTY_STORE_ITEMS: BeautyStore[] = [
  {
    id: 'beauty_hair_1',
    name: '라프메종 헤어 강남',
    category: 'hair',
    region: 'gangnam',
    rating: 4.9,
    reviewCount: 218,
    priceLabel: '커트 55,000원~',
    shortDescription: '레이어드 컷과 자연스러운 컬러 상담이 강점인 프리미엄 헤어 스튜디오입니다.',
    tags: ['디자인 컷', '퍼스널 컬러', '두피 케어'],
  },
  {
    id: 'beauty_hair_2',
    name: '아틀리에 성수 헤어룸',
    category: 'hair',
    region: 'seongsu',
    rating: 4.8,
    reviewCount: 164,
    priceLabel: '볼륨 펌 120,000원~',
    shortDescription: '볼륨 펌과 스타일 체인지 상담을 차분하게 진행하는 프라이빗 헤어룸입니다.',
    tags: ['볼륨 펌', '프라이빗', '스타일 상담'],
  },
  {
    id: 'beauty_nail_1',
    name: '메종 네일 홍대',
    category: 'nail',
    region: 'hongdae',
    rating: 4.8,
    reviewCount: 137,
    priceLabel: '젤 네일 79,000원~',
    shortDescription: '트렌디한 컬러 조합과 시즌 아트가 강한 네일 전문 스튜디오입니다.',
    tags: ['이달의 아트', '젤 케어', '컬러 큐레이션'],
  },
  {
    id: 'beauty_nail_2',
    name: '베이지 네일 잠실',
    category: 'nail',
    region: 'jamsil',
    rating: 4.7,
    reviewCount: 102,
    priceLabel: '네일 케어 45,000원~',
    shortDescription: '깔끔한 오피스 네일부터 웨딩 전 손톱 케어까지 안정적으로 받을 수 있어요.',
    tags: ['오피스 네일', '웨딩 준비', '손톱 케어'],
  },
  {
    id: 'beauty_esthetic_1',
    name: '세린 스킨 라운지 판교',
    category: 'esthetic',
    region: 'pangyo',
    rating: 4.9,
    reviewCount: 189,
    priceLabel: '보습 관리 95,000원~',
    shortDescription: '피부 진정과 탄력 케어를 조용한 공간에서 받을 수 있는 에스테틱 라운지입니다.',
    tags: ['진정 케어', '탄력 관리', '프라이빗 룸'],
  },
  {
    id: 'beauty_esthetic_2',
    name: '글로우 포뮬러 건대',
    category: 'esthetic',
    region: 'konkuk',
    rating: 4.7,
    reviewCount: 121,
    priceLabel: '수분 진정 케어 88,000원~',
    shortDescription: '예민한 피부를 위한 맞춤 진정 프로그램과 홈케어 가이드가 강점입니다.',
    tags: ['수분 관리', '예민 피부', '맞춤 상담'],
  },
  {
    id: 'beauty_waxing_1',
    name: '베어 아틀리에 왁싱 강남',
    category: 'waxing',
    region: 'gangnam',
    rating: 4.8,
    reviewCount: 143,
    priceLabel: '브라질리언 99,000원~',
    shortDescription: '위생 관리와 세심한 사후 케어 안내로 재방문율이 높은 왁싱 전문점입니다.',
    tags: ['위생 관리', '사후 케어', '민감 부위'],
  },
  {
    id: 'beauty_waxing_2',
    name: '소프트 스트립 홍대',
    category: 'waxing',
    region: 'hongdae',
    rating: 4.6,
    reviewCount: 96,
    priceLabel: '팔 왁싱 55,000원~',
    shortDescription: '짧은 일정에도 빠르게 예약할 수 있는 가벼운 왁싱 중심 스튜디오입니다.',
    tags: ['팔 왁싱', '빠른 시술', '가벼운 방문'],
  },
  {
    id: 'beauty_makeup_1',
    name: '아틀리에 베일 메이크업 성수',
    category: 'makeup',
    region: 'seongsu',
    rating: 4.9,
    reviewCount: 176,
    priceLabel: '데일리 메이크업 85,000원~',
    shortDescription: '촬영과 행사 일정에 맞춘 피부 결 정돈과 베이스 표현으로 만족도가 높은 샵입니다.',
    tags: ['촬영 메이크업', '데일리 룩', '퍼스널 무드'],
  },
  {
    id: 'beauty_makeup_2',
    name: '디어 뮤즈 메이크업 잠실',
    category: 'makeup',
    region: 'jamsil',
    rating: 4.8,
    reviewCount: 132,
    priceLabel: '웨딩 하객 메이크업 132,000원~',
    shortDescription: '웨딩과 중요한 일정 전 메이크업 상담을 촘촘하게 진행하는 프리미엄 샵입니다.',
    tags: ['웨딩 준비', '1:1 상담', '헤어 연출'],
  },
  {
    id: 'beauty_lash_1',
    name: '블룸 래쉬 부티크 강남',
    category: 'lash',
    region: 'gangnam',
    rating: 4.9,
    reviewCount: 204,
    priceLabel: '속눈썹 연장 99,000원~',
    shortDescription: '눈매에 맞춘 컬 디자인과 유지력 높은 시술로 인기 있는 속눈썹 전문샵입니다.',
    tags: ['컬 디자인', '유지력', '자연스러운 연장'],
  },
  {
    id: 'beauty_lash_2',
    name: '페더 래쉬 건대',
    category: 'lash',
    region: 'konkuk',
    rating: 4.7,
    reviewCount: 114,
    priceLabel: '속눈썹 펌 69,000원~',
    shortDescription: '첫 방문 고객도 부담 없이 예약할 수 있는 속눈썹 펌 중심 매장입니다.',
    tags: ['속눈썹 펌', '첫 방문 추천', '자연 컬'],
  },
];

const SLOT_TEMPLATE_SET = [
  ['10:00', '11:30', '13:00', '14:30', '16:00', '18:30'],
  ['10:30', '12:00', '13:30', '15:00', '17:00'],
  ['11:00', '12:30', '14:00', '15:30', '17:30'],
  ['09:30', '11:00', '13:00', '16:30'],
];

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createBookingDateOptions(t: any, count = 6): BeautyDateOption[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);

    const locale = t('common.locale') === 'ko-KR' ? 'ko-KR' : 'en-US';

    return {
      key: toLocalDateKey(date),
      shortLabel: index === 0 ? t('beauty_explore.label_today') : index === 1 ? t('beauty_explore.label_tomorrow') : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
      label: new Intl.DateTimeFormat(locale, {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      }).format(date),
    };
  });
}


function buildBeautyAvailability(
  slotPattern: number[],
  unavailableOffsets: number[] = [],
  emptySlotOffsets: number[] = [],
) {
  const slotsByIndex: Record<number, string[]> = {};

  for (let i = 0; i < 6; i++) {
    if (unavailableOffsets.includes(i)) {
      continue;
    }

    const templateIndex = slotPattern[i % slotPattern.length] ?? 0;
    const template = SLOT_TEMPLATE_SET[templateIndex] ?? SLOT_TEMPLATE_SET[0];
    slotsByIndex[i] = emptySlotOffsets.includes(i) ? [] : template;
  }

  return slotsByIndex;
}

const BEAUTY_AVAILABILITY_BY_STORE: Record<string, Record<number, string[]>> = {
  beauty_hair_1: buildBeautyAvailability([0, 1, 0, 2, 1, 0]),
  beauty_hair_2: buildBeautyAvailability([1, 2, 1, 3, 1, 2], [5]),
  beauty_nail_1: buildBeautyAvailability([2, 0, 2, 1, 0, 2]),
  beauty_nail_2: buildBeautyAvailability([0, 1, 0, 1, 0, 3], [], [4]),
  beauty_esthetic_1: buildBeautyAvailability([3, 2, 3, 2, 1, 3]),
  beauty_esthetic_2: buildBeautyAvailability([1, 1, 2, 2, 1, 0], [2]),
  beauty_waxing_1: buildBeautyAvailability([0, 3, 1, 3, 0, 1]),
  beauty_waxing_2: buildBeautyAvailability([3, 0, 3, 0, 3, 0], [], [1, 4]),
  beauty_makeup_1: buildBeautyAvailability([2, 1, 2, 0, 2, 1]),
  beauty_makeup_2: buildBeautyAvailability([1, 0, 1, 0, 3, 1], [3]),
  beauty_lash_1: buildBeautyAvailability([0, 2, 0, 2, 1, 0]),
  beauty_lash_2: buildBeautyAvailability([1, 3, 1, 3, 1, 2], [], [5]),
};


function isBeautyCategoryId(value: string | null): value is BeautyCategoryId {
  return Boolean(value && BEAUTY_CATEGORY_ORDER.includes(value as BeautyCategoryId));
}

export default function MyExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation('common');

  function formatPrice(value: number): string {
    const formatted = new Intl.NumberFormat(i18n.language === 'ko' ? 'ko-KR' : 'en-US').format(value);
    const unit = t('beauty_explore.label_booking_unit');
    return i18n.language === 'ko' ? `${formatted}${unit}` : `${unit} ${formatted}`;
  }
  const { addItineraryItem } = useTrip();
  const categoryParam = searchParams.get('category');
  const beautyCategoryParam = searchParams.get('beautyCategory');
  const isBeautyExplore = categoryParam === 'beauty';
  const beautyCategoryFilter = isBeautyCategoryId(beautyCategoryParam)
    ? beautyCategoryParam
    : null;

  const bookingDateOptions = useMemo(() => createBookingDateOptions(t), [t]);
  const bookingDateLabels = useMemo(() =>
    bookingDateOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.key] = option.label;
      return acc;
    }, {}),
    [bookingDateOptions]
  );

  const customerFormFields = useMemo(() => CUSTOMER_FORM_FIELDS(t), [t]);
  const agreementFields = useMemo(() => AGREEMENT_FIELDS(t), [t]);
  const beautyRegions = useMemo(() => BEAUTY_REGIONS(t), [t]);
  const beautyCategoryLabels = useMemo(() => BEAUTY_CATEGORY_META(t), [t]);
  const commLangs = useMemo(() => COMMUNICATION_LANGUAGES(t), [t]);
  const commIntents = useMemo(() => COMMUNICATION_INTENTS(t), [t]);

  const [currentCity, setCurrentCity] = useState<CityId>('seoul');

  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [hotelLocation, setHotelLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [radius, setRadius] = useState<number>(1000);
  const [nearbyItems, setNearbyItems] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddToPlanOpen, setIsAddToPlanOpen] = useState(false);
  const [selectedItemForPlan, setSelectedItemForPlan] = useState<ServiceItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<BeautyRegionId>('all');
  const [selectedBeautyStoreId, setSelectedBeautyStoreId] = useState<string | null>(null);
  const [selectedBeautyStoreName, setSelectedBeautyStoreName] = useState<string | null>(null);
  const [selectedBeautyRegion, setSelectedBeautyRegion] = useState<Exclude<BeautyRegionId, 'all'> | null>(null);
  const [selectedBeautyCategory, setSelectedBeautyCategory] = useState<BeautyCategoryId | null>(beautyCategoryFilter);
  const [selectedBeautyDate, setSelectedBeautyDate] = useState<string | null>(null);
  const [selectedBeautyTime, setSelectedBeautyTime] = useState<string | null>(null);
  const [selectedDesignerId, setSelectedDesignerId] = useState<string | null>(null);
  const [selectedPrimaryServiceId, setSelectedPrimaryServiceId] = useState<string | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedCommunicationLanguage, setSelectedCommunicationLanguage] = useState<CommunicationLanguageId>('en');
  const selectedBeautyAvailability = useMemo<BeautyAvailability | null>(() => {
    if (!selectedBeautyStoreId) {
      return null;
    }
    const availabilityByIndex = BEAUTY_AVAILABILITY_BY_STORE[selectedBeautyStoreId];
    if (!availabilityByIndex) {
      return null;
    }

    const slotsByDate: Record<string, string[]> = {};
    bookingDateOptions.forEach((option, index) => {
      if (availabilityByIndex[index]) {
        slotsByDate[option.key] = availabilityByIndex[index];
      }
    });

    return {
      availableDates: Object.keys(slotsByDate),
      slotsByDate,
    };
  }, [selectedBeautyStoreId, bookingDateOptions]);

/* moved below */
  const [selectedCommunicationIntent, setSelectedCommunicationIntent] = useState<CommunicationIntentId>('booking_confirm');
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(INITIAL_CUSTOMER_FORM_STATE);
  const [agreements, setAgreements] = useState<AgreementState>(INITIAL_AGREEMENT_STATE);
  const [formErrors, setFormErrors] = useState<Partial<Record<FormErrorKey, string>>>({});
  const [isBookingConfirmOpen, setIsBookingConfirmOpen] = useState(false);
  const [isSubmittingBeautyBooking, setIsSubmittingBeautyBooking] = useState(false);
  const [beautySubmitError, setBeautySubmitError] = useState<string | null>(null);
  const [submittedBookingPayload, setSubmittedBookingPayload] = useState<BeautyBookingPayload | null>(null);
  const [submittedBooking, setSubmittedBooking] = useState<BeautyBookingCompletionDisplay | null>(null);
  const bookingPanelRef = useRef<HTMLElement | null>(null);
  const confirmSectionRef = useRef<HTMLElement | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isBeautyExplore) {
      return;
    }

    setSelectedBeautyCategory(beautyCategoryFilter);
    setSelectedRegion('all');
    setSelectedBeautyStoreId(null);
    setSelectedBeautyStoreName(null);
    setSelectedBeautyRegion(null);
    setSelectedBeautyDate(null);
    setSelectedBeautyTime(null);
    setSelectedDesignerId(null);
    setSelectedPrimaryServiceId(null);
    setSelectedAddOnIds([]);
    setIsBookingConfirmOpen(false);
    setIsSubmittingBeautyBooking(false);
    setBeautySubmitError(null);
    setSubmittedBookingPayload(null);
    setSubmittedBooking(null);
    setFormErrors((prev) => {
      if (!prev.primaryService) {
        return prev;
      }

      const next = { ...prev };
      delete next.primaryService;
      return next;
    });
  }, [beautyCategoryFilter, isBeautyExplore]);

  useEffect(() => {
    if (isBeautyExplore) {
      return;
    }

    if (navigator.geolocation && !hotelLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setHotelLocation({
            lat: latitude,
            lng: longitude,
            name: t('common.current_location', { defaultValue: 'My Location' }),
          });
        },
        () => {
          return;
        },
      );
    }
  }, [hotelLocation, isBeautyExplore, t]);

  useEffect(() => {
    if (isBeautyExplore || !hotelLocation) {
      return;
    }

    const fetchNearby = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/places/nearby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: hotelLocation.lat, lng: hotelLocation.lng, radius, category: currentCategory }),
        });
        const data = (await res.json()) as NearbyPlacesResponse;

        const mappedItems: ServiceItem[] = (data.places || []).map((place) => ({
          id: place.id,
          title: place.displayName.text,
          area: place.formattedAddress.split(',')[1]?.trim() || place.formattedAddress,
          type: currentCategory as ServiceItem['type'],
          lat: place.location.latitude,
          lng: place.location.longitude,
          rating: place.rating,
          reviews: place.userRatingCount,
          image_color: '#333',
          badges: [],
          description: place.formattedAddress,
          city_id: currentCity,
          price: '0',
          price_level: 1,
        }));

        setNearbyItems(mappedItems);
      } catch (error) {
        console.error('Fetch nearby error:', error);
        showToast('Failed to fetch nearby items');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchNearby();
  }, [currentCategory, hotelLocation, isBeautyExplore, radius]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedBeautyStoreId) {
      return;
    }

    const exists = BEAUTY_STORE_ITEMS.some((store) => {
      const matchesCategory = beautyCategoryFilter ? store.category === beautyCategoryFilter : true;
      const matchesRegion = selectedRegion === 'all' ? true : store.region === selectedRegion;
      return store.id === selectedBeautyStoreId && matchesCategory && matchesRegion;
    });

    if (!exists) {
      setSelectedBeautyStoreId(null);
      setSelectedBeautyStoreName(null);
      setSelectedBeautyRegion(null);
      setSelectedBeautyCategory(beautyCategoryFilter);
      setSelectedBeautyDate(null);
      setSelectedBeautyTime(null);
      setSelectedDesignerId(null);
      setSelectedPrimaryServiceId(null);
      setSelectedAddOnIds([]);
      setIsBookingConfirmOpen(false);
      setIsSubmittingBeautyBooking(false);
      setBeautySubmitError(null);
      setSubmittedBookingPayload(null);
      setSubmittedBooking(null);
      setFormErrors((prev) => {
        if (!prev.primaryService) {
          return prev;
        }

        const next = { ...prev };
        delete next.primaryService;
        return next;
      });
    }
  }, [beautyCategoryFilter, selectedBeautyStoreId, selectedRegion]);

  const currentBeautyCategory = selectedBeautyCategory ?? beautyCategoryFilter;
  const availableDesigners = useMemo(
    () => (selectedBeautyStoreId ? DESIGNERS_BY_STORE[selectedBeautyStoreId] ?? [] : []),
    [selectedBeautyStoreId],
  );
  const availablePrimaryServices = useMemo(
    () => (currentBeautyCategory ? PRIMARY_SERVICES_BY_CATEGORY[currentBeautyCategory] ?? [] : []),
    [currentBeautyCategory],
  );
  const availableAddOnOptions = useMemo(
    () => (currentBeautyCategory ? ADD_ONS_BY_CATEGORY[currentBeautyCategory] ?? [] : []),
    [currentBeautyCategory],
  );
  const selectedDesigner = useMemo(
    () => availableDesigners.find((designer) => designer.id === selectedDesignerId) ?? null,
    [availableDesigners, selectedDesignerId],
  );
  const selectedPrimaryService = useMemo(
    () => availablePrimaryServices.find((service) => service.id === selectedPrimaryServiceId) ?? null,
    [availablePrimaryServices, selectedPrimaryServiceId],
  );
  const selectedAddOnOptions = useMemo(
    () => availableAddOnOptions.filter((option) => selectedAddOnIds.includes(option.id)),
    [availableAddOnOptions, selectedAddOnIds],
  );
  const selectedPriceSummary = useMemo<PriceSummary>(() => {
    const basePrice = selectedPrimaryService?.price ?? 0;
    const addOnPrice = selectedAddOnOptions.reduce((sum, option) => sum + option.price, 0);
    const designerSurcharge = selectedDesigner?.surcharge ?? 0;

    return {
      basePrice,
      addOnPrice,
      designerSurcharge,
      totalPrice: basePrice + addOnPrice + designerSurcharge,
    };
  }, [selectedAddOnOptions, selectedDesigner, selectedPrimaryService]);
  const communicationPayload = useMemo<CommunicationMessagePayload>(
    () => ({
      categoryLabel: selectedBeautyCategory
        ? beautyCategoryLabels[selectedBeautyCategory].label
        : (beautyCategoryFilter ? beautyCategoryLabels[beautyCategoryFilter].label : t('beauty_explore.hero_title')),
      storeName:
        selectedBeautyStoreName ??
        (selectedBeautyStoreId
          ? BEAUTY_STORE_ITEMS.find((store) => store.id === selectedBeautyStoreId)?.name ?? t('beauty_explore.label_service_default')
          : t('beauty_explore.label_service_default')),
      dateLabel: selectedBeautyDate ? bookingDateLabels[selectedBeautyDate] ?? selectedBeautyDate : t('beauty_explore.label_service_default'),
      timeLabel: selectedBeautyTime ?? t('beauty_explore.label_service_default'),
      primaryServiceName: selectedPrimaryService?.name ?? null,
      addOnNames: selectedAddOnOptions.map((option) => option.name),
      customerRequest: customerForm.request.trim(),
      designerName: selectedDesigner?.name ?? null,
      intent: selectedCommunicationIntent,
    }),
    [
      beautyCategoryFilter,
      customerForm.request,
      selectedAddOnOptions,
      selectedBeautyCategory,
      selectedBeautyDate,
      selectedBeautyStoreId,
      selectedBeautyStoreName,
      selectedBeautyTime,
      selectedCommunicationIntent,
      selectedDesigner,
      selectedPrimaryService,
      beautyCategoryLabels,
      bookingDateLabels,
      t,
    ],
  );
  const generatedKoreanMessage = useMemo(
    () => buildKoreanBookingMessage(communicationPayload),
    [communicationPayload],
  );
  const generatedLocalizedMessage = useMemo(
    () => buildLocalizedBookingMessage(selectedCommunicationLanguage, communicationPayload),
    [communicationPayload, selectedCommunicationLanguage],
  );
  const draftBeautyBookingPayload = useMemo(
    () =>
      buildBeautyBookingPayload({
        beautyCategory: selectedBeautyCategory,
        region: selectedBeautyRegion,
        storeId: selectedBeautyStoreId,
        storeName: selectedBeautyStoreName,
        bookingDate: selectedBeautyDate,
        bookingTime: selectedBeautyTime,
        designerId: selectedDesigner?.id ?? null,
        designerName: selectedDesigner?.name ?? null,
        primaryServiceId: selectedPrimaryService?.id ?? null,
        primaryServiceName: selectedPrimaryService?.name ?? null,
        addOnIds: selectedAddOnIds,
        addOnNames: selectedAddOnOptions.map((option) => option.name),
        priceSummary: selectedPriceSummary,
        customer: customerForm,
        communication: {
          language: selectedCommunicationLanguage,
          intent: selectedCommunicationIntent,
          koreanMessage: generatedKoreanMessage,
          localizedMessage: generatedLocalizedMessage,
        },
        agreements,
      }),
    [
      agreements,
      customerForm,
      generatedKoreanMessage,
      generatedLocalizedMessage,
      selectedAddOnIds,
      selectedAddOnOptions,
      selectedBeautyCategory,
      selectedBeautyDate,
      selectedBeautyRegion,
      selectedBeautyStoreId,
      selectedBeautyStoreName,
      selectedBeautyTime,
      selectedCommunicationIntent,
      selectedCommunicationLanguage,
      selectedDesigner,
      selectedPrimaryService,
      selectedPriceSummary,
    ],
  );

  useEffect(() => {
    if (!selectedBeautyAvailability) {
      setSelectedBeautyDate(null);
      setSelectedBeautyTime(null);
      setIsBookingConfirmOpen(false);
      setIsSubmittingBeautyBooking(false);
      setBeautySubmitError(null);
      setSubmittedBookingPayload(null);
      setSubmittedBooking(null);
      return;
    }

    if (selectedBeautyDate && !selectedBeautyAvailability.availableDates.includes(selectedBeautyDate)) {
      setSelectedBeautyDate(null);
      setSelectedBeautyTime(null);
      setIsBookingConfirmOpen(false);
      setIsSubmittingBeautyBooking(false);
      setBeautySubmitError(null);
      setSubmittedBookingPayload(null);
      setSubmittedBooking(null);
      return;
    }

    if (selectedBeautyDate && selectedBeautyTime) {
      const nextSlots = selectedBeautyAvailability.slotsByDate[selectedBeautyDate] ?? [];
      if (!nextSlots.includes(selectedBeautyTime)) {
        setSelectedBeautyTime(null);
      }
    }
  }, [selectedBeautyAvailability, selectedBeautyDate, selectedBeautyTime]);

  useEffect(() => {
    if (!selectedBeautyStoreId || !selectedBeautyDate || !selectedBeautyTime) {
      setIsBookingConfirmOpen(false);
      setIsSubmittingBeautyBooking(false);
      setBeautySubmitError(null);
      setSubmittedBookingPayload(null);
      setSubmittedBooking(null);
    }
  }, [selectedBeautyDate, selectedBeautyStoreId, selectedBeautyTime]);

  useEffect(() => {
    if (selectedDesignerId && !availableDesigners.some((designer) => designer.id === selectedDesignerId)) {
      setSelectedDesignerId(null);
    }
  }, [availableDesigners, selectedDesignerId]);

  useEffect(() => {
    if (selectedPrimaryServiceId && !availablePrimaryServices.some((service) => service.id === selectedPrimaryServiceId)) {
      setSelectedPrimaryServiceId(null);
    }

    setSelectedAddOnIds((prev) => prev.filter((optionId) => availableAddOnOptions.some((option) => option.id === optionId)));
  }, [availableAddOnOptions, availablePrimaryServices, selectedPrimaryServiceId]);

  const handleCityChange = (cityId: CityId) => {
    setCurrentCity(cityId);
    const cityName = t(`common.cities.${cityId}`, { defaultValue: cityId.toUpperCase() });
    showToast(t('explore_page.city_changed', { city: cityName }));
  };

  const handleCategoryChange = (catId: string) => {
    setCurrentCategory(catId);
    setActiveFilters({});
  };

  const handleAddToPlan = (day: number) => {
    if (!selectedItemForPlan) {
      return;
    }

    const newItem = {
      id: `plan_${selectedItemForPlan.id}_${Date.now()}`,
      name: selectedItemForPlan.title,
      time: '12:00',
      status: 'draft' as const,
      lat: selectedItemForPlan.lat || 37.5,
      lng: selectedItemForPlan.lng || 127.0,
      day,
      slot: 'pm' as const,
      type: selectedItemForPlan.type,
      image_color: selectedItemForPlan.image_color,
      badges: selectedItemForPlan.badges,
    };

    addItineraryItem(newItem);

    showToast(t('explore_page.added_to', { day }));
    setIsAddToPlanOpen(false);
    setSelectedItemForPlan(null);
  };

  const handleDetails = (id: string) => {
    router.push(`/explore/${id}`);
  };

  const handleApplyFilter = (filters: ActiveFilters) => {
    setActiveFilters(filters);
  };

  const handleSearchSubmit = (value: string) => {
    setAppliedSearchTerm(value);
  };

  const clearFormError = (errorKey: FormErrorKey) => {
    setFormErrors((prev) => {
      if (!prev[errorKey]) {
        return prev;
      }

      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
  };

  const validateCustomerField = (field: FormErrorKey, value: string) => {
    const trimmedValue = value.trim();

    if (field === 'name') {
      if (!trimmedValue) {
        return t('beauty_explore.form_name_placeholder');
      }

      return '';
    }

    if (field === 'phone') {
      const compactValue = trimmedValue.replace(/\s+/g, '');

      if (!compactValue) {
        return t('beauty_explore.form_phone_placeholder');
      }

      if (!/^[0-9-]+$/.test(compactValue) || compactValue.replace(/-/g, '').length < 7) {
        return t('beauty_bookings.error_phone_format') || '연락처는 숫자와 하이픈만 사용해 입력해 주세요.';
      }

      return '';
    }

    return '';
  };

  const handleCustomerFieldChange = (field: CustomerFormFieldKey, value: string) => {
    setCustomerForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === 'name' || field === 'phone') {
      const nextError = validateCustomerField(field, value);

      setFormErrors((prev) => {
        if (!prev[field] && !nextError) {
          return prev;
        }

        const next = { ...prev };
        if (nextError) {
          next[field] = nextError;
        } else {
          delete next[field];
        }
        return next;
      });
    }
  };

  const handleCustomerFieldBlur = (field: Extract<CustomerFormFieldKey, 'name' | 'phone'>) => {
    const nextError = validateCustomerField(field, customerForm[field]);

    setFormErrors((prev) => {
      if (!nextError && !prev[field]) {
        return prev;
      }

      const next = { ...prev };
      if (nextError) {
        next[field] = nextError;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const handleAgreementToggle = (field: AgreementKey) => {
    setAgreements((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
    clearFormError(field);
  };

  const validateBeautyBookingForm = () => {
    const nextErrors: Partial<Record<FormErrorKey, string>> = {};
    const nameError = validateCustomerField('name', customerForm.name);
    const phoneError = validateCustomerField('phone', customerForm.phone);

    if (!selectedPrimaryService) {
      nextErrors.primaryService = t('beauty_bookings.error_primary_service') || '대표 시술을 먼저 골라주세요.';
    }

    if (nameError) {
      nextErrors.name = nameError;
    }

    if (phoneError) {
      nextErrors.phone = phoneError;
    }

    if (!agreements.bookingConfirmed) {
      nextErrors.bookingConfirmed = t('beauty_explore.toast_check_info');
    }

    if (!agreements.privacyConsent) {
      nextErrors.privacyConsent = t('beauty_explore.agreement_privacy_desc');
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const scrollToConfirmSection = () => {
    window.requestAnimationFrame(() => {
      confirmSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const scrollToBookingPanel = () => {
    window.requestAnimationFrame(() => {
      bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const clearSubmittedBooking = () => {
    setBeautySubmitError(null);
    setSubmittedBookingPayload(null);
    setSubmittedBooking(null);
  };

  const handleDesignerSelect = (designerId: string) => {
    setSelectedDesignerId((prev) => (prev === designerId ? null : designerId));
    clearSubmittedBooking();
  };

  const handlePrimaryServiceSelect = (serviceId: string) => {
    setSelectedPrimaryServiceId(serviceId);
    clearFormError('primaryService');
    clearSubmittedBooking();
  };

  const handleAddOnToggle = (optionId: string) => {
    setSelectedAddOnIds((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }

      if (prev.length >= 2) {
        showToast(t('beauty_explore.toast_addon_limit'));
        return prev;
      }

      return [...prev, optionId];
    });
    clearSubmittedBooking();
  };

  const handleCommunicationLanguageSelect = (language: CommunicationLanguageId) => {
    setSelectedCommunicationLanguage(language);
    clearSubmittedBooking();
  };

  const handleCommunicationIntentSelect = (intent: CommunicationIntentId) => {
    setSelectedCommunicationIntent(intent);
    clearSubmittedBooking();
  };

  const handlePrepareMessageCopy = (label: string) => {
    showToast(t('beauty_explore.toast_copy_hint', { label }));
  };

  const handleBeautyStoreSelect = (
    storeId: string,
    storeName: string,
    storeRegion: Exclude<BeautyRegionId, 'all'>,
    storeCategory: BeautyCategoryId,
  ) => {
    setSelectedBeautyStoreId(storeId);
    setSelectedBeautyStoreName(storeName);
    setSelectedBeautyRegion(storeRegion);
    setSelectedBeautyCategory(storeCategory);
    setSelectedBeautyDate(null);
    setSelectedBeautyTime(null);
    setSelectedDesignerId(null);
    setSelectedPrimaryServiceId(null);
    setSelectedAddOnIds([]);
    setIsBookingConfirmOpen(false);
    clearSubmittedBooking();
    clearFormError('primaryService');
    showToast(`${storeName}${t('beauty_explore.toast_select_time')}`);
    scrollToBookingPanel();
  };

  const handleBeautyDateSelect = (dateKey: string) => {
    setSelectedBeautyDate(dateKey);
    setSelectedBeautyTime(null);
    setIsBookingConfirmOpen(false);
    clearSubmittedBooking();
  };

  const handleBeautyBookingContinue = () => {
    if (!selectedBeautyStore || !selectedBeautyStoreName || !selectedBeautyDate || !selectedBeautyTime) {
      return;
    }

    clearSubmittedBooking();
    setIsBookingConfirmOpen(true);
    scrollToConfirmSection();
  };

  const handleBeautyBookingSubmit = () => {
    if (isSubmittingBeautyBooking) {
      return;
    }

    if (!selectedBeautyStore || !selectedBeautyStoreName || !selectedBeautyDate || !selectedBeautyTime) {
      setIsBookingConfirmOpen(false);
      return;
    }

    if (!validateBeautyBookingForm()) {
      return;
    }

    if (!draftBeautyBookingPayload) {
      const msg = t('beauty_explore.toast_check_info');
      setBeautySubmitError(msg);
      showToast(msg);
      return;
    }

    setBeautySubmitError(null);
    setIsSubmittingBeautyBooking(true);

    void supabase.auth
      .getSession()
      .then(({ data }) => submitBeautyBooking(draftBeautyBookingPayload, data.session?.access_token ?? null))
      .then((result) => {
        setSubmittedBookingPayload(result.payload);
        setSubmittedBooking(
          buildBeautyBookingCompletionDisplay(result.payload, {
            categoryLabel: selectedBeautyCategoryLabel,
            regionLabel: selectedBeautyRegionLabel,
            dateLabel: selectedBeautyDateLabel,
            communicationLanguageLabel: selectedCommLangLabel,
            communicationIntentLabel: selectedCommIntentLabel,
            designerDefaultLabel: t('beauty_explore.label_designer_default'),
          }),
        );
        setIsBookingConfirmOpen(true);
        scrollToConfirmSection();
      })
      .catch((error) => {
        const nextMessage =
          error instanceof Error && error.message
            ? error.message
            : t('beauty_explore.toast_submit_error');

        setBeautySubmitError(nextMessage);
        showToast(nextMessage);
      })
      .finally(() => {
        setIsSubmittingBeautyBooking(false);
      });
  };

  const handleBookingEditReset = () => {
    clearSubmittedBooking();
    setIsBookingConfirmOpen(true);
    scrollToConfirmSection();
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const baseItems = hotelLocation && nearbyItems.length > 0 ? nearbyItems : MOCK_ITEMS;
  const categorizedItems = baseItems.filter((item) => {
    if (currentCategory !== 'all' && item.type !== currentCategory) {
      return false;
    }
    return true;
  });
  const itemsToShow = categorizedItems.filter((item) => {
    if (!appliedSearchTerm) {
      return true;
    }
    const lowerCaseSearchTerm = appliedSearchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.area.toLowerCase().includes(lowerCaseSearchTerm)
    );
  });
  const sortedItemsToShow = [...itemsToShow].sort((a, b) => {
    const aScore = (a as ServiceItem & { is_premium?: boolean }).is_premium ? 1 : 0;
    const bScore = (b as ServiceItem & { is_premium?: boolean }).is_premium ? 1 : 0;
    return bScore - aScore;
  });

  let finalZoom = 14;
  if (radius) {
    if (radius <= 500) {
      finalZoom = 16;
    } else if (radius <= 1000) {
      finalZoom = 15;
    } else if (radius <= 3000) {
      finalZoom = 13;
    }
  }

  const beautyCategoryLabel = beautyCategoryFilter
    ? beautyCategoryLabels[beautyCategoryFilter].label
    : t('beauty_explore.hero_title');
  const beautyCategoryBadge = beautyCategoryFilter
    ? beautyCategoryLabels[beautyCategoryFilter].badge
    : 'ALL';
  const beautyDescription = beautyCategoryFilter
    ? beautyCategoryLabels[beautyCategoryFilter].description
    : t('beauty_explore.hero_desc');
  const filteredBeautyStores = BEAUTY_STORE_ITEMS.filter((store) => {
    const matchesCategory = beautyCategoryFilter ? store.category === beautyCategoryFilter : true;
    const matchesRegion = selectedRegion === 'all' ? true : store.region === selectedRegion;
    return matchesCategory && matchesRegion;
  });
  const selectedBeautyStore = selectedBeautyStoreId
    ? BEAUTY_STORE_ITEMS.find((store) => store.id === selectedBeautyStoreId) ?? null
    : null;
  const selectedBeautyDateOptions = selectedBeautyAvailability
    ? bookingDateOptions.filter((option) => selectedBeautyAvailability.availableDates.includes(option.key))
    : [];
  const selectedBeautySlots =
    selectedBeautyDate && selectedBeautyAvailability
      ? selectedBeautyAvailability.slotsByDate[selectedBeautyDate] ?? []
      : [];
  const selectedBeautyCategoryLabel = selectedBeautyCategory
    ? beautyCategoryLabels[selectedBeautyCategory].label
    : t('beauty_explore.label_service_default');
  const selectedBeautyRegionLabel = selectedBeautyRegion
    ? beautyRegions.find((region: any) => region.id === selectedBeautyRegion)?.label ?? selectedBeautyRegion
    : t('beauty_explore.label_service_default');
  const selectedBeautyDateLabel = selectedBeautyDate
    ? bookingDateLabels[selectedBeautyDate] ?? selectedBeautyDate
    : t('beauty_explore.label_service_default');
  const selectedDesignerLabel = selectedDesigner
    ? `${selectedDesigner.name}${selectedDesigner.surcharge > 0 ? ` (+${formatPrice(selectedDesigner.surcharge)})` : ''}`
    : t('beauty_explore.label_designer_default');
  const selectedPrimaryServiceLabel = selectedPrimaryService ? selectedPrimaryService.name : t('beauty_explore.label_service_default');
  const selectedAddOnLabel = selectedAddOnOptions.length > 0
    ? selectedAddOnOptions.map((option) => option.name).join(', ')
    : t('beauty_explore.label_addon_default');
  const selectedCommLangLabel = useMemo(() => commLangs.find(l => l.id === selectedCommunicationLanguage)?.label ?? selectedCommunicationLanguage, [commLangs, selectedCommunicationLanguage]);
  const selectedCommIntentLabel = useMemo(() => commIntents.find(i => i.id === selectedCommunicationIntent)?.label ?? selectedCommunicationIntent, [commIntents, selectedCommunicationIntent]);



  const isCustomerNameValid = validateCustomerField('name', customerForm.name) === '';
  const isCustomerPhoneValid = validateCustomerField('phone', customerForm.phone) === '';
  const beautyCurrentStepIndex = submittedBooking
    ? 4
    : isBookingConfirmOpen
      ? 3
      : selectedBeautyDate && selectedBeautyTime
        ? 2
        : selectedBeautyStoreId
          ? 1
          : 0;
  const beautyFlowSteps = [
    t('beauty_explore.step_1'),
    t('beauty_explore.step_2'),
    t('beauty_explore.step_3'),
    t('beauty_explore.step_4'),
    t('beauty_explore.step_5')
  ];
  const beautyHeroFlow = beautyCategoryFilter
    ? ['지역 선택', '매장 고르기', '시간 확인']
    : ['카테고리 확인', '지역 선택', '매장 고르기'];
  const isBeautyConfirmSubmitEnabled =
    Boolean(selectedBeautyStore && selectedBeautyDate && selectedBeautyTime) &&
    Boolean(selectedPrimaryService) &&
    isCustomerNameValid &&
    isCustomerPhoneValid &&
    agreements.bookingConfirmed &&
    agreements.privacyConsent;
  const renderBeautyProgressIndicator = () => (
    <ol className={styles.beautyStepIndicator} aria-label="뷰티 예약 단계">
      {beautyFlowSteps.map((step, index) => {
        const isCurrent = index === beautyCurrentStepIndex;
        const isDone = index < beautyCurrentStepIndex;

        return (
          <li
            key={step}
            className={`${styles.beautyStepItem} ${isCurrent ? styles.beautyStepItemCurrent : ''} ${isDone ? styles.beautyStepItemDone : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className={styles.beautyStepBullet}>{index + 1}</span>
            <span className={styles.beautyStepText}>{step}</span>
          </li>
        );
      })}
    </ol>
  );

  if (isBeautyExplore) {
    return (
      <div className={styles.beautyExplorePage}>
        <section className={styles.beautyHero}>
          <span className={styles.beautyEyebrow}>Beauty Booking</span>
          <div className={styles.beautyHeaderRow}>
            <div>
              <h1 className={styles.beautyTitle}>{beautyCategoryLabel} 예약을 바로 시작해 보세요</h1>
              <p className={styles.beautySubtitle}>
                지역을 고르고 매장을 선택한 뒤, 시간만 정하면 다음 단계로 이어집니다.
              </p>
            </div>
            <div className={styles.beautyCategoryBadgeWrap}>
              <span className={styles.beautyCategoryBadgeCode}>{beautyCategoryBadge}</span>
              <span className={styles.beautyCategoryBadgeLabel}>
                {beautyCategoryFilter ? beautyCategoryLabels[beautyCategoryFilter].english : 'Beauty'}
              </span>
            </div>
          </div>
          <p className={styles.beautyDescription}>{beautyDescription}</p>
          <div className={styles.beautyHeroFlow} aria-label="빠른 예약 안내">
            {beautyHeroFlow.map((step, index) => (
              <div key={step} className={styles.beautyHeroFlowItem}>
                <span className={styles.beautyHeroFlowNumber}>{index + 1}</span>
                <span className={styles.beautyHeroFlowText}>{step}</span>
              </div>
            ))}
          </div>
          {!beautyCategoryFilter ? (
            <div className={styles.beautyGuideCard}>
              홈에서 카테고리를 먼저 고르면 더 잘 맞는 예약 흐름으로 바로 이어져요. 지금은 전체 뷰티 매장을 먼저 보고 있어요.
            </div>
          ) : null}
        </section>

        <section className={styles.beautyFiltersSection}>
          <div className={styles.beautySectionHeader}>
            <div>
              <span className={styles.beautySectionEyebrow}>Region Filter</span>
              <h2 className={styles.beautySectionTitle}>원하는 지역을 골라보세요</h2>
            </div>
            <span className={styles.beautyStoreCount}>{filteredBeautyStores.length}개 매장</span>
          </div>

          <div className={styles.beautyRegionChipRow}>
            {beautyRegions.map((region) => {
              const isActive = selectedRegion === region.id;

              return (
                <button
                  key={region.id}
                  type="button"
                  className={`${styles.beautyRegionChip} ${isActive ? styles.beautyRegionChipActive : ''}`}
                  aria-pressed={isActive}
                  onClick={() => setSelectedRegion(region.id)}
                >
                  {region.label}
                </button>
              );
            })}
          </div>
        </section>

        {selectedBeautyStore ? (
          <section className={styles.beautySelectionNotice}>
            <span className={styles.beautySelectionEyebrow}>{t('beauty_explore.step_1')}</span>
            <strong className={styles.beautySelectionTitle}>{selectedBeautyStoreName ?? selectedBeautyStore.name}</strong>
            <p className={styles.beautySelectionText}>
              {t('beauty_explore.label_select_prompt')}
            </p>
          </section>
        ) : null}

        <section className={styles.beautyStoreSection}>
          <div className={styles.beautyStoreGrid}>
            {filteredBeautyStores.length > 0 ? (
              filteredBeautyStores.map((store) => {
                const isSelected = selectedBeautyStoreId === store.id;
                const categoryMeta = beautyCategoryLabels[store.category];
                const regionLabel =
                  beautyRegions.find((region) => region.id === store.region)?.label ?? store.region;

                return (
                  <article
                    key={store.id}
                    className={`${styles.beautyStoreCard} ${isSelected ? styles.beautyStoreCardSelected : ''}`}
                  >
                    <div className={styles.beautyStoreTopRow}>
                      <span className={styles.beautyStoreCategoryPill}>{categoryMeta.label}</span>
                      <span className={styles.beautyStoreRegionPill}>{regionLabel}</span>
                    </div>
                    <h3 className={styles.beautyStoreTitle}>{store.name}</h3>
                    <div className={styles.beautyStoreMeta}>
                      <span className={styles.beautyStoreRating}>{t('beauty_explore.label_rating')} {store.rating.toFixed(1)}</span>
                      <span>{t('beauty_explore.label_review')} {store.reviewCount}</span>
                    </div>
                    <div className={styles.beautyStorePrice}>{store.priceLabel}</div>
                    <p className={styles.beautyStoreDescription}>{store.shortDescription}</p>
                    <div className={styles.beautyStoreTagRow}>
                      {store.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className={styles.beautyStoreTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={styles.beautyStoreCta}
                      aria-pressed={isSelected}
                      aria-label={`${store.name} ${isSelected ? t('beauty_explore.btn_reselect_time') : t('beauty_explore.btn_select_time')}`}
                      onClick={() => handleBeautyStoreSelect(store.id, store.name, store.region, store.category)}
                    >
                      {isSelected ? t('beauty_explore.btn_reselect_time') : t('beauty_explore.btn_select_time')}
                    </button>
                  </article>
                );
              })
            ) : (
              <div className={styles.beautyEmptyState}>
                <p className={styles.beautyEmptyTitle}>{t('beauty_explore.empty_store_title')}</p>
                <p className={styles.beautyEmptyText}>{t('beauty_explore.empty_store_desc')}</p>
              </div>
            )}
          </div>
        </section>

        <section ref={bookingPanelRef} className={styles.beautyBookingPanel}>
          <div className={styles.beautyBookingHeader}>
            <div>
              <span className={styles.beautySectionEyebrow}>{t('beauty_explore.step_2')}</span>
              <h2 className={styles.beautyBookingTitle}>{t('beauty_explore.booking_panel_title')}</h2>
              <p className={styles.beautyBookingDescription}>
                {t('beauty_explore.booking_panel_desc')}
              </p>
            </div>
            {renderBeautyProgressIndicator()}
          </div>

          {!selectedBeautyStoreId || !selectedBeautyStore ? (
            <div className={styles.beautyBookingEmpty}>
              <p className={styles.beautyBookingEmptyTitle}>{t('beauty_explore.booking_empty_title')}</p>
              <p className={styles.beautyBookingEmptyText}>
                {t('beauty_explore.booking_empty_desc')}
              </p>
            </div>
          ) : !selectedBeautyAvailability ? (
            <div className={styles.beautyBookingEmpty}>
              <p className={styles.beautyBookingEmptyTitle}>{t('beauty_explore.booking_not_found_title')}</p>
              <p className={styles.beautyBookingEmptyText}>
                {t('beauty_explore.booking_not_found_desc')}
              </p>
            </div>
          ) : (
            <div className={styles.beautyBookingLayout}>
              <div className={styles.beautyBookingBlock}>
                <h3 className={styles.beautyBookingBlockTitle}>{t('beauty_explore.booking_date_label')}</h3>
                {selectedBeautyDateOptions.length > 0 ? (
                  <div className={styles.beautyDateChipRow}>
                    {selectedBeautyDateOptions.map((option) => {
                      const isActive = selectedBeautyDate === option.key;

                      return (
                        <button
                          key={option.key}
                          type="button"
                          className={`${styles.beautyDateChip} ${isActive ? styles.beautyDateChipActive : ''}`}
                          aria-pressed={isActive}
                          onClick={() => handleBeautyDateSelect(option.key)}
                        >
                          <span className={styles.beautyDateChipPrimary}>{option.shortLabel}</span>
                          <span className={styles.beautyDateChipSecondary}>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.beautyBookingInlineEmpty}>{t('beauty_explore.booking_no_date')}</div>
                )}
              </div>

              <div className={styles.beautyBookingBlock}>
                <h3 className={styles.beautyBookingBlockTitle}>{t('beauty_explore.booking_time_label')}</h3>
                {!selectedBeautyDate ? (
                  <div className={styles.beautyBookingInlineEmpty}>{t('beauty_explore.booking_no_time_wait')}</div>
                ) : selectedBeautySlots.length > 0 ? (
                  <div className={styles.beautyTimeSlotGrid}>
                    {selectedBeautySlots.map((slot) => {
                      const isActive = selectedBeautyTime === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`${styles.beautyTimeSlot} ${isActive ? styles.beautyTimeSlotActive : ''}`}
                          aria-pressed={isActive}
                          onClick={() => {
                            setSelectedBeautyTime(slot);
                            clearSubmittedBooking();
                          }}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.beautyBookingInlineEmpty}>
                    {t('beauty_explore.booking_no_slots')}
                  </div>
                )}
              </div>

              <div className={styles.beautyBookingSummary}>
                <span className={styles.beautySectionEyebrow}>{t('beauty_explore.step_3')}</span>
                <div className={styles.beautySummaryList}>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_explore.summary_category')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyCategoryLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_explore.summary_store')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyStoreName ?? t('beauty_explore.label_service_default')}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_explore.summary_region')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyRegionLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_explore.summary_date')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyDateLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_explore.summary_time')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyTime ?? t('beauty_explore.label_service_default')}</strong>
                  </div>
                </div>
                <p className={styles.beautyBookingHint}>
                  {t('beauty_explore.summary_hint')}
                </p>
                <button
                  type="button"
                  className={styles.beautyBookingCta}
                  disabled={!selectedBeautyDate || !selectedBeautyTime}
                  aria-label={t('beauty_explore.summary_btn')}
                  onClick={handleBeautyBookingContinue}
                >
                  {t('beauty_explore.summary_btn')}
                </button>
              </div>
            </div>
          )}
        </section>

        <section ref={confirmSectionRef} className={styles.beautyConfirmPanel}>
          <div className={styles.beautyConfirmHeader}>
            <div>
              <span className={styles.beautySectionEyebrow}>{t('beauty_explore.step_4')}</span>
              <h2 className={styles.beautyConfirmTitle}>{t('beauty_explore.confirm_title')}</h2>
              <p className={styles.beautyConfirmDescription}>
                {t('beauty_explore.confirm_desc')}
              </p>
            </div>
            {renderBeautyProgressIndicator()}
          </div>

          {submittedBooking ? (
            <div
              className={styles.beautyCompletionCard}
              data-booking-flow={submittedBookingPayload?.createdFrom.flow ?? undefined}
            >
              <p className={styles.beautyCompletionTitle}>{t('beauty_explore.completion_title')}</p>
              <div className={styles.beautyCompletionMain}>
                <p className={styles.beautyCompletionDesc}>
                  {t('beauty_explore.completion_desc1')}
                </p>
                <p className={styles.beautyCompletionSmall}>
                  • {t('beauty_explore.completion_desc2')}
                </p>
                <div className={styles.beautyCompletionNote}>
                  <p>
                    {selectedCommLangLabel} | {selectedCommIntentLabel}
                  </p>
                  <p>{t('beauty_explore.completion_desc3')}</p>
                </div>
              </div>
              <div className={styles.beautyCompletionHero}>
                <div className={styles.beautyCompletionHeroBlock}>
                  <span className={styles.beautyCompletionHeroLabel}>예약 매장</span>
                  <strong className={styles.beautyCompletionHeroTitle}>{submittedBooking.storeName}</strong>
                  <span className={styles.beautyCompletionHeroMeta}>
                    {submittedBooking.date} · {submittedBooking.time}
                  </span>
                </div>
                <div className={styles.beautyCompletionPriceBox}>
                  <span className={styles.beautyCompletionHeroLabel}>예상 총 금액</span>
                  <strong className={styles.beautyCompletionPrice}>{formatPrice(submittedBooking.estimatedTotal)}</strong>
                </div>
              </div>
              <div className={styles.beautyCompletionGrid}>
                <div className={styles.beautyCompletionSection}>
                  <h4 className={styles.beautyCompletionSectionTitle}>예약 정보</h4>
                  <div className={styles.beautySummaryList}>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>카테고리</span>
                      <strong className={styles.beautySummaryValue}>{submittedBooking.category}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>지역</span>
                      <strong className={styles.beautySummaryValue}>{submittedBooking.region}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>디자이너</span>
                      <strong className={styles.beautySummaryValue}>{submittedBooking.designerName}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>대표 시술</span>
                      <strong className={styles.beautySummaryValue}>{submittedBooking.primaryServiceName}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>부가 옵션</span>
                      <strong className={styles.beautySummaryValue}>
                        {submittedBooking.addOnNames.length > 0 ? submittedBooking.addOnNames.join(', ') : '선택 안 함'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className={styles.beautyCompletionSection}>
                  <h4 className={styles.beautyCompletionSectionTitle}>고객 및 전달 정보</h4>
                  <div className={styles.beautySummaryList}>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>고객 이름</span>
                      <strong className={styles.beautySummaryValue}>{submittedBooking.customerName}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>연락처</span>
                      <strong className={styles.beautySummaryValue}>{submittedBooking.customerPhone}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>전달 언어</span>
                      <strong className={styles.beautySummaryValue}>{submittedBooking.communicationLanguageLabel}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>전달 목적</span>
                      <strong className={styles.beautySummaryValue}>{submittedBooking.communicationIntentLabel}</strong>
                    </div>
                    {submittedBooking.customerRequest ? (
                      <div className={styles.beautySummaryItem}>
                        <span className={styles.beautySummaryLabel}>{t('beauty_explore.form_request')}</span>
                        <strong className={styles.beautySummaryValue}>{submittedBooking.customerRequest}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className={styles.beautyAssistMessageGrid}>
                <div className={styles.beautyAssistMessageCard}>
                  <div className={styles.beautyAssistMessageHeader}>
                    <span className={styles.beautyAssistMessageLabel}>{t('beauty_bookings.lang_ko')} {t('beauty_bookings.label_message')}</span>
                  </div>
                  <div className={styles.beautyAssistMessageBox}>{truncatePreview(submittedBooking.koreanMessage, 96)}</div>
                </div>
                <div className={styles.beautyAssistMessageCard}>
                  <div className={styles.beautyAssistMessageHeader}>
                    <span className={styles.beautyAssistMessageLabel}>{submittedBooking.communicationLanguageLabel} {t('beauty_bookings.label_message')}</span>
                  </div>
                  <div className={styles.beautyAssistMessageBox}>{truncatePreview(submittedBooking.localizedMessage, 96)}</div>
                </div>
              </div>
              <div className={styles.beautyCompletionActions}>
                <button type="button" className={styles.beautySecondaryAction} onClick={handleBookingEditReset}>
                  {t('beauty_explore.btn_edit')}
                </button>
              </div>
            </div>
          ) : !isBookingConfirmOpen ? (
            <div className={styles.beautyConfirmEmpty}>
              <p className={styles.beautyConfirmEmptyTitle}>{t('beauty_explore.confirm_empty_title')}</p>
              <p className={styles.beautyConfirmEmptyText}>
                {t('beauty_explore.confirm_empty_desc')}
              </p>
            </div>
          ) : !selectedBeautyStore || !selectedBeautyStoreName || !selectedBeautyDate || !selectedBeautyTime ? (
            <div className={styles.beautyConfirmEmpty}>
              <p className={styles.beautyConfirmEmptyTitle}>{t('beauty_explore.confirm_review_error_title')}</p>
              <p className={styles.beautyConfirmEmptyText}>
                {t('beauty_explore.confirm_review_error_desc')}
              </p>
            </div>
          ) : (
            <div className={styles.beautyConfirmLayout}>
              <div className={styles.beautyConfirmSummaryCard}>
                <span className={styles.beautySectionEyebrow}>Booking Review</span>
                <div className={styles.beautySummaryList}>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_explore.summary_category')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyCategoryLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_explore.summary_store')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyStoreName}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_explore.summary_region')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyRegionLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_explore.summary_date')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyDateLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_explore.summary_time')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyTime}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_bookings.detail_designer')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedDesignerLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_bookings.service_primary')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedPrimaryServiceLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_bookings.service_addons')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedAddOnLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('common.beauty_bookings.price_total')}</span>
                    <strong className={styles.beautySummaryValue}>{formatPrice(selectedPriceSummary.totalPrice)}</strong>
                  </div>
                </div>
                <p className={styles.beautyOptionHint}>
                  {t('beauty_explore.confirm_price_hint')}
                </p>
              </div>

              <div className={styles.beautyConfirmCard}>
                <span className={styles.beautySectionEyebrow}>Designer</span>
                <div className={styles.beautyOptionGrid} role="group" aria-label={t('beauty_bookings.detail_designer') + ' ' + t('common.select')}>
                  {availableDesigners.length > 0 ? (
                    availableDesigners.map((designer) => {
                      const isActive = selectedDesignerId === designer.id;

                      return (
                        <button
                          key={designer.id}
                          type="button"
                          className={`${styles.beautyOptionCard} ${isActive ? styles.beautyOptionCardActive : ''}`}
                          aria-pressed={isActive}
                          aria-label={`${designer.name} ${t('beauty_bookings.detail_designer')} ${t('common.select')}`}
                          onClick={() => handleDesignerSelect(designer.id)}
                        >
                          <span className={styles.beautyOptionTitle}>{designer.name}</span>
                          <span className={styles.beautyOptionMeta}>{designer.specialty}</span>
                          <span className={styles.beautyOptionMeta}>{designer.experienceLabel}</span>
                          <span className={styles.beautyOptionDescription}>{designer.shortNote}</span>
                          <strong className={styles.beautyOptionPrice}>
                            {designer.surcharge > 0 ? `+${formatPrice(designer.surcharge)}` : t('beauty_explore.label_no_surcharge')}
                          </strong>
                        </button>
                      );
                    })
                  ) : (
                    <div className={styles.beautyBookingInlineEmpty}>{t('beauty_explore.label_no_designer')}</div>
                  )}
                </div>
                <p className={styles.beautyOptionHint}>
                  {t('beauty_explore.label_designer_hint')}
                </p>
              </div>

              <div className={styles.beautyConfirmCard}>
                <span className={styles.beautySectionEyebrow}>{t('beauty_bookings.section_service')}</span>
                <div className={styles.beautyOptionSection}>
                  <div className={styles.beautyOptionSectionHeader}>
                    <h3 id="beauty-primary-service-title" className={styles.beautyOptionSectionTitle}>
                      {t('beauty_bookings.primary_service')}
                    </h3>
                    <span className={styles.beautyOptionSectionMeta}>{t('beauty_bookings.primary_service_count')}</span>
                  </div>
                  <div
                    className={styles.beautyOptionGrid}
                    role="group"
                    aria-labelledby="beauty-primary-service-title"
                    aria-describedby={formErrors.primaryService ? 'beauty-primary-service-error' : undefined}
                  >
                    {availablePrimaryServices.length > 0 ? (
                      availablePrimaryServices.map((service) => {
                        const isActive = selectedPrimaryServiceId === service.id;

                        return (
                          <button
                            key={service.id}
                            type="button"
                            className={`${styles.beautyOptionCard} ${isActive ? styles.beautyOptionCardActive : ''}`}
                            aria-pressed={isActive}
                            aria-label={`${service.name} ${t('beauty_bookings.primary_service')} ${t('common.select')}`}
                            onClick={() => handlePrimaryServiceSelect(service.id)}
                          >
                            <span className={styles.beautyOptionTitle}>{service.name}</span>
                            <span className={styles.beautyOptionDescription}>{service.description}</span>
                            <strong className={styles.beautyOptionPrice}>{formatPrice(service.price)}</strong>
                          </button>
                        );
                      })
                    ) : (
                      <div className={styles.beautyBookingInlineEmpty}>{t('beauty_bookings.primary_service_empty')}</div>
                    )}
                  </div>
                  {formErrors.primaryService ? (
                    <p id="beauty-primary-service-error" className={styles.beautyFieldError}>{formErrors.primaryService}</p>
                  ) : (
                    <p className={styles.beautyOptionHint}>{t('beauty_bookings.primary_service_hint')}</p>
                  )}
                </div>

                <div className={styles.beautyOptionSection}>
                  <div className={styles.beautyOptionSectionHeader}>
                    <h3 className={styles.beautyOptionSectionTitle}>{t('beauty_bookings.service_addons')}</h3>
                    <span className={styles.beautyOptionSectionMeta}>{t('beauty_explore.label_addon_limit')}</span>
                  </div>
                  <div className={styles.beautyOptionGrid} role="group" aria-label={t('beauty_bookings.service_addons') + ' ' + t('common.select')}>
                    {availableAddOnOptions.length > 0 ? (
                      availableAddOnOptions.map((option) => {
                        const isActive = selectedAddOnIds.includes(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`${styles.beautyOptionCard} ${isActive ? styles.beautyOptionCardActive : ''}`}
                            aria-pressed={isActive}
                            aria-label={`${option.name} ${t('beauty_bookings.service_addons')} ${t('common.select')}`}
                            onClick={() => handleAddOnToggle(option.id)}
                          >
                            <span className={styles.beautyOptionTitle}>{option.name}</span>
                            <span className={styles.beautyOptionDescription}>{option.description}</span>
                            <strong className={styles.beautyOptionPrice}>{formatPrice(option.price)}</strong>
                          </button>
                        );
                      })
                    ) : (
                      <div className={styles.beautyBookingInlineEmpty}>{t('beauty_bookings.add_on_empty')}</div>
                    )}
                  </div>
                  <p className={styles.beautyOptionHint}>{t('beauty_bookings.add_on_hint')}</p>
                </div>
              </div>

              <div className={styles.beautyPriceCard}>
                <span className={styles.beautySectionEyebrow}>{t('beauty_bookings.section_price')}</span>
                <div className={styles.beautySummaryList}>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_bookings.price_base')}</span>

                    <strong className={styles.beautySummaryValue}>{formatPrice(selectedPriceSummary.basePrice)}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_bookings.price_add_on')}</span>
                    <strong className={styles.beautySummaryValue}>{formatPrice(selectedPriceSummary.addOnPrice)}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_bookings.price_designer')}</span>
                    <strong className={styles.beautySummaryValue}>{formatPrice(selectedPriceSummary.designerSurcharge)}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{t('beauty_bookings.price_total')}</span>
                    <strong className={styles.beautySummaryValue}>{formatPrice(selectedPriceSummary.totalPrice)} {t('beauty_explore.label_booking_unit')}</strong>
                  </div>
                </div>
                <p className={styles.beautyOptionHint}>
                  {t('beauty_explore.completion_desc2')}
                </p>
              </div>

              <div className={styles.beautyConfirmCard}>
                <span className={styles.beautySectionEyebrow}>Customer Details</span>
                <div className={styles.beautyFormGrid}>
                  {customerFormFields.map((field) => {
                    const inputId = `beauty-booking-${field.key}`;
                    const fieldError = field.key === 'request' ? '' : formErrors[field.key];
                    const errorId = fieldError ? `${inputId}-error` : undefined;

                    return (
                      <div key={field.key} className={styles.beautyFormField}>
                        <label className={styles.beautyFormLabel} htmlFor={inputId}>
                          {field.label}
                          {field.required ? ' *' : ''}
                        </label>
                        {field.multiline ? (
                          <textarea
                            id={inputId}
                            className={styles.beautyTextarea}
                            rows={4}
                            value={customerForm[field.key]}
                            placeholder={field.placeholder}
                            aria-label={field.label}
                            onChange={(event) => handleCustomerFieldChange(field.key, event.target.value)}
                          />
                        ) : (
                          <input
                            id={inputId}
                            className={styles.beautyTextInput}
                            type={field.key === 'phone' ? 'tel' : 'text'}
                            value={customerForm[field.key]}
                            placeholder={field.placeholder}
                            aria-invalid={Boolean(fieldError)}
                            aria-describedby={errorId}
                            onChange={(event) => handleCustomerFieldChange(field.key, event.target.value)}
                            onBlur={() => handleCustomerFieldBlur(field.key as Extract<CustomerFormFieldKey, 'name' | 'phone'>)}
                          />
                        )}
                        {fieldError ? <p id={errorId} className={styles.beautyFieldError}>{fieldError}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.beautyAssistCard}>
                <span className={styles.beautySectionEyebrow}>{t('beauty_bookings.section_communication')}</span>
                <div className={styles.beautyAssistSection}>
                  <div className={styles.beautyOptionSectionHeader}>
                    <h3 className={styles.beautyOptionSectionTitle}>{t('beauty_bookings.comm_lang_title')}</h3>
                    <span className={styles.beautyOptionSectionMeta}>{t('beauty_bookings.comm_lang_desc')}</span>
                  </div>
                  <div className={styles.beautyAssistChipRow} role="group" aria-label={t('beauty_bookings.comm_lang_title') + ' ' + t('common.select')}>
                    {commLangs.map((language: any) => {
                      const isActive = selectedCommunicationLanguage === language.id;

                      return (
                        <button
                          key={language.id}
                          type="button"
                          className={`${styles.beautyAssistChip} ${isActive ? styles.beautyAssistChipActive : ''}`}
                          aria-pressed={isActive}
                          onClick={() => handleCommunicationLanguageSelect(language.id)}
                        >
                          <span className={styles.beautyAssistChipBadge}>{language.badge}</span>
                          <span>{language.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.beautyAssistSection}>
                  <div className={styles.beautyOptionSectionHeader}>
                    <h3 className={styles.beautyOptionSectionTitle}>{t('beauty_bookings.comm_intent_title')}</h3>
                    <span className={styles.beautyOptionSectionMeta}>{t('beauty_bookings.comm_intent_desc')}</span>
                  </div>
                  <div className={styles.beautyOptionGrid} role="group" aria-label={t('beauty_bookings.comm_intent_title') + ' ' + t('common.select')}>
                    {commIntents.map((intent: any) => {
                      const isActive = selectedCommunicationIntent === intent.id;

                      return (
                        <button
                          key={intent.id}
                          type="button"
                          className={`${styles.beautyOptionCard} ${isActive ? styles.beautyOptionCardActive : ''}`}
                          aria-pressed={isActive}
                          onClick={() => handleCommunicationIntentSelect(intent.id)}
                        >
                          <span className={styles.beautyOptionTitle}>{intent.label}</span>
                          <span className={styles.beautyOptionDescription}>{intent.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.beautyAssistSection}>
                  <div className={styles.beautyOptionSectionHeader}>
                    <h3 className={styles.beautyOptionSectionTitle}>{t('beauty_bookings.comm_message_title')}</h3>
                    <span className={styles.beautyOptionSectionMeta}>{t('beauty_bookings.comm_message_desc')}</span>
                  </div>
                  <div className={styles.beautyAssistMessageGrid}>
                    <div className={styles.beautyAssistMessageCard}>
                      <div className={styles.beautyAssistMessageHeader}>
                        <span className={styles.beautyAssistMessageLabel}>{t('beauty_bookings.lang_ko')} {t('beauty_bookings.label_message')}</span>
                        <button
                          type="button"
                          className={styles.beautyAssistAction}
                          onClick={() => handlePrepareMessageCopy(t('beauty_bookings.lang_ko'))}
                        >
                          {t('beauty_bookings.btn_copy_ready')}
                        </button>
                      </div>
                      <textarea
                        className={styles.beautyAssistTextarea}
                        readOnly
                        aria-label={`${t('beauty_bookings.lang_ko')} ${t('beauty_bookings.label_message')}`}
                        value={generatedKoreanMessage}
                        rows={5}
                      />
                    </div>

                    <div className={styles.beautyAssistMessageCard}>
                      <div className={styles.beautyAssistMessageHeader}>
                        <span className={styles.beautyAssistMessageLabel}>{selectedCommLangLabel} {t('beauty_bookings.label_message')}</span>
                        <button
                          type="button"
                          className={styles.beautyAssistAction}
                          onClick={() => handlePrepareMessageCopy(selectedCommLangLabel)}
                        >
                          {t('beauty_bookings.btn_copy_ready')}
                        </button>
                      </div>
                      <textarea
                        className={styles.beautyAssistTextarea}
                        readOnly
                        aria-label={`${selectedCommLangLabel} ${t('beauty_bookings.label_message')}`}
                        value={generatedLocalizedMessage}
                        rows={5}
                      />
                    </div>
                  </div>
                  <p className={styles.beautyOptionHint}>
                    {t('beauty_bookings.comm_message_hint')}
                  </p>
                </div>
              </div>

              <div className={styles.beautyAgreementCard}>
                <span className={styles.beautySectionEyebrow}>{t('beauty_bookings.section_agreement')}</span>
                <div className={styles.beautyAgreementList}>
                  {agreementFields.map((field: any) => {
                    const errorId = formErrors[field.key as FormErrorKey] ? `beauty-agreement-${field.key}-error` : undefined;

                    return (
                      <div key={field.key} className={styles.beautyAgreementItem}>
                        <label className={styles.beautyAgreementRow}>
                          <input
                            className={styles.beautyAgreementCheckbox}
                            type="checkbox"
                            checked={agreements[field.key as keyof AgreementState]}
                            aria-invalid={Boolean(formErrors[field.key as FormErrorKey])}
                            aria-describedby={errorId}
                            onChange={() => handleAgreementToggle(field.key as keyof AgreementState)}
                          />
                          <span className={styles.beautyAgreementTextWrap}>
                            <strong className={styles.beautyAgreementTitle}>{field.label}</strong>
                            <span className={styles.beautyAgreementText}>{field.description}</span>
                          </span>
                        </label>
                        {formErrors[field.key as FormErrorKey] ? (
                          <p id={errorId} className={styles.beautyAgreementError}>{formErrors[field.key as FormErrorKey]}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={styles.beautyFinalCta}
                  disabled={!isBeautyConfirmSubmitEnabled || isSubmittingBeautyBooking}
                  aria-label={t('beauty_explore.btn_submit')}
                  aria-busy={isSubmittingBeautyBooking}
                  onClick={handleBeautyBookingSubmit}
                >
                  {isSubmittingBeautyBooking ? t('my_bookings.status_preparing') : t('beauty_explore.btn_submit')}
                </button>
                {beautySubmitError ? (
                  <p className={styles.beautyAgreementError} role="status" aria-live="polite">
                    {beautySubmitError}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </section>

        {toastMessage ? <div className={styles.toast}>{toastMessage}</div> : null}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ExploreHeader
        currentCity={currentCity}
        onCityChange={handleCityChange}
        currentCategory={currentCategory}
        onCategoryChange={handleCategoryChange}
        onFilterClick={() => setIsFilterOpen(true)}
        filterCount={Object.keys(activeFilters).length}
        radius={radius}
        onRadiusChange={setRadius}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchSubmit={handleSearchSubmit}
      />

      <main
        style={{
          paddingBottom: '80px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          height: '100%',
          minHeight: '500px',
        }}
      >
        {isLoading ? (
          <div
            className={styles.loadingState}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'rgba(0,0,0,0.5)' }}
          >
            <div className={styles.spinner}></div>
            <p>{t('common.searching')} {currentCategory}...</p>
          </div>
        ) : null}
        <div style={{ flex: 1, width: '100%', display: 'flex' }}>
          <ExploreMap
            items={sortedItemsToShow}
            center={hotelLocation ? { lat: hotelLocation.lat, lng: hotelLocation.lng } : { lat: 37.5665, lng: 126.978 }}
            onItemClick={handleDetails}
            radius={radius}
            zoom={finalZoom}
          />
        </div>
      </main>

      <FilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        category={currentCategory}
        onApply={handleApplyFilter}
      />

      <AddToPlanModal
        isOpen={isAddToPlanOpen}
        onClose={() => setIsAddToPlanOpen(false)}
        onSelectDay={handleAddToPlan}
        itemTitle={selectedItemForPlan?.title || ''}
      />

      {toastMessage ? <div className={styles.toast}>{toastMessage}</div> : null}
    </div>
  );
}
