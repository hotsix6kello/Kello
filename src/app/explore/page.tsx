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
import BeautyRegionTabs from './components/BeautyRegionTabs';
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
  region: BeautyRegionId;
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

const CUSTOMER_FORM_FIELDS: (t: (key: string) => string) => CustomerFieldConfig[] = (t) => [
  {
    key: 'name',
    label: t('form_name'),
    placeholder: t('form_name_placeholder'),
    required: true,
  },
  {
    key: 'phone',
    label: t('form_phone'),
    placeholder: t('form_phone_placeholder'),
    required: true,
  },
];

const AGREEMENT_FIELDS: (t: (key: string) => string) => AgreementFieldConfig[] = (t) => [
  {
    key: 'bookingConfirmed',
    label: t('agreement_confirm'),
    description: t('agreement_confirm_desc'),
  },
  {
    key: 'privacyConsent',
    label: t('agreement_privacy'),
    description: t('agreement_privacy_desc'),
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

const COMMUNICATION_LANGUAGES: (t: (key: string) => string) => CommunicationLanguageConfig[] = (t) => [
  { id: 'ko', label: t('beauty_bookings.lang_ko'), badge: 'KO' },
  { id: 'en', label: t('beauty_bookings.lang_en'), badge: 'EN' },
  { id: 'ja', label: t('beauty_bookings.lang_ja'), badge: 'JA' },
  { id: 'zh-CN', label: t('beauty_bookings.lang_zh_cn'), badge: 'ZH' },
];

const COMMUNICATION_INTENTS: (t: (key: string, options?: any) => string) => CommunicationIntentConfig[] = (t) => [
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
    createDesigner('designer_hair_1_a', 'designers.jia', 'designers.jia_specialty', 'designers.jia_experience', 'designers.jia_desc', 15000),
    createDesigner('designer_hair_1_b', 'designers.minseo', 'designers.minseo_specialty', 'designers.minseo_experience', 'designers.minseo_desc', 25000),
  ],
  beauty_hair_2: [
    createDesigner('designer_hair_2_a', 'designers.harin', 'designers.harin_specialty', 'designers.harin_experience', 'designers.harin_desc', 12000),
    createDesigner('designer_hair_2_b', 'designers.yuna', 'designers.yuna_specialty', 'designers.yuna_experience', 'designers.yuna_desc', 18000),
  ],
  beauty_nail_1: [
    createDesigner('designer_nail_1_a', 'designers.seoyun', 'designers.seoyun_specialty', 'designers.seoyun_experience', 'designers.seoyun_desc', 10000),
    createDesigner('designer_nail_1_b', 'designers.chaerin', 'designers.chaerin_specialty', 'designers.chaerin_experience', 'designers.chaerin_desc', 15000),
  ],
  beauty_nail_2: [
    createDesigner('designer_nail_2_a', 'designers.nayeon', 'designers.nayeon_specialty', 'designers.nayeon_experience', 'designers.nayeon_desc', 12000),
    createDesigner('designer_nail_2_b', 'designers.dabin', 'designers.dabin_specialty', 'designers.dabin_experience', 'designers.dabin_desc', 8000),
  ],
  beauty_esthetic_1: [
    createDesigner('designer_esthetic_1_a', 'designers.yujin', 'designers.yujin_specialty', 'designers.yujin_experience', 'designers.yujin_desc', 10000),
    createDesigner('designer_esthetic_1_b', 'designers.sohee', 'designers.sohee_specialty', 'designers.sohee_experience', 'designers.sohee_desc', 20000),
  ],
  beauty_esthetic_2: [
    createDesigner('designer_esthetic_2_a', 'designers.gayoung', 'designers.gayoung_specialty', 'designers.gayoung_experience', 'designers.gayoung_desc', 8000),
    createDesigner('designer_esthetic_2_b', 'designers.yerin', 'designers.yerin_specialty', 'designers.yerin_experience', 'designers.yerin_desc', 12000),
  ],
  beauty_waxing_1: [
    createDesigner('designer_waxing_1_a', 'designers.doyeon', 'designers.doyeon_specialty', 'designers.doyeon_experience', 'designers.doyeon_desc', 10000),
    createDesigner('designer_waxing_1_b', 'designers.hyuna', 'designers.hyuna_specialty', 'designers.hyuna_experience', 'designers.hyuna_desc', 18000),
  ],
  beauty_waxing_2: [
    createDesigner('designer_waxing_2_a', 'designers.sia', 'designers.sia_specialty', 'designers.sia_experience', 'designers.sia_desc', 6000),
    createDesigner('designer_waxing_2_b', 'designers.juhee', 'designers.juhee_specialty', 'designers.juhee_experience', 'designers.juhee_desc', 12000),
  ],
  beauty_makeup_1: [
    createDesigner('designer_makeup_1_a', 'designers.bora', 'designers.bora_specialty', 'designers.bora_experience', 'designers.bora_desc', 18000),
    createDesigner('designer_makeup_1_b', 'designers.sua', 'designers.sua_specialty', 'designers.sua_experience', 'designers.sua_desc', 25000),
  ],
  beauty_makeup_2: [
    createDesigner('designer_makeup_2_a', 'designers.jimin', 'designers.jimin_specialty', 'designers.jimin_experience', 'designers.jimin_desc', 12000),
    createDesigner('designer_makeup_2_b', 'designers.hyewon', 'designers.hyewon_specialty', 'designers.hyewon_experience', 'designers.hyewon_desc', 30000),
  ],
  beauty_lash_1: [
    createDesigner('designer_lash_1_a', 'designers.sojung', 'designers.sojung_specialty', 'designers.sojung_experience', 'designers.sojung_desc', 10000),
    createDesigner('designer_lash_1_b', 'designers.seah', 'designers.seah_specialty', 'designers.seah_experience', 'designers.seah_desc', 15000),
  ],
  beauty_lash_2: [
    createDesigner('designer_lash_2_a', 'designers.daeun', 'designers.daeun_specialty', 'designers.daeun_experience', 'designers.daeun_desc', 8000),
    createDesigner('designer_lash_2_b', 'designers.sieun', 'designers.sieun_specialty', 'designers.sieun_experience', 'designers.sieun_desc', 15000),
  ],
};

const PRIMARY_SERVICES_BY_CATEGORY: Record<BeautyCategoryId, BeautyServiceOption[]> = {
  hair: [
    createServiceOption('hair_women_cut', 'services.women_cut', 'services.women_cut_desc', 55000),
    createServiceOption('hair_men_cut', 'services.men_cut', 'services.men_cut_desc', 38000),
    createServiceOption('hair_root_color', 'services.root_color', 'services.root_color_desc', 89000),
    createServiceOption('hair_clinic', 'services.hair_clinic', 'services.hair_clinic_desc', 99000),
  ],
  nail: [
    createServiceOption('nail_gel', 'services.nail_gel', 'services.nail_gel_desc', 79000),
    createServiceOption('nail_care', 'services.nail_care', 'services.nail_care_desc', 45000),
    createServiceOption('nail_pedi', 'services.nail_pedi', 'services.nail_pedi_desc', 89000),
  ],
  esthetic: [
    createServiceOption('esthetic_calming', 'services.esthetic_calming', 'services.esthetic_calming_desc', 88000),
    createServiceOption('esthetic_moisture', 'services.esthetic_moisture', 'services.esthetic_moisture_desc', 95000),
    createServiceOption('esthetic_lifting', 'services.esthetic_lifting', 'services.esthetic_lifting_desc', 118000),
  ],
  waxing: [
    createServiceOption('waxing_brazilian', 'services.waxing_brazilian', 'services.waxing_brazilian_desc', 99000),
    createServiceOption('waxing_arm', 'services.waxing_arm', 'services.waxing_arm_desc', 55000),
    createServiceOption('waxing_leg', 'services.waxing_leg', 'services.waxing_leg_desc', 69000),
  ],
  makeup: [
    createServiceOption('makeup_daily', 'services.makeup_daily', 'services.makeup_daily_desc', 85000),
    createServiceOption('makeup_interview', 'services.makeup_interview', 'services.makeup_interview_desc', 99000),
    createServiceOption('makeup_guest', 'services.makeup_guest', 'services.makeup_guest_desc', 132000),
  ],
  lash: [
    createServiceOption('lash_perm', 'services.lash_perm', 'services.lash_perm_desc', 69000),
    createServiceOption('lash_extension', 'services.lash_extension', 'services.lash_extension_desc', 99000),
    createServiceOption('lash_retouch', 'services.lash_retouch', 'services.lash_retouch_desc', 59000),
  ],
};

const ADD_ONS_BY_CATEGORY: Record<BeautyCategoryId, BeautyServiceOption[]> = {
  hair: [
    createServiceOption('hair_add_scalp', 'services.hair_add_scalp', 'services.hair_add_scalp_desc', 25000),
    createServiceOption('hair_add_blowdry', 'services.hair_add_blowdry', 'services.hair_add_blowdry_desc', 18000),
    createServiceOption('hair_add_ampoule', 'services.hair_add_ampoule', 'services.hair_add_ampoule_desc', 30000),
  ],
  nail: [
    createServiceOption('nail_add_removal', 'services.nail_add_removal', 'services.nail_add_removal_desc', 15000),
    createServiceOption('nail_add_art', 'services.nail_add_art', 'services.nail_add_art_desc', 22000),
    createServiceOption('nail_add_strength', 'services.nail_add_strength', 'services.nail_add_strength_desc', 12000),
  ],
  esthetic: [
    createServiceOption('esthetic_add_modeling', 'services.esthetic_add_modeling', 'services.esthetic_add_modeling_desc', 20000),
    createServiceOption('esthetic_add_neck', 'services.esthetic_add_neck', 'services.esthetic_add_neck_desc', 18000),
    createServiceOption('esthetic_add_led', 'services.esthetic_add_led', 'services.esthetic_add_led_desc', 25000),
  ],
  waxing: [
    createServiceOption('waxing_add_care', 'services.waxing_add_care', 'services.waxing_add_care_desc', 15000),
    createServiceOption('waxing_add_pack', 'services.waxing_add_pack', 'services.waxing_add_pack_desc', 12000),
    createServiceOption('waxing_add_trim', 'services.waxing_add_trim', 'services.waxing_add_trim_desc', 10000),
  ],
  makeup: [
    createServiceOption('makeup_add_hair', 'services.makeup_add_hair', 'services.makeup_add_hair_desc', 25000),
    createServiceOption('makeup_add_lash', 'services.makeup_add_lash', 'services.makeup_add_lash_desc', 18000),
    createServiceOption('makeup_add_touchup', 'services.makeup_add_touchup', 'services.makeup_add_touchup_desc', 15000),
  ],
  lash: [
    createServiceOption('lash_add_remove', 'services.lash_add_remove', 'services.lash_add_remove_desc', 15000),
    createServiceOption('lash_add_tinting', 'services.lash_add_tinting', 'services.lash_add_tinting_desc', 12000),
    createServiceOption('lash_add_coating', 'services.lash_add_coating', 'services.lash_add_coating_desc', 10000),
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

const BEAUTY_CATEGORY_META: (t: (key: string) => string) => Record<
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

const BEAUTY_REGIONS: (t: any, tBeauty: any) => Array<{ id: BeautyRegionId; label: string }> = (t, tBeauty) => [
  { id: 'all', label: tBeauty('region_all') },
  { id: 'gangnam', label: t('transport.stations.gangnam') },
  { id: 'hongdae', label: t('transport.stations.hongdae') || '홍대' },
  { id: 'seongsu', label: t('transport.stations.seongsu') },
  { id: 'jamsil', label: t('transport.stations.jamsil') || '잠실' },
  { id: 'konkuk', label: t('transport.stations.konkuk') || '건대' },
  { id: 'pangyo', label: t('transport.stations.pangyo') || '판교' },
];

const BEAUTY_STORE_ITEMS: BeautyStore[] = [
  {
    id: 'beauty_hair_1',
    name: 'stores.beauty_hair_1.name',
    category: 'hair',
    region: 'gangnam',
    rating: 4.9,
    reviewCount: 218,
    priceLabel: 'stores.beauty_hair_1.priceLabel',
    shortDescription: 'stores.beauty_hair_1.shortDescription',
    tags: ['stores.beauty_hair_1.tags.0', 'stores.beauty_hair_1.tags.1', 'stores.beauty_hair_1.tags.2'],
  },
  {
    id: 'beauty_hair_2',
    name: 'stores.beauty_hair_2.name',
    category: 'hair',
    region: 'seongsu',
    rating: 4.8,
    reviewCount: 164,
    priceLabel: 'stores.beauty_hair_2.priceLabel',
    shortDescription: 'stores.beauty_hair_2.shortDescription',
    tags: ['stores.beauty_hair_2.tags.0', 'stores.beauty_hair_2.tags.1', 'stores.beauty_hair_2.tags.2'],
  },
  {
    id: 'beauty_nail_1',
    name: 'stores.beauty_nail_1.name',
    category: 'nail',
    region: 'hongdae',
    rating: 4.8,
    reviewCount: 137,
    priceLabel: 'stores.beauty_nail_1.priceLabel',
    shortDescription: 'stores.beauty_nail_1.shortDescription',
    tags: ['stores.beauty_nail_1.tags.0', 'stores.beauty_nail_1.tags.1', 'stores.beauty_nail_1.tags.2'],
  },
  {
    id: 'beauty_nail_2',
    name: 'stores.beauty_nail_2.name',
    category: 'nail',
    region: 'jongno',
    rating: 4.7,
    reviewCount: 102,
    priceLabel: 'stores.beauty_nail_2.priceLabel',
    shortDescription: 'stores.beauty_nail_2.shortDescription',
    tags: ['stores.beauty_nail_2.tags.0', 'stores.beauty_nail_2.tags.1', 'stores.beauty_nail_2.tags.2'],
  },
  {
    id: 'beauty_esthetic_1',
    name: 'stores.beauty_esthetic_1.name',
    category: 'esthetic',
    region: 'gangnam',
    rating: 4.9,
    reviewCount: 189,
    priceLabel: 'stores.beauty_esthetic_1.priceLabel',
    shortDescription: 'stores.beauty_esthetic_1.shortDescription',
    tags: ['stores.beauty_esthetic_1.tags.0', 'stores.beauty_esthetic_1.tags.1', 'stores.beauty_esthetic_1.tags.2'],
  },
  {
    id: 'beauty_esthetic_2',
    name: 'stores.beauty_esthetic_2.name',
    category: 'esthetic',
    region: 'seongsu',
    rating: 4.7,
    reviewCount: 121,
    priceLabel: 'stores.beauty_esthetic_2.priceLabel',
    shortDescription: 'stores.beauty_esthetic_2.shortDescription',
    tags: ['stores.beauty_esthetic_2.tags.0', 'stores.beauty_esthetic_2.tags.1', 'stores.beauty_esthetic_2.tags.2'],
  },
  {
    id: 'beauty_waxing_1',
    name: 'stores.beauty_waxing_1.name',
    category: 'waxing',
    region: 'gangnam',
    rating: 4.8,
    reviewCount: 143,
    priceLabel: 'stores.beauty_waxing_1.priceLabel',
    shortDescription: 'stores.beauty_waxing_1.shortDescription',
    tags: ['stores.beauty_waxing_1.tags.0', 'stores.beauty_waxing_1.tags.1', 'stores.beauty_waxing_1.tags.2'],
  },
  {
    id: 'beauty_waxing_2',
    name: 'stores.beauty_waxing_2.name',
    category: 'waxing',
    region: 'hongdae',
    rating: 4.6,
    reviewCount: 96,
    priceLabel: 'stores.beauty_waxing_2.priceLabel',
    shortDescription: 'stores.beauty_waxing_2.shortDescription',
    tags: ['stores.beauty_waxing_2.tags.0', 'stores.beauty_waxing_2.tags.1', 'stores.beauty_waxing_2.tags.2'],
  },
  {
    id: 'beauty_makeup_1',
    name: 'stores.beauty_makeup_1.name',
    category: 'makeup',
    region: 'seongsu',
    rating: 4.9,
    reviewCount: 176,
    priceLabel: 'stores.beauty_makeup_1.priceLabel',
    shortDescription: 'stores.beauty_makeup_1.shortDescription',
    tags: ['stores.beauty_makeup_1.tags.0', 'stores.beauty_makeup_1.tags.1', 'stores.beauty_makeup_1.tags.2'],
  },
  {
    id: 'beauty_makeup_2',
    name: 'stores.beauty_makeup_2.name',
    category: 'makeup',
    region: 'jongno',
    rating: 4.8,
    reviewCount: 132,
    priceLabel: 'stores.beauty_makeup_2.priceLabel',
    shortDescription: 'stores.beauty_makeup_2.shortDescription',
    tags: ['stores.beauty_makeup_2.tags.0', 'stores.beauty_makeup_2.tags.1', 'stores.beauty_makeup_2.tags.2'],
  },
  {
    id: 'beauty_lash_1',
    name: 'stores.beauty_lash_1.name',
    category: 'lash',
    region: 'gangnam',
    rating: 4.9,
    reviewCount: 204,
    priceLabel: 'stores.beauty_lash_1.priceLabel',
    shortDescription: 'stores.beauty_lash_1.shortDescription',
    tags: ['stores.beauty_lash_1.tags.0', 'stores.beauty_lash_1.tags.1', 'stores.beauty_lash_1.tags.2'],
  },
  {
    id: 'beauty_lash_2',
    name: 'stores.beauty_lash_2.name',
    category: 'lash',
    region: 'seongsu',
    rating: 4.7,
    reviewCount: 114,
    priceLabel: 'stores.beauty_lash_2.priceLabel',
    shortDescription: 'stores.beauty_lash_2.shortDescription',
    tags: ['stores.beauty_lash_2.tags.0', 'stores.beauty_lash_2.tags.1', 'stores.beauty_lash_2.tags.2'],
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

function createBookingDateOptions(t: any, tBeauty: any, count = 6): BeautyDateOption[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);

    const locale = t('common.locale') === 'ko-KR' ? 'ko-KR' : 'en-US';

    return {
      key: toLocalDateKey(date),
      shortLabel: index === 0 ? tBeauty('label_today') : index === 1 ? tBeauty('label_tomorrow') : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
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
  const { t: tBeauty } = useTranslation('beauty_explore');

  function formatPrice(value: number): string {
    const formatted = new Intl.NumberFormat(i18n.language === 'ko' ? 'ko-KR' : 'en-US').format(value);
    const unit = tBeauty('label_booking_unit');
    return i18n.language === 'ko' ? `${formatted}${unit}` : `${unit} ${formatted}`;
  }
  const { 
    addItineraryItem, 
    selectedCategory: globalCategory, 
    searchQuery: globalSearchQuery,
    destinationInfo,
  } = useTrip();
  const categoryParam = searchParams.get('category');
  const beautyCategoryParam = searchParams.get('beautyCategory');
  const isBeautyExplore = categoryParam === 'beauty';
  const beautyCategoryFilter = isBeautyCategoryId(beautyCategoryParam)
    ? beautyCategoryParam
    : isBeautyCategoryId(globalCategory)
    ? globalCategory
    : null;

  const bookingDateOptions = useMemo(() => createBookingDateOptions(t, tBeauty), [t, tBeauty]);
  const bookingDateLabels = useMemo(() =>
    bookingDateOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.key] = option.label;
      return acc;
    }, {}),
    [bookingDateOptions]
  );

  const customerFormFields = useMemo(() => CUSTOMER_FORM_FIELDS(tBeauty), [tBeauty]);
  const agreementFields = useMemo(() => AGREEMENT_FIELDS(tBeauty), [tBeauty]);
  const beautyRegions = useMemo(() => BEAUTY_REGIONS(t, tBeauty), [t, tBeauty]);
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
  const [searchTerm, setSearchTerm] = useState(globalSearchQuery);
  const [appliedSearchTerm, setAppliedSearchTerm] = useState(globalSearchQuery);
  const [selectedRegion, setSelectedRegion] = useState<BeautyRegionId>('all');
  const [selectedBeautyStoreId, setSelectedBeautyStoreId] = useState<string | null>(null);
  const [isIntegratedBookingMenuOpen, setIsIntegratedBookingMenuOpen] = useState(false);
  const [selectedBeautyStoreName, setSelectedBeautyStoreName] = useState<string | null>(null);
  const [selectedBeautyRegion, setSelectedBeautyRegion] = useState<BeautyRegionId | null>(null);
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
    
    const slotsByDate: Record<string, string[]> = {};
    
    if (!availabilityByIndex) {
      // Fallback: Provide a default schedule if no mock data exists for this store ID
      bookingDateOptions.forEach((option) => {
        slotsByDate[option.key] = SLOT_TEMPLATE_SET[0];
      });
    } else {
      bookingDateOptions.forEach((option, index) => {
        if (availabilityByIndex[index]) {
          slotsByDate[option.key] = availabilityByIndex[index];
        }
      });
    }

    if (Object.keys(slotsByDate).length === 0) {
      return null;
    }

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
    // 다국어 기본 설정(사용자 언어 기반)
    const langPrefix = i18n.language?.split('-')[0] || 'en';
    if (['ko', 'en', 'ja', 'zh'].includes(langPrefix)) {
      setSelectedCommunicationLanguage(langPrefix === 'zh' ? 'zh-CN' : (langPrefix as CommunicationLanguageId));
    }

    // 로그인된 사용자 정보 자동 입력
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCustomerForm((prev) => ({
            ...prev,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || prev.name,
            phone: user.phone || user.user_metadata?.phone || prev.phone,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    void fetchUser();
  }, [i18n.language]);

  useEffect(() => {
    if (!isBeautyExplore) {
      return;
    }

    // 카테고리가 처음 변경될 때만 모든 상태를 초기화
    // 이미 선택된 매장이 있는 경우 초기화하지 않도록 하여 리렌더링 시 선택값이 소실되는 것을 방지
    if (!selectedBeautyStoreId) {
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
    }
    setFormErrors((prev) => {
      if (!prev.primaryService) {
        return prev;
      }

      const next = { ...prev };
      delete next.primaryService;
      return next;
    });
  }, [isBeautyExplore, beautyCategoryFilter, selectedBeautyStoreId]);

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
  }, [currentCategory, currentCity, hotelLocation, isBeautyExplore, radius]);

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
      // setSelectedBeautyDate(null); // 리렌더링 시 데이터 소실 방지 위해 주석 처리
      // setSelectedBeautyTime(null); // 리렌더링 시 데이터 소실 방지 위해 주석 처리
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
        : (beautyCategoryFilter ? beautyCategoryLabels[beautyCategoryFilter].label : tBeauty('hero_title')),
      storeName:
        selectedBeautyStoreName ??
        (selectedBeautyStoreId
          ? BEAUTY_STORE_ITEMS.find((store) => store.id === selectedBeautyStoreId)?.name ?? tBeauty('label_service_default')
          : tBeauty('label_service_default')),
      dateLabel: selectedBeautyDate ? bookingDateLabels[selectedBeautyDate] ?? selectedBeautyDate : tBeauty('label_service_default'),
      timeLabel: selectedBeautyTime ?? tBeauty('label_service_default'),
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
    // [항구적 조치]:
    // IntegratedBookingMenu 모달에서 동적으로 고른 '2026-03-25' 포맷과 '13:30' 등의 시간 값을
    // 과거 모의 데이터(date_0, date_1)와 비교하며 매핑 실패를 이유로 강제 null 리셋하던 옛날 검증 로직 전부 제거.
    // 더 이상 달력 선택 값을 파괴하지 않습니다.
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
        return tBeauty('form_name_placeholder');
      }

      return '';
    }

    if (field === 'phone') {
      const compactValue = trimmedValue.replace(/\s+/g, '');

      if (!compactValue) {
        return tBeauty('form_phone_placeholder');
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

    // Primary service is now optional (시술 필수 체크 제외됨)

    if (nameError) {
      nextErrors.name = nameError;
    }

    if (phoneError) {
      nextErrors.phone = phoneError;
    }

    if (!agreements.bookingConfirmed) {
      nextErrors.bookingConfirmed = tBeauty('toast_check_info');
    }

    if (!agreements.privacyConsent) {
      nextErrors.privacyConsent = tBeauty('agreement_privacy_desc');
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
        showToast(tBeauty('toast_addon_limit'));
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
    showToast(tBeauty('toast_copy_hint', { label }));
  };

  const handleBeautyStoreSelect = (
    storeId: string,
    storeName: string,
    storeRegion: BeautyRegionId,
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
    showToast(`${storeName}${tBeauty('toast_select_time')}`);
    scrollToBookingPanel();
  };

  const handleBeautyDateSelect = (dateKey: string | null) => {
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
      const msg = tBeauty('toast_check_info');
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
            designerDefaultLabel: tBeauty('label_designer_default'),
          }),
        );

        // 예약 요청 성공 시, 일정(My Page / Itinerary)에 해당 날짜 기준으로 항목 등록
        addItineraryItem({
          id: result.bookingId,
          sourceItemId: result.payload.storeId,
          name: `[${t('common.categories.beauty')}] ${result.payload.storeName}`,
          time: `${result.payload.bookingDate} ${result.payload.bookingTime}`,
          status: 'submitted',
          lat: destinationInfo?.lat ?? 37.521,
          lng: destinationInfo?.lng ?? 127.025,
          type: 'beauty',
          image_color: '#B28070',
          badges: [result.payload.beautyCategory, 'beauty'],
        });

        setIsBookingConfirmOpen(true);
        scrollToConfirmSection();
      })
      .catch((error) => {
        const nextMessage =
          error instanceof Error && error.message
            ? error.message
            : tBeauty('toast_submit_error');

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
    : tBeauty('label_service_default');
  const selectedBeautyRegionLabel = selectedBeautyRegion
    ? beautyRegions.find((region: any) => region.id === selectedBeautyRegion)?.label ?? tBeauty('region_all')
    : tBeauty('label_service_default');
  const selectedBeautyDateLabel = selectedBeautyDate
    ? bookingDateLabels[selectedBeautyDate] ?? selectedBeautyDate
    : tBeauty('label_service_default');
  const selectedDesignerLabel = selectedDesigner
    ? `${tBeauty(selectedDesigner.name)}${selectedDesigner.surcharge > 0 ? ` (+${formatPrice(selectedDesigner.surcharge)})` : ''}`
    : tBeauty('label_designer_default');
  const selectedPrimaryServiceLabel = selectedPrimaryService ? tBeauty(selectedPrimaryService.name) : tBeauty('label_service_default');
  const selectedAddOnLabel = selectedAddOnOptions.length > 0
    ? selectedAddOnOptions.map((option) => tBeauty(option.name)).join(', ')
    : tBeauty('label_addon_default');
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
    ? [t('beauty_explore.hero_flow_step_region'), t('beauty_explore.hero_flow_step_store'), t('beauty_explore.hero_flow_step_time')]
    : [t('beauty_explore.hero_flow_step_category'), t('beauty_explore.hero_flow_step_region'), t('beauty_explore.hero_flow_step_store')];
  const isBeautyConfirmSubmitEnabled =
    Boolean(selectedBeautyStore && selectedBeautyDate && selectedBeautyTime) &&
    isCustomerNameValid &&
    isCustomerPhoneValid &&
    agreements.bookingConfirmed &&
    agreements.privacyConsent;
  const renderBeautyProgressIndicator = () => (
    <ol className={styles.beautyStepIndicator} aria-label={t('beauty_explore.step_indicator_label')}>
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
      <>
        <div className={styles.beautyExplorePage}>
          <div className="relative w-full">
            {/* 뒤로 가기 (돌아가기) 버튼 */}
            {beautyCategoryFilter && (
              <button
                type="button"
                onClick={() => {
                  router.back(); 
                }}
                className="absolute left-4 top-2 z-[50] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-50"
                aria-label={t('common.back', { defaultValue: 'Back' })}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth={2.5} 
                  stroke="currentColor" 
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            <section className={styles.beautyHero}>
              <span className={styles.beautyEyebrow}>{tBeauty('hero_eyebrow', { defaultValue: 'Beauty Booking' })}</span>
              <div className={styles.beautyHeaderRow}>
                <div>
                  <h1 className={styles.beautyTitle}>{t('beauty_explore.hero_title_with_category', { category: selectedBeautyCategoryLabel })}</h1>
                  <p className={styles.beautySubtitle}>
                    {t('beauty_explore.hero_subtitle_desc')}
                  </p>
                </div>
                <div className={styles.beautyCategoryBadgeWrap}>
                  <span className={styles.beautyCategoryBadgeCode}>{selectedBeautyCategory ? beautyCategoryLabels[selectedBeautyCategory].badge : 'B'}</span>
                  <span className={styles.beautyCategoryBadgeLabel}>
                    {selectedBeautyCategory ? beautyCategoryLabels[selectedBeautyCategory].label : tBeauty('label_beauty')}
                  </span>
                </div>
              </div>
              <p className={styles.beautyDescription}>{selectedBeautyCategory ? beautyCategoryLabels[selectedBeautyCategory].description : ''}</p>
              <div className={styles.beautyHeroFlow} aria-label={t('beauty_explore.hero_flow_aria_label')}>
                {beautyHeroFlow.map((step, index) => (
                  <div key={step} className={styles.beautyHeroFlowItem}>
                    <span className={styles.beautyHeroFlowNumber}>{index + 1}</span>
                    <span className={styles.beautyHeroFlowText}>{step}</span>
                  </div>
                ))}
              </div>
              {!beautyCategoryFilter ? (
                <div className={styles.beautyGuideCard}>
                  {t('beauty_explore.hero_guide_no_category')}
                </div>
              ) : null}
            </section>
          </div>

          <section className={styles.beautyFiltersSection}>
            <div className={styles.beautySectionHeader}>
              <div>
                <span className={styles.beautySectionEyebrow}>{tBeauty('filter_region_eyebrow', { defaultValue: 'Region Filter' })}</span>
                <h2 className={styles.beautySectionTitle}>{t('beauty_explore.region_filter_title')}</h2>
              </div>
              <span className={styles.beautyStoreCount}>{filteredBeautyStores.length}{tBeauty('filter_store_count_suffix', { defaultValue: '개 매장' })}</span>
            </div>

            <BeautyRegionTabs
              items={beautyRegions}
              selectedRegion={selectedRegion}
              onSelect={(id: string) => setSelectedRegion(id as BeautyRegionId)}
            />
          </section>

          <section className={styles.beautyStoreSection}>
            {filteredBeautyStores.length > 0 ? (
              <div className="flex w-full flex-col gap-3 pb-8 pt-4">
                {filteredBeautyStores.map((store) => (
                  <div
                      key={store.id}
                      className={`flex flex-row w-full items-center gap-3 overflow-hidden rounded-xl border ${
                        selectedBeautyStoreId === store.id ? 'border-[#bb8a78] ring-1 ring-[#bb8a78] bg-[#fbf6f4]' : 'border-neutral-200 bg-white'
                      } p-2.5 shadow-sm transition-all hover:border-[#bb8a78] hover:shadow-md cursor-pointer`}
                      onClick={() => {
                        handleBeautyStoreSelect(
                          store.id,
                          store.name,
                          store.region,
                          store.category
                        );
                      }}
                    >
                      <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        <img
                          src={(store as any).imageUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80'}
                          alt={store.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex flex-1 flex-col min-w-0 py-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                            {tBeauty(`stores.${store.id}.name`, { defaultValue: store.name })}
                          </h3>
                          <div className="flex items-center gap-0.5 text-[11px] font-bold text-neutral-800 shrink-0">
                            <span className="text-yellow-400 text-[12px]">⭐</span>
                            <span>{store.rating ? store.rating.toFixed(1) : '4.8'}</span>
                            <span className="font-medium text-gray-400">({store.reviewCount || 120})</span>
                          </div>
                        </div>

                        <p className="mt-0.5 text-[11px] font-medium text-gray-500 truncate leading-tight">
                          {tBeauty(`region_${store.region}`)}
                        </p>

                        <p className="mt-1 text-[11px] sm:text-[12px] font-semibold text-neutral-800 leading-tight line-clamp-2">
                          {tBeauty(store.priceLabel, { defaultValue: store.priceLabel })}
                        </p>
                      </div>

                      <div className="flex flex-col items-center justify-center shrink-0 w-[52px] sm:w-[60px] gap-1.5">
                        <button
                          type="button"
                          className="w-full rounded bg-[#bb8a78] py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#a67969] text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBeautyStoreSelect(
                              store.id,
                              tBeauty(store.name, { defaultValue: store.name }),
                              store.region,
                              store.category
                            );
                            setIsIntegratedBookingMenuOpen(true);
                          }}
                        >
                          {selectedBeautyStoreId === store.id ? tBeauty('btn_change', { defaultValue: '날짜/시간 변경' }) : tBeauty('btn_select_time', { defaultValue: '예약' })}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className={styles.beautyEmptyState}>
                <p className={styles.beautyEmptyTitle}>{tBeauty('empty_store_title')}</p>
                <p className={styles.beautyEmptyText}>{tBeauty('empty_store_desc')}</p>
              </div>
            )}
          </section>

          <section ref={bookingPanelRef} className={styles.beautyBookingPanel}>
            <div className={styles.beautyBookingHeader}>
              <div>
                <h2 className={styles.beautyBookingTitle}>{tBeauty('booking_panel_title')}</h2>
                <p className={styles.beautyBookingDescription}>
                  {tBeauty('booking_panel_desc')}
                </p>
              </div>
            </div>

            {!selectedBeautyStoreId || !selectedBeautyStore ? (
              <div className={styles.beautyBookingEmpty}>
                <p className={styles.beautyBookingEmptyTitle}>{tBeauty('booking_empty_title')}</p>
                <p className={styles.beautyBookingEmptyText}>
                  {tBeauty('booking_empty_desc')}
                </p>
              </div>
            ) : !selectedBeautyAvailability ? (
              <div className={styles.beautyBookingEmpty}>
                <p className={styles.beautyBookingEmptyTitle}>{tBeauty('booking_not_found_title')}</p>
                <p className={styles.beautyBookingEmptyText}>
                  {tBeauty('booking_not_found_desc')}
                </p>
              </div>
            ) : (
              <div className={styles.beautyBookingLayout}>
                <div className={styles.beautyBookingBlock}>
                  {selectedBeautyDate && selectedBeautyTime ? (
                    <div className="flex flex-col bg-[#fbf6f4] border border-[#bb8a78]/30 rounded-2xl p-5 gap-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#bb8a78] text-lg">{tBeauty('label_selected_datetime', { defaultValue: '선택된 날짜 및 시간' })}</span>
                        <button 
                          onClick={() => setIsIntegratedBookingMenuOpen(true)}
                          className="text-sm font-semibold text-[#bb8a78] underline px-2 py-1"
                        >
                          {tBeauty('btn_change', { defaultValue: '변경하기' })}
                        </button>
                      </div>
                      <div className="text-neutral-900 font-bold text-xl">{selectedBeautyDateLabel} - {selectedBeautyTime}</div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsIntegratedBookingMenuOpen(true)}
                      className="w-full bg-[#bb8a78] text-white py-5 px-6 rounded-2xl font-bold text-xl shadow-lg transition-transform active:scale-95 whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                      {tBeauty('btn_choose_datetime', { defaultValue: '예약할 날짜 및 시간 고르기' })}
                    </button>
                  )}
                </div>

                <div className={styles.beautyBookingSummary}>
                  <div className={styles.beautySummaryList}>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>{tBeauty('summary_category')}</span>
                      <strong className={styles.beautySummaryValue}>{selectedBeautyCategoryLabel}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>{tBeauty('summary_store')}</span>
                      <strong className={styles.beautySummaryValue}>{selectedBeautyStoreName ?? tBeauty('label_service_default')}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>{tBeauty('summary_region')}</span>
                      <strong className={styles.beautySummaryValue}>{selectedBeautyRegionLabel}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>{tBeauty('summary_date')}</span>
                      <strong className={styles.beautySummaryValue}>{selectedBeautyDateLabel}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>{tBeauty('summary_time')}</span>
                      <strong className={styles.beautySummaryValue}>{selectedBeautyTime ?? tBeauty('label_service_default')}</strong>
                    </div>
                  </div>
                  <p className={styles.beautyBookingHint}>
                    {tBeauty('summary_hint')}
                  </p>
                  <button
                    type="button"
                    className={styles.beautyBookingCta}
                    disabled={!selectedBeautyDate || !selectedBeautyTime}
                    aria-label={tBeauty('summary_btn')}
                    onClick={handleBeautyBookingContinue}
                  >
                    {tBeauty('summary_btn')}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section ref={confirmSectionRef} className={styles.beautyConfirmPanel}>
            <div className={styles.beautyConfirmHeader}>
              <div>
                <h2 className={styles.beautyConfirmTitle}>{tBeauty('confirm_title')}</h2>
                <p className={styles.beautyConfirmDescription}>
                  {tBeauty('confirm_desc')}
                </p>
              </div>
            </div>

            {submittedBooking ? (
              <div
                className={styles.beautyCompletionCard}
                data-booking-flow={submittedBookingPayload?.createdFrom.flow ?? undefined}
              >
                <p className={styles.beautyCompletionTitle}>{tBeauty('completion_title')}</p>
                <div className={styles.beautyCompletionMain}>
                  <p className={styles.beautyCompletionDesc}>
                    {tBeauty('completion_desc1')}
                  </p>
                  <p className={styles.beautyCompletionSmall}>
                    • {tBeauty('completion_desc2')}
                  </p>
                  <div className={styles.beautyCompletionNote}>
                    <p>
                      {selectedCommLangLabel} | {selectedCommIntentLabel}
                    </p>
                    <p>{tBeauty('completion_desc3')}</p>
                  </div>
                </div>
                <div className={styles.beautyCompletionHero}>
                  <div className={styles.beautyCompletionHeroBlock}>
                    <span className={styles.beautyCompletionHeroLabel}>{tBeauty('completion_store_label', { defaultValue: '예약 매장' })}</span>
                    <strong className={styles.beautyCompletionHeroTitle}>{submittedBooking.storeName}</strong>
                    <span className={styles.beautyCompletionHeroMeta}>
                      {submittedBooking.date} · {submittedBooking.time}
                    </span>
                  </div>
                  <div className={styles.beautyCompletionPriceBox}>
                    <span className={styles.beautyCompletionHeroLabel}>{tBeauty('completion_total_label', { defaultValue: '예상 총 금액' })}</span>
                    <strong className={styles.beautyCompletionPrice}>{formatPrice(submittedBooking.estimatedTotal)}</strong>
                  </div>
                </div>
                <div className={styles.beautyCompletionGrid}>
                  <div className={styles.beautyCompletionSection}>
                    <h4 className={styles.beautyCompletionSectionTitle}>{tBeauty('completion_booking_info_title', { defaultValue: '예약 정보' })}</h4>
                    <div className={styles.beautySummaryList}>
                      <div className={styles.beautySummaryItem}>
                        <span className={styles.beautySummaryLabel}>{tBeauty('summary_category')}</span>
                        <strong className={styles.beautySummaryValue}>{submittedBooking.category}</strong>
                      </div>
                      <div className={styles.beautySummaryItem}>
                        <span className={styles.beautySummaryLabel}>{tBeauty('summary_region')}</span>
                        <strong className={styles.beautySummaryValue}>{submittedBooking.region}</strong>
                      </div>
                      <div className={styles.beautySummaryItem}>
                        <span className={styles.beautySummaryLabel}>{tBeauty('completion_designer_label', { defaultValue: '디자이너' })}</span>
                        <strong className={styles.beautySummaryValue}>{submittedBooking.designerName}</strong>
                      </div>
                      <div className={styles.beautySummaryItem}>
                        <span className={styles.beautySummaryLabel}>{tBeauty('completion_primary_service_label', { defaultValue: '대표 시술' })}</span>
                        <strong className={styles.beautySummaryValue}>{submittedBooking.primaryServiceName}</strong>
                      </div>
                      <div className={styles.beautySummaryItem}>
                        <span className={styles.beautySummaryLabel}>{tBeauty('completion_addon_label', { defaultValue: '부가 옵션' })}</span>
                        <strong className={styles.beautySummaryValue}>
                          {submittedBooking.addOnNames.length > 0 ? submittedBooking.addOnNames.join(', ') : tBeauty('label_addon_default')}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className={styles.beautyCompletionSection}>
                    <h4 className={styles.beautyCompletionSectionTitle}>{tBeauty('completion_customer_info_title', { defaultValue: '고객 및 전달 정보' })}</h4>
                    <div className={styles.beautySummaryList}>
                      <div className={styles.beautySummaryItem}>
                        <span className={styles.beautySummaryLabel}>{tBeauty('form_name')}</span>
                        <strong className={styles.beautySummaryValue}>{submittedBooking.customerName}</strong>
                      </div>
                      <div className={styles.beautySummaryItem}>
                        <span className={styles.beautySummaryLabel}>{tBeauty('form_phone')}</span>
                        <strong className={styles.beautySummaryValue}>{submittedBooking.customerPhone}</strong>
                      </div>
                      <div className={styles.beautySummaryItem}>
                        <span className={styles.beautySummaryLabel}>{tBeauty('completion_lang_label', { defaultValue: '전달 언어' })}</span>
                        <strong className={styles.beautySummaryValue}>{submittedBooking.communicationLanguageLabel}</strong>
                      </div>
                      <div className={styles.beautySummaryItem}>
                        <span className={styles.beautySummaryLabel}>{tBeauty('completion_intent_label', { defaultValue: '전달 목적' })}</span>
                        <strong className={styles.beautySummaryValue}>{submittedBooking.communicationIntentLabel}</strong>
                      </div>
                      {submittedBooking.customerRequest ? (
                        <div className={styles.beautySummaryItem}>
                          <span className={styles.beautySummaryLabel}>{tBeauty('form_request')}</span>
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
                        <div className={styles.beautyAssistMessageBox}>{submittedBooking.koreanMessage}</div>
                      </div>
                      <div className={styles.beautyAssistMessageCard}>
                        <div className={styles.beautyAssistMessageHeader}>
                          <span className={styles.beautyAssistMessageLabel}>{submittedBooking.communicationLanguageLabel} {t('beauty_bookings.label_message')}</span>
                        </div>
                        <div className={styles.beautyAssistMessageBox}>{submittedBooking.localizedMessage}</div>
                      </div>
                    </div>
                <div className={styles.beautyCompletionActions}>
                  <button type="button" className={styles.beautySecondaryAction} onClick={handleBookingEditReset}>
                    {tBeauty('btn_edit')}
                  </button>
                </div>
              </div>
            ) : !isBookingConfirmOpen ? (
              <div className={styles.beautyConfirmEmpty}>
                <p className={styles.beautyConfirmEmptyTitle}>{tBeauty('confirm_empty_title')}</p>
                <p className={styles.beautyConfirmEmptyText}>
                  {tBeauty('confirm_empty_desc')}
                </p>
              </div>
            ) : !selectedBeautyStore || !selectedBeautyStoreName || !selectedBeautyDate || !selectedBeautyTime ? (
              <div className={styles.beautyConfirmEmpty}>
                <p className={styles.beautyConfirmEmptyTitle}>{tBeauty('confirm_review_error_title')}</p>
                <p className={styles.beautyConfirmEmptyText}>
                  {tBeauty('confirm_review_error_desc')}
                </p>
              </div>
            ) : (
              <div className={styles.beautyConfirmLayout}>
                <div className={styles.beautyConfirmSummaryCard}>
                  <span className={styles.beautySectionEyebrow}>{tBeauty('booking_review_eyebrow', { defaultValue: 'Booking Review' })}</span>
                  <div className={styles.beautySummaryList}>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>{tBeauty('summary_category')}</span>
                      <strong className={styles.beautySummaryValue}>{selectedBeautyCategoryLabel}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>{tBeauty('summary_store')}</span>
                      <strong className={styles.beautySummaryValue}>{selectedBeautyStoreName}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>{tBeauty('summary_region')}</span>
                      <strong className={styles.beautySummaryValue}>{selectedBeautyRegionLabel}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>{tBeauty('summary_date')}</span>
                      <strong className={styles.beautySummaryValue}>{selectedBeautyDateLabel}</strong>
                    </div>
                    <div className={styles.beautySummaryItem}>
                      <span className={styles.beautySummaryLabel}>{tBeauty('summary_time')}</span>
                      <strong className={styles.beautySummaryValue}>{selectedBeautyTime}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.beautyConfirmCard}>
                  <span className={styles.beautySectionEyebrow}>{tBeauty('customer_details_eyebrow', { defaultValue: '예약자' })}</span>
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
                  <div className={styles.beautyAssistSection}>
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

                  {selectedCommunicationIntent && (
                    <div className={styles.beautyAssistSection} style={{ marginTop: '16px' }}>
                      <div className={styles.beautyOptionSectionHeader}>
                        <h3 className={styles.beautyOptionSectionTitle}>{tBeauty('form_request')}</h3>
                        <span className={styles.beautyOptionSectionMeta}>{tBeauty('form_request_hint', { defaultValue: '선택하신 내용을 곁들여 자유롭게 적어주세요.' })}</span>
                      </div>
                      <textarea
                        className={styles.beautyAssistTextarea}
                        value={customerForm.request}
                        onChange={(e) => handleCustomerFieldChange('request', e.target.value)}
                        placeholder={tBeauty('form_request_placeholder')}
                        rows={5}
                        aria-label={tBeauty('form_request')}
                      />
                    </div>
                  )}
                </div>

                <div className={styles.beautyAgreementCard}>
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
                    aria-label={tBeauty('btn_submit')}
                    aria-busy={isSubmittingBeautyBooking}
                    onClick={handleBeautyBookingSubmit}
                  >
                    {isSubmittingBeautyBooking ? t('my_bookings.status_preparing') : tBeauty('btn_submit')}
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
        </div>

        <IntegratedBookingMenu 
          isOpen={isIntegratedBookingMenuOpen}
          onClose={() => setIsIntegratedBookingMenuOpen(false)}
          initialDate={selectedBeautyDate}
          initialTime={selectedBeautyTime}
          onConfirm={(date, time) => {
            console.log("Setting selection in parent:", date, time);
            setSelectedBeautyDate(date);
            setSelectedBeautyTime(time);
            setIsIntegratedBookingMenuOpen(false);
          }}
        />

        {toastMessage ? <div className={styles.toast}>{toastMessage}</div> : null}
      </>
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
