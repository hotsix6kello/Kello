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
import IntegratedBookingMenu from '../components/IntegratedBookingMenu';

import { useTrip } from '@/lib/contexts/TripContext';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from 'react-i18next';

type ActiveFilters = Record<string, string[]>;
type BeautyCategoryId = 'hair' | 'nail' | 'esthetic' | 'waxing' | 'makeup' | 'lash';
type BeautyRegionId = 'all' | 'jongno' | 'gangnam' | 'hongdae' | 'seongsu' | 'jamsil' | 'konkuk' | 'pangyo';

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
  imageUrl?: string;
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

const CUSTOMER_FORM_FIELDS: (t: any, tBeauty: any) => CustomerFieldConfig[] = (t, tBeauty) => [
  {
    key: 'name',
    label: tBeauty('form_name', { defaultValue: 'Name (English Only)' }),
    placeholder: tBeauty('form_name_placeholder', { defaultValue: 'Please enter your name in English' }),
    required: true,
  },
  {
    key: 'phone',
    label: tBeauty('form_phone', { defaultValue: '연락처' }),
    placeholder: tBeauty('form_phone_placeholder', { defaultValue: '전화번호를 입력해 주세요' }),
    required: true,
  },
  {
    key: 'request',
    label: tBeauty('form_request', { defaultValue: '요청사항' }),
    placeholder: tBeauty('form_request_placeholder', { defaultValue: '매장에 전달하실 내용을 적어주세요' }),
    multiline: true,
  },
];

const AGREEMENT_FIELDS: (t: any, tBeauty: any) => AgreementFieldConfig[] = (t, tBeauty) => [
  {
    key: 'bookingConfirmed',
    label: tBeauty('agreement_confirm', { defaultValue: '예약 내용 확인' }),
    description: tBeauty('agreement_confirm_desc', { defaultValue: '선택하신 매장, 일시, 시술 정보가 정확함을 확인합니다.' }),
  },
  {
    key: 'privacyConsent',
    label: tBeauty('agreement_privacy', { defaultValue: '개인정보 처리방침 동의' }),
    description: tBeauty('agreement_privacy_desc', { defaultValue: '예약 진행을 위해 성함, 연락처 등의 정보가 매장에 제공됨에 동의합니다.' }),
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

const COMMUNICATION_LANGUAGES: (t: any, tBeauty: any) => CommunicationLanguageConfig[] = (t, tBeauty) => [
  { id: 'ko', label: tBeauty('lang_ko', { defaultValue: '한국어' }), badge: 'KO' },
  { id: 'en', label: tBeauty('lang_en', { defaultValue: 'English' }), badge: 'EN' },
  { id: 'ja', label: tBeauty('lang_ja', { defaultValue: '日本語' }), badge: 'JA' },
  { id: 'zh-CN', label: tBeauty('lang_zh_cn', { defaultValue: '中文' }), badge: 'ZH' },
];

const COMMUNICATION_INTENTS: (t: any, tBeauty: any) => CommunicationIntentConfig[] = (t, tBeauty) => [
  {
    id: 'booking_confirm',
    label: tBeauty('intent_booking_confirm', { defaultValue: '예약 확인' }),
    description: tBeauty('intent_booking_confirm_desc', { defaultValue: '예약 시간과 시술 내용을 간단히 확인할 때 적합해요.' }),
  },
  {
    id: 'service_request',
    label: tBeauty('intent_service_request', { defaultValue: '시술 요청 전달' }),
    description: tBeauty('intent_service_request_desc', { defaultValue: '원하는 시술과 부가 옵션을 미리 전달할 때 적합해요.' }),
  },
  {
    id: 'allergy_notice',
    label: tBeauty('intent_allergy_notice', { defaultValue: '알레르기/민감 사항 전달' }),
    description: tBeauty('intent_allergy_notice_desc', { defaultValue: '민감한 피부나 주의사항을 미리 공유할 때 적합해요.' }),
  },
  {
    id: 'style_consultation',
    label: tBeauty('intent_style_consultation', { defaultValue: '스타일 상담 도움' }),
    description: tBeauty('intent_style_consultation_desc', { defaultValue: '방문 전 스타일 상담 의도를 간단히 전달할 때 적합해요.' }),
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

const BEAUTY_CATEGORY_META: (t: any, tBeauty: any) => Record<
  BeautyCategoryId,
  { label: string; english: string; badge: string; description: string }
> = (t, tBeauty) => ({
  hair: {
    label: tBeauty('home_beauty:categories.hair.label', { defaultValue: '헤어' }),
    english: 'Hair',
    badge: 'HAIR',
    description: tBeauty('home_beauty:categories.hair.summary', { defaultValue: '스타일 체인지부터 가벼운 손질까지 빠르게 예약을 시작할 수 있어요.' }),
  },
  nail: {
    label: tBeauty('home_beauty:categories.nail.label', { defaultValue: '네일' }),
    english: 'Nail',
    badge: 'NAIL',
    description: tBeauty('home_beauty:categories.nail.summary', { defaultValue: '트렌디한 아트와 꼼꼼한 케어' }),
  },
  esthetic: {
    label: tBeauty('home_beauty:categories.esthetic.label', { defaultValue: '피부관리' }),
    english: 'Esthetic',
    badge: 'CARE',
    description: tBeauty('home_beauty:categories.esthetic.summary', { defaultValue: '피부 타입별 맞춤 케어 솔루션' }),
  },
  waxing: {
    label: tBeauty('home_beauty:categories.waxing.label', { defaultValue: '왁싱' }),
    english: 'Waxing',
    badge: 'WAX',
    description: tBeauty('home_beauty:categories.waxing.summary', { defaultValue: '깔끔한 위생 관리와 저자극 시술' }),
  },
  makeup: {
    label: tBeauty('home_beauty:categories.makeup.label', { defaultValue: '메이크업' }),
    english: 'Makeup',
    badge: 'MAKE',
    description: tBeauty('home_beauty:categories.makeup.summary', { defaultValue: '특별한 날을 위한 전문가의 터치' }),
  },
  lash: {
    label: tBeauty('home_beauty:categories.lash.label', { defaultValue: '속눈썹' }),
    english: 'Lash',
    badge: 'LASH',
    description: tBeauty('home_beauty:categories.lash.summary', { defaultValue: '눈매를 또렷하게 만드는 컬 디자인' }),
  },
});

const BEAUTY_REGIONS: (t: any, tBeauty: any) => Array<{ id: BeautyRegionId; label: string }> = (t, tBeauty) => [
  { id: 'all', label: tBeauty('region_all', { defaultValue: '전체 지역' }) },
  { id: 'jongno', label: tBeauty('regions.jongno', { defaultValue: '종로' }) },
  { id: 'gangnam', label: tBeauty('regions.gangnam', { defaultValue: '강남' }) },
  { id: 'hongdae', label: tBeauty('regions.hongdae', { defaultValue: '홍대' }) },
  { id: 'seongsu', label: tBeauty('regions.seongsu', { defaultValue: '성수' }) },
  { id: 'jamsil', label: tBeauty('regions.jamsil', { defaultValue: '잠실' }) },
  { id: 'konkuk', label: tBeauty('regions.konkuk', { defaultValue: '건대' }) },
  { id: 'pangyo', label: tBeauty('regions.pangyo', { defaultValue: '판교' }) },
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
  const { t: tBeauty } = useTranslation(['beauty_explore', 'home_beauty']);

  function formatPrice(value: number): string {
    const formatted = new Intl.NumberFormat(i18n.language === 'ko' ? 'ko-KR' : 'en-US').format(value);
    const unit = t('beauty_explore.label_booking_unit');
    return i18n.language === 'ko' ? `${formatted}${unit}` : `${unit} ${formatted}`;
  }
  const { 
    addItineraryItem, 
    selectedCategory: globalCategory, 
    setSelectedCategory: setGlobalCategory,
    searchQuery: globalSearchQuery,
    setSearchQuery: setGlobalSearchQuery,
    destinationInfo,
    setDestinationInfo
  } = useTrip();
  const categoryParam = searchParams.get('category');
  const beautyCategoryParam = searchParams.get('beautyCategory');
  const isBeautyExplore = categoryParam === 'beauty';
  const beautyCategoryFilter = isBeautyCategoryId(beautyCategoryParam)
    ? beautyCategoryParam
    : isBeautyCategoryId(globalCategory)
    ? globalCategory
    : null;

  const bookingDateOptions = useMemo(() => createBookingDateOptions(t), [t]);
  const bookingDateLabels = useMemo(() =>
    bookingDateOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.key] = option.label;
      return acc;
    }, {}),
    [bookingDateOptions]
  );

  const customerFormFields = useMemo(() => CUSTOMER_FORM_FIELDS(t, tBeauty), [t, tBeauty]);
  const agreementFields = useMemo(() => AGREEMENT_FIELDS(t, tBeauty), [t, tBeauty]);
  const beautyRegions = useMemo(() => BEAUTY_REGIONS(t, tBeauty), [t, tBeauty]);
  const beautyCategoryLabels = useMemo(() => BEAUTY_CATEGORY_META(t, tBeauty), [t, tBeauty]);
  const commLangs = useMemo(() => COMMUNICATION_LANGUAGES(t, tBeauty), [t, tBeauty]);
  const commIntents = useMemo(() => COMMUNICATION_INTENTS(t, tBeauty), [t, tBeauty]);

  const translatedStores = useMemo(() => {
    return BEAUTY_STORE_ITEMS.map((store) => ({
      ...store,
      name: tBeauty(`stores.${store.id}.name`, { defaultValue: store.name }),
      priceLabel: tBeauty(`stores.${store.id}.priceLabel`, { defaultValue: store.priceLabel }),
      shortDescription: tBeauty(`stores.${store.id}.shortDescription`, { defaultValue: store.shortDescription }),
      tags: store.tags.map((tag, i) => tBeauty(`stores.${store.id}.tags.${i}`, { defaultValue: tag }))
    }));
  }, [tBeauty]);

  const translatedDesignersByStore = useMemo(() => {
    const result: Record<string, BeautyDesigner[]> = {};
    for (const [storeId, designers] of Object.entries(DESIGNERS_BY_STORE)) {
      result[storeId] = designers.map(d => ({
        ...d,
        name: tBeauty(`designers.${d.id}.name`, { defaultValue: d.name }),
        specialty: tBeauty(`designers.${d.id}.specialty`, { defaultValue: d.specialty }),
        experienceLabel: tBeauty(`designers.${d.id}.experienceLabel`, { defaultValue: d.experienceLabel }),
        shortNote: tBeauty(`designers.${d.id}.shortNote`, { defaultValue: d.shortNote })
      }));
    }
    return result;
  }, [tBeauty]);

  const translatedPrimaryServices = useMemo(() => {
    const result: Record<string, BeautyServiceOption[]> = {};
    for (const [cat, services] of Object.entries(PRIMARY_SERVICES_BY_CATEGORY)) {
      result[cat] = services.map(s => ({
        ...s,
        name: tBeauty(`services.${s.id}.name`, { defaultValue: s.name }),
        description: tBeauty(`services.${s.id}.desc`, { defaultValue: s.description })
      }));
    }
    return result as Record<BeautyCategoryId, BeautyServiceOption[]>;
  }, [tBeauty]);

  const translatedAddOns = useMemo(() => {
    const result: Record<string, BeautyServiceOption[]> = {};
    for (const [cat, services] of Object.entries(ADD_ONS_BY_CATEGORY)) {
      result[cat] = services.map(s => ({
        ...s,
        name: tBeauty(`services.${s.id}.name`, { defaultValue: s.name }),
        description: tBeauty(`services.${s.id}.desc`, { defaultValue: s.description })
      }));
    }
    return result as Record<BeautyCategoryId, BeautyServiceOption[]>;
  }, [tBeauty]);
  const [currentCity, setCurrentCity] = useState<CityId>('seoul');

  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [hotelLocation, setHotelLocation] = useState<{ lat: number; lng: number; name: string } | null>(destinationInfo);
  const [radius, setRadius] = useState<number>(1000);
  const [nearbyItems, setNearbyItems] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddToPlanOpen, setIsAddToPlanOpen] = useState(false);
  const [selectedItemForPlan, setSelectedItemForPlan] = useState<ServiceItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [searchTerm, setSearchTerm] = useState(globalSearchQuery);
  const [appliedSearchTerm, setAppliedSearchTerm] = useState(globalSearchQuery);
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
  const [isIntegratedBookingMenuOpen, setIsIntegratedBookingMenuOpen] = useState(false);
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
  const [selectedCountry, setSelectedCountry] = useState({ code: 'KR', dial: '+82', flag: 'https://flagcdn.com/w40/kr.png' });
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [agreements, setAgreements] = useState<AgreementState>(INITIAL_AGREEMENT_STATE);
  const [formErrors, setFormErrors] = useState<Partial<Record<FormErrorKey, string>>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmittingBeautyBooking, setIsSubmittingBeautyBooking] = useState(false);
  const [beautySubmitError, setBeautySubmitError] = useState<string | null>(null);
  const [submittedBookingPayload, setSubmittedBookingPayload] = useState<BeautyBookingPayload | null>(null);
  const [submittedBooking, setSubmittedBooking] = useState<BeautyBookingCompletionDisplay | null>(null);
  const bookingPanelRef = useRef<HTMLElement | null>(null);
  const confirmSectionRef = useRef<HTMLElement | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  function showToast(message: string) {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }

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
    setCurrentStep(1);
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

    const exists = translatedStores.some((store) => {
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
      setCurrentStep(1);
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
    () => (selectedBeautyStoreId ? translatedDesignersByStore[selectedBeautyStoreId] ?? [] : []),
    [selectedBeautyStoreId],
  );
  const availablePrimaryServices = useMemo(
    () => (currentBeautyCategory ? translatedPrimaryServices[currentBeautyCategory] ?? [] : []),
    [currentBeautyCategory],
  );
 const availableAddOnOptions = useMemo(
    () => (currentBeautyCategory ? translatedAddOns[currentBeautyCategory] ?? [] : []),
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
          ? translatedStores.find((store) => store.id === selectedBeautyStoreId)?.name ?? t('beauty_explore.label_service_default')
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
      tBeauty,
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
        customer: {
          ...customerForm,
          phone: `${selectedCountry.dial}${customerForm.phone}`
        },
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
  const filteredBeautyStores = translatedStores.filter((store) => {
    const matchesCategory = beautyCategoryFilter ? store.category === beautyCategoryFilter : true;
    const matchesRegion = selectedRegion === 'all' ? true : store.region === selectedRegion;
    return matchesCategory && matchesRegion;
  });
  const selectedBeautyStore = selectedBeautyStoreId
    ? translatedStores.find((store) => store.id === selectedBeautyStoreId) ?? null
    : null;
  const selectedBeautyCategoryLabel = selectedBeautyCategory
    ? beautyCategoryLabels[selectedBeautyCategory].label
    : t('beauty_explore.label_service_default');
  const selectedBeautyRegionLabel = selectedBeautyRegion
    ? beautyRegions.find((region) => region.id === selectedBeautyRegion)?.label ?? selectedBeautyRegion
    : t('beauty_explore.label_service_default');
  const selectedBeautyDateLabel = selectedBeautyDate
    ? bookingDateLabels[selectedBeautyDate] ?? selectedBeautyDate
    : tBeauty('label_service_default');

  const selectedDesignerLabel = selectedDesigner
    ? `${selectedDesigner.name}${selectedDesigner.surcharge > 0 ? ` (+${formatPrice(selectedDesigner.surcharge)})` : ''}`
    : tBeauty('label_designer_default', { defaultValue: '디자이너 선택 안 함' });
  const selectedPrimaryServiceLabel = selectedPrimaryService ? selectedPrimaryService.name : tBeauty('label_service_default');
  const selectedAddOnLabel = selectedAddOnOptions.length > 0
    ? selectedAddOnOptions.map((option) => option.name).join(', ')
    : tBeauty('label_addon_default', { defaultValue: '추가 옵션 없음' });
  
  const selectedCommLangLabel = commLangs.find(l => l.id === selectedCommunicationLanguage)?.label ?? selectedCommunicationLanguage;
  const selectedCommIntentLabel = commIntents.find(i => i.id === selectedCommunicationIntent)?.label ?? selectedCommunicationIntent;

  useEffect(() => {
    if (!selectedBeautyAvailability) {
      setSelectedBeautyDate(null);
      setSelectedBeautyTime(null);
      if (currentStep > 1) setCurrentStep(1);
      return;
    }

    // 날짜/시간 선택 완료 후 Step 3 단계에서도 입력 가능하도록
    // 모의 데이터 기반의 엄격한 가용 Slot 체크(일치 여부)를 완화합니다.
    if (selectedBeautyDate && selectedBeautyTime) {
      // Logic for confirming booking even if slot doesn't match exactly exists here.
      // We skip mandatory reset to null if the value exists.
    }
  }, [selectedBeautyAvailability, selectedBeautyDate, selectedBeautyTime]);

  useEffect(() => {
    // 선택 정보가 아예 없는 경우에만 닫히도록 하고, 
    // 이미 열려 있는 상태라면 정보가 일부 수정되더라도 강제로 닫지 않습니다.
    if (!selectedBeautyStoreId) {
      setCurrentStep(1);
    }
  }, [selectedBeautyStoreId]);

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

  const handleBeautyBookingContinue = () => {
    if (!selectedBeautyStore || !selectedBeautyStoreId || !selectedBeautyDate || !selectedBeautyTime) {
      return;
    }

    clearSubmittedBooking();
    setCurrentStep(3);
  };

  const handleStep3ToStep4Continue = () => {
    const nameError = validateCustomerField('name', customerForm.name);
    const phoneError = validateCustomerField('phone', customerForm.phone);
    
    if (nameError || phoneError) {
      setFormErrors(prev => ({
        ...prev,
        name: nameError,
        phone: phoneError
      }));
      showToast(t('beauty_explore.toast_check_info'));
      return;
    }

    setCurrentStep(4);
  };

  const handleApplyFilter = (filters: ActiveFilters) => {
    setActiveFilters(filters);
  };

  const handleSearchSubmit = (value?: string) => {
    const term = value ?? searchTerm;
    setAppliedSearchTerm(term);
    if (term) {
      showToast(`'${term}' 검색 결과입니다.`);
    } else {
      showToast('모든 검색 결과를 표시합니다.');
    }
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
      
      if (/[^a-zA-Z\s]/.test(trimmedValue)) {
        return 'English only, please.';
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

  const COUNTRY_CODES = [
    { code: 'KR', dial: '+82', flag: 'https://flagcdn.com/w40/kr.png', name: 'South Korea' },
    { code: 'JP', dial: '+81', flag: 'https://flagcdn.com/w40/jp.png', name: 'Japan' },
    { code: 'CN', dial: '+86', flag: 'https://flagcdn.com/w40/cn.png', name: 'China' },
    { code: 'TW', dial: '+886', flag: 'https://flagcdn.com/w40/tw.png', name: 'Taiwan' },
    { code: 'HK', dial: '+852', flag: 'https://flagcdn.com/w40/hk.png', name: 'Hong Kong' },
    { code: 'VN', dial: '+84', flag: 'https://flagcdn.com/w40/vn.png', name: 'Vietnam' },
    { code: 'TH', dial: '+66', flag: 'https://flagcdn.com/w40/th.png', name: 'Thailand' },
    { code: 'PH', dial: '+63', flag: 'https://flagcdn.com/w40/ph.png', name: 'Philippines' },
    { code: 'SG', dial: '+65', flag: 'https://flagcdn.com/w40/sg.png', name: 'Singapore' },
    { code: 'MY', dial: '+60', flag: 'https://flagcdn.com/w40/my.png', name: 'Malaysia' },
    { code: 'ID', dial: '+62', flag: 'https://flagcdn.com/w40/id.png', name: 'Indonesia' },
    { code: 'US', dial: '+1', flag: 'https://flagcdn.com/w40/us.png', name: 'United States' },
    { code: 'CA', dial: '+1', flag: 'https://flagcdn.com/w40/ca.png', name: 'Canada' },
    { code: 'GB', dial: '+44', flag: 'https://flagcdn.com/w40/gb.png', name: 'United Kingdom' },
    { code: 'FR', dial: '+33', flag: 'https://flagcdn.com/w40/fr.png', name: 'France' },
    { code: 'DE', dial: '+49', flag: 'https://flagcdn.com/w40/de.png', name: 'Germany' },
    { code: 'IT', dial: '+39', flag: 'https://flagcdn.com/w40/it.png', name: 'Italy' },
    { code: 'ES', dial: '+34', flag: 'https://flagcdn.com/w40/es.png', name: 'Spain' },
    { code: 'RU', dial: '+7', flag: 'https://flagcdn.com/w40/ru.png', name: 'Russia' },
    { code: 'AU', dial: '+61', flag: 'https://flagcdn.com/w40/au.png', name: 'Australia' },
    { code: 'BR', dial: '+55', flag: 'https://flagcdn.com/w40/br.png', name: 'Brazil' },
    { code: 'MX', dial: '+52', flag: 'https://flagcdn.com/w40/mx.png', name: 'Mexico' },
    { code: 'AE', dial: '+971', flag: 'https://flagcdn.com/w40/ae.png', name: 'United Arab Emirates' },
    { code: 'SA', dial: '+966', flag: 'https://flagcdn.com/w40/sa.png', name: 'Saudi Arabia' },
    { code: 'IN', dial: '+91', flag: 'https://flagcdn.com/w40/in.png', name: 'India' },
    { code: 'MO', dial: '+853', flag: 'https://flagcdn.com/w40/mo.png', name: 'Macau' },
    { code: 'MN', dial: '+976', flag: 'https://flagcdn.com/w40/mn.png', name: 'Mongolia' },
    { code: 'KZ', dial: '+7', flag: 'https://flagcdn.com/w40/kz.png', name: 'Kazakhstan' },
    { code: 'TR', dial: '+90', flag: 'https://flagcdn.com/w40/tr.png', name: 'Turkey' },
    { code: 'EG', dial: '+20', flag: 'https://flagcdn.com/w40/eg.png', name: 'Egypt' },
    { code: 'PT', dial: '+351', flag: 'https://flagcdn.com/w40/pt.png', name: 'Portugal' },
    { code: 'CH', dial: '+41', flag: 'https://flagcdn.com/w40/ch.png', name: 'Switzerland' },
    { code: 'NL', dial: '+31', flag: 'https://flagcdn.com/w40/nl.png', name: 'Netherlands' },
    { code: 'SE', dial: '+46', flag: 'https://flagcdn.com/w40/se.png', name: 'Sweden' },
    { code: 'PL', dial: '+48', flag: 'https://flagcdn.com/w40/pl.png', name: 'Poland' },
    { code: 'UZ', dial: '+998', flag: 'https://flagcdn.com/w40/uz.png', name: 'Uzbekistan' },
  ];

  const handleCustomerFieldChange = (field: CustomerFormFieldKey, value: string) => {
    let finalValue = value;
    
    // 이름 필드는 영문(대소문자)과 공백만 허용
    if (field === 'name') {
      finalValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    setCustomerForm((prev) => ({
      ...prev,
      [field]: finalValue,
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
    setCurrentStep(2);
    clearSubmittedBooking();
    clearFormError('primaryService');
    showToast(`${storeName}${t('beauty_explore.toast_select_time')}`);
  };

  const handleBeautyDateSelect = (dateKey: string) => {
    setSelectedBeautyDate(dateKey);
    setSelectedBeautyTime(null);
    clearSubmittedBooking();
  };

  const handleBeautyBookingSubmit = () => {
    if (isSubmittingBeautyBooking) {
      return;
    }

    if (!selectedBeautyStore || !selectedBeautyStoreName || !selectedBeautyDate || !selectedBeautyTime) {
      setCurrentStep(1);
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
            primaryServiceDefaultLabel: t('beauty_explore.label_service_default', { defaultValue: '미선택' }),
          }),
        );
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
    setCurrentStep(1);
  };


  const baseItems = hotelLocation && nearbyItems.length > 0 ? nearbyItems : MOCK_ITEMS;
  const itemsToShow = baseItems.filter((item) => {
    // 검색어가 있으면 카테고리 무시하고 전체 검색 (검색 성공률 극대화)
    if (appliedSearchTerm) {
      const lowerCaseSearchTerm = appliedSearchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.area.toLowerCase().includes(lowerCaseSearchTerm) ||
        (item.description && item.description.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }
    
    // 검색어가 없을 때는 기존 카테고리 필터 적용
    if (currentCategory !== 'all' && item.type !== currentCategory) {
      return false;
    }
    return true;
  });
  const sortedItemsToShow = [...itemsToShow].sort((a, b) => {
    const aScore = (a as ServiceItem & { is_premium?: boolean }).is_premium ? 1 : 0;
    const bScore = (b as ServiceItem & { is_premium?: boolean }).is_premium ? 1 : 0;
    return bScore - aScore;
  });




  const isCustomerNameValid = validateCustomerField('name', customerForm.name) === '';
  const isCustomerPhoneValid = validateCustomerField('phone', customerForm.phone) === '';
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
  const beautyFlowSteps = [
    t('beauty_explore.step_1'),
    t('beauty_explore.step_2'),
    '정보 입력',
    tBeauty('confirm_eyebrow', { defaultValue: '예약확인' })
  ];
  const beautyCurrentStepIndex = submittedBooking 
    ? 4 
    : currentStep - 1;

  const renderBeautyProgressIndicator = () => (
    <ol className={styles.beautyStepIndicator} aria-label="뷰티 예약 단계">
      {beautyFlowSteps.map((step, index) => {
        const isCurrent = index === beautyCurrentStepIndex;
        const isDone = index < beautyCurrentStepIndex;

        return (
          <li
            key={step}
            className={`${styles.beautyStepItem} ${isCurrent ? styles.beautyStepItemCurrent : ''} ${isDone ? styles.beautyStepItemDone : ''}`}
            aria-current={isCurrent || (index === 2 && submittedBooking) ? 'step' : undefined}
          >
            <span className={styles.beautyStepBullet}>{index + 1}</span>
            <span className={styles.beautyStepText}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
  // Unified layout logic: map is now always available
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
        }}
      >
        {isLoading && (
          <div
            className={styles.loadingState}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'rgba(0,0,0,0.5)' }}
          >
            <div className={styles.spinner}></div>
            <p>{t('common.searching')} {currentCategory}...</p>
          </div>
        )}

        {/* 상단 고정 지도 영역 */}
        <div style={{ width: '100%', height: '400px', display: 'flex', flexShrink: 0 }}>
          <ExploreMap
            items={sortedItemsToShow}
            center={hotelLocation ? { lat: hotelLocation.lat, lng: hotelLocation.lng } : { lat: 37.5665, lng: 126.978 }}
            onItemClick={handleDetails}
            radius={radius}
            zoom={finalZoom}
          />
        </div>

        {/* 하단 컨텐츠 영역: 뷰티 예약 모드와 일반 리스트 모드 통합 */}
        <div className="flex-1 overflow-y-auto bg-[var(--white)] -mt-5 rounded-t-[24px] relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          {isBeautyExplore ? (
            <div className={styles.beautyExplorePage} style={{ padding: '0' }}>
               <section className={styles.beautyHero} style={{ paddingTop: '24px' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={styles.beautyEyebrow}>STEP {currentStep} / 4</span>
                    {currentStep > 1 && !submittedBooking && (
                      <button onClick={() => setCurrentStep(prev => prev - 1)} className="text-sm font-bold text-[var(--accent)]">
                        이전 단계로
                      </button>
                    )}
                  </div>
                  <h1 className={styles.beautyTitle} style={{ fontSize: '1.25rem' }}>
                    {currentStep === 1 && (beautyCategoryFilter ? `${beautyCategoryLabel} 매장을 선택해주세요` : "관심 있는 매장을 골라보세요")}
                    {currentStep === 2 && "예약 일시를 선택해주세요"}
                    {currentStep === 3 && "상세 정보를 입력해주세요"}
                    {currentStep === 4 && "예약 내용을 확인해주세요"}
                  </h1>
                  <div className="mt-4">
                    {renderBeautyProgressIndicator()}
                  </div>
               </section>

               <div className="px-4 pb-12">
                  {submittedBooking ? (
                    <div className={styles.beautyCompletionCard}>
                      <p className={styles.beautyCompletionTitle}>{t('beauty_explore.completion_title')}</p>
                      <div className={styles.beautyCompletionMain}>
                        <p className={styles.beautyCompletionDesc}>{t('beauty_explore.completion_desc1')}</p>
                        <div className={styles.beautyCompletionHero}>
                          <div className={styles.beautyCompletionHeroBlock}>
                            <span className={styles.beautyCompletionHeroLabel}>예약 매장</span>
                            <strong className={styles.beautyCompletionHeroTitle}>{submittedBooking.storeName}</strong>
                            <span className={styles.beautyCompletionHeroMeta}>{submittedBooking.date} · {submittedBooking.time}</span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.beautyCompletionActions}>
                        <button type="button" className={styles.beautySecondaryAction} onClick={handleBookingEditReset}>
                          메인으로 돌아가기
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {currentStep === 1 && (
                        <div className="flex flex-col gap-4">
                          <div className={styles.beautyRegionChipRow}>
                            {beautyRegions.map((region) => {
                              const isActive = selectedRegion === region.id;
                              return (
                                <button
                                  key={region.id}
                                  type="button"
                                  className={`${styles.beautyRegionChip} ${isActive ? styles.beautyRegionChipActive : ''}`}
                                  onClick={() => setSelectedRegion(region.id)}
                                >
                                  {region.label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex flex-col gap-3">
                            {filteredBeautyStores.length > 0 ? (
                              filteredBeautyStores.map((store) => {
                                const isSelected = selectedBeautyStoreId === store.id;
                                return (
                                  <article
                                    key={store.id}
                                    className={`bg-[var(--surface)] rounded-[var(--radius-md)] transition-all duration-300 border ${isSelected ? 'border-[var(--primary)] ring-2 ring-[var(--primary-glow)] bg-[var(--primary-glow)]' : 'border-[var(--warm-sand)] shadow-sm'}`}
                                    style={{ overflow: 'hidden', cursor: 'pointer' }}
                                    onClick={() => {
                                      handleBeautyStoreSelect(store.id, store.name, store.region, store.category);
                                    }}
                                  >
                                    <div className="flex flex-row w-full items-center p-3 gap-3">
                                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                                        <img src={store.imageUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80'} alt={store.name} className="h-full w-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-[var(--ink-black)] truncate">{store.name}</h3>
                                        <p className="text-xs text-[var(--soft-ink)]">{tBeauty(`region_${store.region}`)}</p>
                                        <div className="text-sm font-semibold text-[var(--accent)] mt-1">{store.priceLabel}</div>
                                      </div>
                                      <div className="shrink-0 text-[var(--secondary)] font-bold text-xs uppercase bg-[var(--surface)] px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--warm-sand)]">
                                        {tBeauty('btn_select_salon', { defaultValue: '선택' })}
                                      </div>
                                    </div>
                                  </article>
                                );
                              })
                            ) : (
                              <p className="text-center py-10 text-neutral-400">검색된 매장이 없습니다.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {currentStep === 2 && (
                        <div className="flex flex-col gap-6">
                          {selectedBeautyStore && (
                            <div className="bg-[var(--surface)] border border-[var(--warm-sand)] rounded-[var(--radius-md)] p-4 shadow-sm flex items-center gap-3">
                              <div className="w-12 h-12 rounded-[var(--radius-sm)] bg-[var(--hanji-ivory)] overflow-hidden shrink-0">
                                <img src={selectedBeautyStore.imageUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">SELECTED STORE</span>
                                <h3 className="font-bold text-[var(--ink-black)]">{selectedBeautyStoreName}</h3>
                              </div>
                            </div>
                          )}
                          <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-6 border border-[var(--warm-sand)] shadow-sm">
                            <h3 className="font-bold text-lg mb-4 text-[var(--ink-black)]">날짜와 시간을 골라주세요</h3>
                            {selectedBeautyDate && selectedBeautyTime ? (
                              <div className="flex flex-col gap-4">
                                <div className="bg-[var(--hanji-ivory)] border border-[var(--warm-sand)] rounded-[var(--radius-md)] p-4">
                                  <div className="text-sm text-[var(--soft-ink)] mb-1">선택된 일시</div>
                                  <div className="text-xl font-bold text-[var(--ink-black)]">{selectedBeautyDateLabel} - {selectedBeautyTime}</div>
                                </div>
                                <button onClick={() => setIsIntegratedBookingMenuOpen(true)} className="text-[var(--accent)] font-bold underline text-sm py-2">
                                  다른 일시로 변경하기
                                </button>
                                <button onClick={() => setCurrentStep(3)} className="w-full bg-[var(--secondary)] text-white py-4 rounded-[var(--radius-md)] font-bold shadow-lg">
                                  다음: 상세 정보 입력
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setIsIntegratedBookingMenuOpen(true)} className="w-full bg-[var(--secondary)] text-white py-5 rounded-[var(--radius-md)] font-bold text-lg shadow-md">
                                날짜 및 시간 선택하기
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {currentStep === 3 && (
                        <div className="flex flex-col gap-6">
                           <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-6 border border-[var(--warm-sand)] shadow-sm flex flex-col gap-4">
                             <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider">Select Service</span>
                             <div className="flex flex-col gap-2">
                               {availablePrimaryServices.map((service) => {
                                 const isSelected = selectedPrimaryServiceId === service.id;
                                 return (
                                   <button
                                     key={service.id}
                                     type="button"
                                     className={`w-full flex justify-between items-center p-4 rounded-[var(--radius-md)] border-2 transition-all ${
                                       isSelected ? 'border-[var(--primary)] bg-[var(--primary-glow)]' : 'border-[var(--warm-sand)] bg-[var(--hanji-ivory)]'
                                     }`}
                                     onClick={() => handlePrimaryServiceSelect(service.id)}
                                   >
                                     <div className="text-left">
                                       <div className={`font-bold text-sm ${isSelected ? 'text-[#bb8a78]' : 'text-neutral-700'}`}>{service.name}</div>
                                       <div className="text-[11px] text-neutral-400">{service.description}</div>
                                     </div>
                                     <div className={`font-bold text-sm ${isSelected ? 'text-[#bb8a78]' : 'text-neutral-500'}`}>
                                       {formatPrice ? formatPrice(service.price) : `${service.price}KRW`}
                                     </div>
                                   </button>
                                 );
                               })}
                             </div>
                           </div>
                           <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex flex-col gap-4">
                             <span className="text-xs font-bold text-[#bb8a78] uppercase tracking-wider">Customer Details</span>
                             <div className="flex flex-col gap-4">
                               {customerFormFields.map((field) => (
                                 <div key={field.key} className="flex flex-col gap-1.5">
                                   <label className="text-xs font-bold text-neutral-600">{field.label}{field.required ? ' *' : ''}</label>
                                   <input
                                     className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm outline-none"
                                     type="text"
                                     value={customerForm[field.key as keyof CustomerFormState]}
                                     placeholder={field.placeholder}
                                     onChange={(e) => handleCustomerFieldChange(field.key as any, e.target.value)}
                                   />
                                 </div>
                               ))}
                             </div>
                           </div>
                           <button className="w-full bg-[var(--secondary)] text-white py-4 rounded-[var(--radius-md)] font-bold" onClick={handleStep3ToStep4Continue}>
                             다음: 예약 내용 확인
                           </button>
                        </div>
                      )}

                      {currentStep === 4 && (
                        <div className="flex flex-col gap-6">
                           <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-6 border border-[var(--warm-sand)] shadow-sm flex flex-col gap-4">
                             <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider">Booking Summary</span>
                             <div className="flex flex-col gap-3">
                               <div className="flex justify-between items-center border-b border-[var(--warm-sand)] pb-3">
                                 <span className="text-sm text-[var(--soft-ink)]">매장</span>
                                 <strong className="text-sm text-[var(--ink-black)]">{selectedBeautyStoreName}</strong>
                               </div>
                               <div className="flex justify-between items-center border-b border-[var(--warm-sand)] pb-3">
                                 <span className="text-sm text-[var(--soft-ink)]">일시</span>
                                 <strong className="text-sm text-[var(--ink-black)]">{selectedBeautyDateLabel} - {selectedBeautyTime}</strong>
                               </div>
                               <div className="flex justify-between items-center border-b border-[var(--warm-sand)] pb-3">
                                 <span className="text-sm text-[var(--soft-ink)]">서비스</span>
                                 <strong className="text-sm text-[var(--ink-black)]">{selectedPrimaryService?.name}</strong>
                               </div>
                               <div className="flex justify-between items-center border-b border-[var(--warm-sand)] pb-3">
                                 <span className="text-sm text-[var(--soft-ink)]">이름</span>
                                 <strong className="text-sm text-[var(--ink-black)]">{customerForm.name}</strong>
                               </div>
                               <div className="flex justify-between items-center">
                                 <span className="text-sm text-[var(--soft-ink)]">연락처</span>
                                 <strong className="text-sm text-[var(--ink-black)]">{customerForm.phone}</strong>
                               </div>
                             </div>
                           </div>
                           <button
                             type="button"
                             className="w-full bg-[var(--secondary)] text-white py-5 rounded-[var(--radius-md)] font-bold text-lg shadow-xl"
                             disabled={!isBeautyConfirmSubmitEnabled || isSubmittingBeautyBooking}
                             onClick={handleBeautyBookingSubmit}
                           >
                             {isSubmittingBeautyBooking ? '처리 중...' : '최종 예약 신청하기'}
                           </button>
                        </div>
                      )}
                    </>
                  )}
               </div>
            </div>
          ) : (
            <div className="px-4 py-6">
               <h2 className="text-lg font-bold mb-4">{t('explore_page.nearby_results')}</h2>
               <div className="flex flex-col gap-4">
                 {sortedItemsToShow.map((item) => (
                   <article key={item.id} className="bg-[var(--surface)] rounded-[var(--radius-md)] border border-[var(--warm-sand)] p-3 shadow-sm flex gap-3 cursor-pointer" onClick={() => handleDetails(item.id)}>
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                         {item.image_url ? (
                           <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full" style={{ backgroundColor: item.image_color || '#eee' }} />
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h3 className="font-bold text-[var(--ink-black)] truncate">{item.title}</h3>
                         <p className="text-xs text-[var(--soft-ink)]">{item.area}</p>
                         <div className="flex items-center gap-2 mt-1">
                            {item.rating && <span className="text-xs font-bold text-orange-500">★ {item.rating}</span>}
                            <span className="text-xs font-semibold text-[var(--accent)]">{item.price}</span>
                         </div>
                      </div>
                   </article>
                 ))}
               </div>
            </div>
          )}
        </div>

        <IntegratedBookingMenu 
          isOpen={isIntegratedBookingMenuOpen}
          onClose={() => setIsIntegratedBookingMenuOpen(false)}
          initialDate={selectedBeautyDate}
          initialTime={selectedBeautyTime}
          onConfirm={(date, time) => {
            setSelectedBeautyDate(date);
            setSelectedBeautyTime(time);
            setIsIntegratedBookingMenuOpen(false);
            clearSubmittedBooking();
            setCurrentStep(2);
            showToast("일시가 선택되었습니다.");
          }}
        />
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

      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}
    </div>
  );
}
