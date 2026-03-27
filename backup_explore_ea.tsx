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
    label: tBeauty('form_phone', { defaultValue: '?곕씫泥? }),
    placeholder: tBeauty('form_phone_placeholder', { defaultValue: '?꾪솕踰덊샇瑜??낅젰??二쇱꽭?? }),
    required: true,
  },
  {
    key: 'request',
    label: tBeauty('form_request', { defaultValue: '?붿껌?ы빆' }),
    placeholder: tBeauty('form_request_placeholder', { defaultValue: '留ㅼ옣???꾨떖?섏떎 ?댁슜???곸뼱二쇱꽭?? }),
    multiline: true,
  },
];

const AGREEMENT_FIELDS: (t: any, tBeauty: any) => AgreementFieldConfig[] = (t, tBeauty) => [
  {
    key: 'bookingConfirmed',
    label: tBeauty('agreement_confirm', { defaultValue: '?덉빟 ?댁슜 ?뺤씤' }),
    description: tBeauty('agreement_confirm_desc', { defaultValue: '?좏깮?섏떊 留ㅼ옣, ?쇱떆, ?쒖닠 ?뺣낫媛 ?뺥솗?⑥쓣 ?뺤씤?⑸땲??' }),
  },
  {
    key: 'privacyConsent',
    label: tBeauty('agreement_privacy', { defaultValue: '媛쒖씤?뺣낫 泥섎━諛⑹묠 ?숈쓽' }),
    description: tBeauty('agreement_privacy_desc', { defaultValue: '?덉빟 吏꾪뻾???꾪빐 ?깊븿, ?곕씫泥??깆쓽 ?뺣낫媛 留ㅼ옣???쒓났?⑥뿉 ?숈쓽?⑸땲??' }),
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
  { id: 'ko', label: tBeauty('lang_ko', { defaultValue: '?쒓뎅?? }), badge: 'KO' },
  { id: 'en', label: tBeauty('lang_en', { defaultValue: 'English' }), badge: 'EN' },
  { id: 'ja', label: tBeauty('lang_ja', { defaultValue: '?ζ쑍沃? }), badge: 'JA' },
  { id: 'zh-CN', label: tBeauty('lang_zh_cn', { defaultValue: '訝?뻼' }), badge: 'ZH' },
];

const COMMUNICATION_INTENTS: (t: any, tBeauty: any) => CommunicationIntentConfig[] = (t, tBeauty) => [
  {
    id: 'booking_confirm',
    label: tBeauty('intent_booking_confirm', { defaultValue: '?덉빟 ?뺤씤' }),
    description: tBeauty('intent_booking_confirm_desc', { defaultValue: '?덉빟 ?쒓컙怨??쒖닠 ?댁슜??媛꾨떒???뺤씤?????곹빀?댁슂.' }),
  },
  {
    id: 'service_request',
    label: tBeauty('intent_service_request', { defaultValue: '?쒖닠 ?붿껌 ?꾨떖' }),
    description: tBeauty('intent_service_request_desc', { defaultValue: '?먰븯???쒖닠怨?遺媛 ?듭뀡??誘몃━ ?꾨떖?????곹빀?댁슂.' }),
  },
  {
    id: 'allergy_notice',
    label: tBeauty('intent_allergy_notice', { defaultValue: '?뚮젅瑜닿린/誘쇨컧 ?ы빆 ?꾨떖' }),
    description: tBeauty('intent_allergy_notice_desc', { defaultValue: '誘쇨컧???쇰???二쇱쓽?ы빆??誘몃━ 怨듭쑀?????곹빀?댁슂.' }),
  },
  {
    id: 'style_consultation',
    label: tBeauty('intent_style_consultation', { defaultValue: '?ㅽ????곷떞 ?꾩?' }),
    description: tBeauty('intent_style_consultation_desc', { defaultValue: '諛⑸Ц ???ㅽ????곷떞 ?섎룄瑜?媛꾨떒???꾨떖?????곹빀?댁슂.' }),
  },
];

const COMMUNICATION_LANGUAGE_LABELS: Record<CommunicationLanguageId, string> = {
  ko: '?쒓뎅??,
  en: 'English',
  ja: '?ζ쑍沃?,
  'zh-CN': '訝?뻼',
};

const COMMUNICATION_INTENT_LABELS: Record<CommunicationIntentId, string> = {
  booking_confirm: '?덉빟 ?뺤씤',
  service_request: '?쒖닠 ?붿껌 ?꾨떖',
  allergy_notice: '?뚮젅瑜닿린/誘쇨컧 ?ы빆 ?꾨떖',
  style_consultation: '?ㅽ????곷떞 ?꾩?',
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

  return `${text.slice(0, maxLength).trim()}??;
}

function joinItemsForLanguage(items: string[], language: CommunicationLanguageId): string {
  if (items.length === 0) {
    return '';
  }

  if (language === 'ja' || language === 'zh-CN') {
    return items.join('??);
  }

  return items.join(', ');
}

function buildKoreanBookingMessage(payload: CommunicationMessagePayload): string {
  const introMap: Record<CommunicationIntentId, string> = {
    booking_confirm: '?덈뀞?섏꽭?? ?꾨옒 ?덉빟 ?댁슜???뺤씤 遺?곷뱶由쎈땲??',
    service_request: '?덈뀞?섏꽭?? ?덉빟怨??④퍡 ?쒖닠 ?붿껌?ы빆???꾨떖?쒕┰?덈떎.',
    allergy_notice: '?덈뀞?섏꽭?? ?덉빟 ??誘쇨컧 ?ы빆??誘몃━ ?꾨떖?쒕┰?덈떎.',
    style_consultation: '?덈뀞?섏꽭?? 諛⑸Ц ?꾩뿉 ?ㅽ????곷떞 ?붿껌???꾨떖?쒕┰?덈떎.',
  };
  const serviceText = payload.primaryServiceName
    ? `${payload.primaryServiceName}${payload.addOnNames.length > 0 ? `, 遺媛 ?듭뀡? ${payload.addOnNames.join(', ')}?낅땲??` : ' ?덉빟?낅땲??'}`
    : '?쒖닠 ?댁슜? 留ㅼ옣 ?곷떞 ???뺤젙 ?덉젙?낅땲??';
  const designerText = payload.designerName ? `?щ쭩 ?붿옄?대꼫??${payload.designerName}?낅땲??` : '?붿옄?대꼫??留ㅼ옣 異붿쿇?쇰줈 吏꾪뻾??二쇱꽭??';
  const requestText = payload.customerRequest ? `?붿껌?ы빆? "${payload.customerRequest}" ?낅땲??` : '';

  return [
    introMap[payload.intent],
    `${payload.dateLabel} ${payload.timeLabel}??${payload.storeName}?먯꽌 ${payload.categoryLabel} ?덉빟???덉뒿?덈떎.`,
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
      booking_confirm: '?볝굯?ャ걾??귚빳訝뗣겗雅덄큵?끻??믡걫閻븃첀?뤵걽?뺛걚??,
      service_request: '?볝굯?ャ걾??귝뼺烏볝겗躍뚧쐹?끻??믢틟?띲겓?길쐣?쀣겲?쇻?,
      allergy_notice: '?볝굯?ャ걾??귝씎佯쀥뎺?ユ븦?잋틟?끹굮?길쐣?쀣겲?쇻?,
      style_consultation: '?볝굯?ャ걾??귝씎佯쀥뎺?ャ궧?욍궎?ョ쎑獄뉎굮?딃줁?꾠걮?잆걚?㎯걲??,
    };
    const serviceText = payload.primaryServiceName
      ? `訝삠겒?썼죹??{payload.primaryServiceName}${addOnText ? `?곮옙?졼궕?쀣궥?㎯꺍??{addOnText}?㎯걲?? : '?㎯걲??}`
      : '?썼죹?끻???씎佯쀥풄?ョ쎑獄뉎걮??군?곥걼?꾠겎?쇻?;
    const designerText = payload.designerName ? `躍뚧쐹?뉎궣?ㅳ깏?쇈겘${payload.designerName}?㎯걲?? : '?끻퐪?끹겘?듿틭??걡?쇻걲?곥겎?딃줁?꾠걮?얇걲??;
    const requestText = payload.customerRequest ? `誤곫쐹???{payload.customerRequest}?띲겎?쇻? : '';

    return [
      introMap[payload.intent],
      `${payload.dateLabel} ${payload.timeLabel}??{payload.storeName}??{payload.categoryLabel}??틛榮꾠걣?귙굤?얇걲??,
      serviceText,
      designerText,
      requestText,
    ]
      .filter(Boolean)
      .join(' ');
  }

  const introMap: Record<CommunicationIntentId, string> = {
    booking_confirm: '?ⓨ?竊뚩?簾??餓δ툔窯꾤벧岳→겘??,
    service_request: '?ⓨ?竊뚧닊?녔룓?띹??롨퓳轝↓쥋瀛?쉪?띶뒦?黎귙?,
    allergy_notice: '?ⓨ?竊뚧닊?녑쑉?겼틭?띷룓?띹??롦븦?잋틟窈밤?,
    style_consultation: '?ⓨ?竊뚧닊躍뚧쐹?겼틭?띶뀍瑥닸삇訝訝뗩즼?쇔뮜瑥??黎귙?,
  };
  const serviceText = payload.primaryServiceName
    ? `訝삭쫨窈밭쎅??{payload.primaryServiceName}${addOnText ? `竊뚪셿?좈」??삸${addOnText}?? : '??}`
    : '窈밭쎅?끻???빳?겼틭?롥냽簾????;
  const designerText = payload.designerName ? `躍뚧쐹若됪럲?꾥?溫▼툑??{payload.designerName}?? : '溫얕?躍덂룾?깁뿨佯쀦렓?먨츎?믡?;
  const requestText = payload.customerRequest ? `鸚뉑낏竊?{payload.customerRequest}?? : '';

  return [
    introMap[payload.intent],
    `?묈쑉${payload.dateLabel} ${payload.timeLabel}窯꾤벧雅?{payload.storeName}??{payload.categoryLabel}?띶뒦??,
    serviceText,
    designerText,
    requestText,
  ]
    .filter(Boolean)
    .join(' ');
}

const DESIGNERS_BY_STORE: Record<string, BeautyDesigner[]> = {
  beauty_hair_1: [
    createDesigner('designer_hair_1_a', '吏???붿옄?대꼫', '?덉씠?대뱶 而?쨌 而щ윭', '寃쎈젰 9??, '?곷떞??瑗쇨세?섍퀬 ?쇨뎬??留욎땄 而룹씠 媛뺤젏?댁뿉??', 15000),
    createDesigner('designer_hair_1_b', '誘쇱꽌 ?먯옣', '?꾨━誘몄뾼 ??쨌 ?대━??, '寃쎈젰 14??, '?먯긽?꾩뿉 留욎텣 ?쒖닠 ?쒖꽌瑜??몄떖?섍쾶 ?≪븘?쒕젮??', 25000),
  ],
  beauty_hair_2: [
    createDesigner('designer_hair_2_a', '?섎┛ ?붿옄?대꼫', '蹂쇰ⅷ ??쨌 以묐떒諛?, '寃쎈젰 8??, '?먯뿰?ㅻ윭??蹂쇰ⅷ怨??쇨뎬???뺣━瑜??섑빐?쒕젮??', 12000),
    createDesigner('designer_hair_2_b', '?ㅼ븘 ?ㅼ옣', '而щ윭 泥댁씤吏 쨌 耳??, '寃쎈젰 11??, '?덉깋 ?대젰 ?곷떞怨?而щ윭 ???쒖븞??媛뺤젏?댁뿉??', 18000),
  ],
  beauty_nail_1: [
    createDesigner('designer_nail_1_a', '?쒖쑄 ?꾪떚?ㅽ듃', '???ㅼ씪 쨌 ?쒖쫵 ?꾪듃', '寃쎈젰 7??, '?몃젋?뷀븳 而щ윭 議고빀怨?源붾걫??留덇컧?쇰줈 ?좊챸?댁슂.', 10000),
    createDesigner('designer_nail_1_b', '梨꾨┛ ?꾪떚?ㅽ듃', '?쒕줈???꾪듃 쨌 ?뚯툩', '寃쎈젰 5??, '?됱궗 ?꾩슜 ?ъ씤???꾪듃瑜?鍮좊Ⅴ寃??쒖븞?대뱶?ㅼ슂.', 15000),
  ],
  beauty_nail_2: [
    createDesigner('designer_nail_2_a', '?섏뿰 ?ㅼ옣', '耳??쨌 ?⑤뵫 ?ㅼ씪', '寃쎈젰 10??, '?⑤뵫怨?珥ъ쁺 ?쇱젙??留욎텣 而щ윭 ?먮젅?댁뀡??媛뺤젏?댁뿉??', 12000),
    createDesigner('designer_nail_2_b', '?ㅻ퉰 ?꾪떚?ㅽ듃', '?쒕읇 ?ㅼ씪 쨌 洹몃씪?곗씠??, '寃쎈젰 6??, '留묎퀬 ????臾대뱶 ?곗텧???섑빐?쒕젮??', 8000),
  ],
  beauty_esthetic_1: [
    createDesigner('designer_esthetic_1_a', '?좎쭊 ?뚮씪?쇱뒪??, '吏꾩젙 쨌 蹂댁뒿 愿由?, '寃쎈젰 8??, '?덈????쇰?瑜??몄븞?섍쾶 耳?댄빐?쒕젮??', 10000),
    createDesigner('designer_esthetic_1_b', '?뚰씗 ?먯옣', '?꾨젰 쨌 ?ㅺ낸 愿由?, '寃쎈젰 13??, '?꾨젰 ?꾨줈洹몃옩怨??곷떞 留뚯”?꾧? ?믪? ?몄씠?먯슂.', 20000),
  ],
  beauty_esthetic_2: [
    createDesigner('designer_esthetic_2_a', '媛???뚮씪?쇱뒪??, '?щ뱶由?쨌 誘쇨컧??耳??, '寃쎈젰 7??, '?쇰? ?곹깭???곕씪 ?쒗뭹 援ъ꽦???좎뿰?섍쾶 議곗젙?대뱶?ㅼ슂.', 8000),
    createDesigner('designer_esthetic_2_b', '?덈┛ ?ㅼ옣', '?꾨젰 쨌 愿묒콈 愿由?, '寃쎈젰 9??, '以묒슂???쇱젙 ??鍮좊Ⅸ 而⑤뵒???뚮났???꾩??쒕젮??', 12000),
  ],
  beauty_waxing_1: [
    createDesigner('designer_waxing_1_a', '?꾩뿰 留ㅻ땲?', '釉뚮씪吏덈━??쨌 諛붾뵒 ?곸떛', '寃쎈젰 6??, '鍮좊Ⅴ怨?源붾걫???쒖닠 吏꾪뻾?쇰줈 ?щ갑臾몄씠 留롮븘??', 10000),
    createDesigner('designer_waxing_1_b', '?꾩븘 ?먯옣', '誘쇨컧遺??吏꾩젙 耳??, '寃쎈젰 12??, '誘쇨컧??怨좉컼 ?곷떞怨??ы썑 吏꾩젙 媛?대뱶媛 媛뺤젏?댁뿉??', 18000),
  ],
  beauty_waxing_2: [
    createDesigner('designer_waxing_2_a', '?쒖븘 留ㅻ땲?', '??쨌 ?ㅻ━ ?곸떛', '寃쎈젰 5??, '吏㏃? ?쇱젙?먯꽌??鍮좊Ⅴ寃??쒖닠??留덈Т由ы빐?쒕젮??', 6000),
    createDesigner('designer_waxing_2_b', '二쇳씗 ?ㅼ옣', '?諛붾뵒 쨌 吏꾩젙 愿由?, '寃쎈젰 9??, '?듭쬆??以꾩씠???쒗룷 議곗젅??媛뺤젏?댁뿉??', 12000),
  ],
  beauty_makeup_1: [
    createDesigner('designer_makeup_1_a', '蹂대씪 硫붿씠?ъ뾽 ?꾪떚?ㅽ듃', '?곗씪由?쨌 珥ъ쁺 硫붿씠?ъ뾽', '寃쎈젰 8??, '留묎퀬 ?먮졆???쇰? ?쒗쁽??媛뺤젏?댁뿉??', 18000),
    createDesigner('designer_makeup_1_b', '?섏븘 ?ㅼ옣', '?⑤뵫 ?섍컼 쨌 ?됱궗', '寃쎈젰 11??, '?ъ쭊諛쒖씠 ??諛쏅뒗 ???뺣━瑜??섑빐?쒕젮??', 25000),
  ],
  beauty_makeup_2: [
    createDesigner('designer_makeup_2_a', '吏誘??꾪떚?ㅽ듃', '硫댁젒 쨌 諛⑹넚 硫붿씠?ъ뾽', '寃쎈젰 7??, '?좊챸?섍퀬 ?⑥젙???몄긽??鍮좊Ⅴ寃??≪븘?쒕젮??', 12000),
    createDesigner('designer_makeup_2_b', '?쒖썝 ?먯옣', '?꾨━誘몄뾼 ?됱궗 硫붿씠?ъ뾽', '寃쎈젰 15??, '以묒슂 ?쇱젙 ???꾩꽦???믪? ?ㅽ??쇰쭅???쒖븞?대뱶?ㅼ슂.', 30000),
  ],
  beauty_lash_1: [
    createDesigner('designer_lash_1_a', '?뚯젙 ?꾪떚?ㅽ듃', '?띾늿????쨌 ?댄똿', '寃쎈젰 6??, '?먯뿰?ㅻ윭??而ш컧怨??좎??μ씠 醫뗭? ?몄씠?먯슂.', 10000),
    createDesigner('designer_lash_1_b', '?몄븘 ?ㅼ옣', '?곗옣 쨌 ?덈ℓ ?붿옄??, '寃쎈젰 9??, '?덈ℓ??留욎텣 而ш낵 湲몄씠 異붿쿇??瑗쇨세?댁슂.', 15000),
  ],
  beauty_lash_2: [
    createDesigner('designer_lash_2_a', '?ㅼ? ?꾪떚?ㅽ듃', '?곗옣 쨌 由ы꽣移?, '寃쎈젰 5??, '?띿꽦???붿옄?몃룄 媛蹂띻쾶 ?곗텧?대뱶?ㅼ슂.', 8000),
    createDesigner('designer_lash_2_b', '?쒖? ?먯옣', '??쨌 ?먯긽 耳??, '寃쎈젰 10??, '?띾늿???곹깭瑜?蹂닿퀬 ?쒖닠 媛뺣룄瑜??몄떖?섍쾶 議곗젙?대뱶?ㅼ슂.', 15000),
  ],
};

const PRIMARY_SERVICES_BY_CATEGORY: Record<BeautyCategoryId, BeautyServiceOption[]> = {
  hair: [
    createServiceOption('hair_women_cut', '?ъ꽦 而?, '湲몄씠 ?뺣━? ?쇨뎬??留욎땄 而ㅽ듃', 55000),
    createServiceOption('hair_men_cut', '?⑥꽦 而?, '?먯엯 ?뺣━? ?ㅽ??쇰쭅 而ㅽ듃', 38000),
    createServiceOption('hair_root_color', '肉뚮━?쇱깋', '?먮? 紐⑤컻 ?꾩＜ ??蹂댁젙', 89000),
    createServiceOption('hair_clinic', '?대━??, '?먯긽??耳??以묒떖 ?꾨줈洹몃옩', 99000),
  ],
  nail: [
    createServiceOption('nail_gel', '???ㅼ씪', '湲곕낯 ??而щ윭 ?쒖닠', 79000),
    createServiceOption('nail_care', '?ㅼ씪 耳??, '?먰떚???뺣━? ?먰넲 耳??, 45000),
    createServiceOption('nail_pedi', '???섎뵒', '??耳???ы븿 ???쒖닠', 89000),
  ],
  esthetic: [
    createServiceOption('esthetic_calming', '吏꾩젙 愿由?, '?덈????쇰? 吏꾩젙 以묒떖 ?꾨줈洹몃옩', 88000),
    createServiceOption('esthetic_moisture', '蹂댁뒿 愿由?, '嫄댁“???쇰? 蹂댁뒿 異⑹쟾 ?꾨줈洹몃옩', 95000),
    createServiceOption('esthetic_lifting', '?꾨젰 愿由?, '?꾨젰 媛쒖꽑 以묒떖 耳??, 118000),
  ],
  waxing: [
    createServiceOption('waxing_brazilian', '釉뚮씪吏덈━??, '誘쇨컧遺??以묒떖 ?곸떛', 99000),
    createServiceOption('waxing_arm', '???곸떛', '?묓뙏 ?꾩껜 ?뺣━', 55000),
    createServiceOption('waxing_leg', '?ㅻ━ ?곸떛', '醫낆븘由??먮뒗 ?섑봽 ?덇렇 湲곗?', 69000),
  ],
  makeup: [
    createServiceOption('makeup_daily', '?곗씪由?硫붿씠?ъ뾽', '媛踰쇱슫 ?쇱젙??硫붿씠?ъ뾽', 85000),
    createServiceOption('makeup_interview', '硫댁젒 硫붿씠?ъ뾽', '?⑥젙?섍퀬 ?좊챸???몄긽 ?뺣━', 99000),
    createServiceOption('makeup_guest', '?⑤뵫 ?섍컼 硫붿씠?ъ뾽', '?됱궗 ?쇱젙??留욎텣 ?ㅽ??쇰쭅', 132000),
  ],
  lash: [
    createServiceOption('lash_perm', '?띾늿????, '而?怨좎젙 以묒떖 ?쒖닠', 69000),
    createServiceOption('lash_extension', '?띾늿???곗옣', '湲몄씠? 而??좏깮???곗옣 ?쒖닠', 99000),
    createServiceOption('lash_retouch', '由ы꽣移?, '湲곗〈 ?곗옣 蹂댁셿 ?쒖닠', 59000),
  ],
};

const ADD_ONS_BY_CATEGORY: Record<BeautyCategoryId, BeautyServiceOption[]> = {
  hair: [
    createServiceOption('hair_add_scalp', '?먰뵾 ?ㅼ??쇰쭅', '?쒖닠 ???먰뵾 ?뺣━ 耳??, 25000),
    createServiceOption('hair_add_blowdry', '?ㅽ??쇰쭅 留덈Т由?, '?쒕씪?댁? 媛꾨떒???ㅽ??쇰쭅', 18000),
    createServiceOption('hair_add_ampoule', '?고뵆 耳??, '?먯긽 遺??吏묒쨷 ?곸뼇 耳??, 30000),
  ],
  nail: [
    createServiceOption('nail_add_removal', '?쒓굅 ?ы븿', '湲곗〈 ???쒓굅 ?ы븿 吏꾪뻾', 15000),
    createServiceOption('nail_add_art', '?ъ씤???꾪듃', '?묒넀 湲곗? ?ъ씤???꾪듃 異붽?', 22000),
    createServiceOption('nail_add_strength', '媛뺥솕 肄뷀똿', '?좎???蹂닿컯 肄뷀똿', 12000),
  ],
  esthetic: [
    createServiceOption('esthetic_add_modeling', '紐⑤뜽留???, '吏꾩젙 留덈Т由???異붽?', 20000),
    createServiceOption('esthetic_add_neck', '紐?愿由?異붽?', '紐⑹꽑 吏묒쨷 耳??, 18000),
    createServiceOption('esthetic_add_led', 'LED 耳??, '吏꾩젙 蹂댁“ 愿?耳??, 25000),
  ],
  waxing: [
    createServiceOption('waxing_add_care', '吏꾩젙 耳??, '?쒖닠 ??吏꾩젙 ??愿由?, 15000),
    createServiceOption('waxing_add_pack', '?섎텇 ??, '?먭레 ?꾪솕????異붽?', 12000),
    createServiceOption('waxing_add_trim', '?몃━諛??ы븿', '?쒖닠 ???뺣━ ?ы븿', 10000),
  ],
  makeup: [
    createServiceOption('makeup_add_hair', '?ㅼ뼱 ?쒕씪??, '媛꾨떒??釉붾줈???ㅽ??쇰쭅', 25000),
    createServiceOption('makeup_add_lash', '?띾늿??遺李?, '遺遺?媛???먮뒗 ?ъ씤???섏돩', 18000),
    createServiceOption('makeup_add_touchup', '?꾩옣 ?섏젙 ?ㅽ듃', '媛꾨떒???섏젙???ㅽ듃 ?쒓났', 15000),
  ],
  lash: [
    createServiceOption('lash_add_remove', '?쒓굅 ?ы븿', '湲곗〈 ?곗옣 ?쒓굅 ?ы븿', 15000),
    createServiceOption('lash_add_tinting', '釉붾옓 ?댄똿', '?먮졆??而щ윭 蹂댁젙', 12000),
    createServiceOption('lash_add_coating', '?곸뼇 肄뷀똿', '?좎???蹂댁“ 肄뷀똿', 10000),
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
    label: tBeauty('home_beauty:categories.hair.label', { defaultValue: '?ㅼ뼱' }),
    english: 'Hair',
    badge: 'HAIR',
    description: tBeauty('home_beauty:categories.hair.summary', { defaultValue: '?ㅽ???泥댁씤吏遺??媛踰쇱슫 ?먯쭏源뚯? 鍮좊Ⅴ寃??덉빟???쒖옉?????덉뼱??' }),
  },
  nail: {
    label: tBeauty('home_beauty:categories.nail.label', { defaultValue: '?ㅼ씪' }),
    english: 'Nail',
    badge: 'NAIL',
    description: tBeauty('home_beauty:categories.nail.summary', { defaultValue: '?몃젋?뷀븳 ?꾪듃? 瑗쇨세??耳?? }),
  },
  esthetic: {
    label: tBeauty('home_beauty:categories.esthetic.label', { defaultValue: '?쇰?愿由? }),
    english: 'Esthetic',
    badge: 'CARE',
    description: tBeauty('home_beauty:categories.esthetic.summary', { defaultValue: '?쇰? ??낅퀎 留욎땄 耳???붾（?? }),
  },
  waxing: {
    label: tBeauty('home_beauty:categories.waxing.label', { defaultValue: '?곸떛' }),
    english: 'Waxing',
    badge: 'WAX',
    description: tBeauty('home_beauty:categories.waxing.summary', { defaultValue: '源붾걫???꾩깮 愿由ъ? ??먭레 ?쒖닠' }),
  },
  makeup: {
    label: tBeauty('home_beauty:categories.makeup.label', { defaultValue: '硫붿씠?ъ뾽' }),
    english: 'Makeup',
    badge: 'MAKE',
    description: tBeauty('home_beauty:categories.makeup.summary', { defaultValue: '?밸퀎???좎쓣 ?꾪븳 ?꾨Ц媛???곗튂' }),
  },
  lash: {
    label: tBeauty('home_beauty:categories.lash.label', { defaultValue: '?띾늿?? }),
    english: 'Lash',
    badge: 'LASH',
    description: tBeauty('home_beauty:categories.lash.summary', { defaultValue: '?덈ℓ瑜??먮졆?섍쾶 留뚮뱶??而??붿옄?? }),
  },
});

const BEAUTY_REGIONS: (t: any, tBeauty: any) => Array<{ id: BeautyRegionId; label: string }> = (t, tBeauty) => [
  { id: 'all', label: tBeauty('region_all', { defaultValue: '?꾩껜 吏?? }) },
  { id: 'jongno', label: tBeauty('regions.jongno', { defaultValue: '醫낅줈' }) },
  { id: 'gangnam', label: tBeauty('regions.gangnam', { defaultValue: '媛뺣궓' }) },
  { id: 'hongdae', label: tBeauty('regions.hongdae', { defaultValue: '?띾?' }) },
  { id: 'seongsu', label: tBeauty('regions.seongsu', { defaultValue: '?깆닔' }) },
  { id: 'jamsil', label: tBeauty('regions.jamsil', { defaultValue: '?좎떎' }) },
  { id: 'konkuk', label: tBeauty('regions.konkuk', { defaultValue: '嫄대?' }) },
  { id: 'pangyo', label: tBeauty('regions.pangyo', { defaultValue: '?먭탳' }) },
];

const BEAUTY_STORE_ITEMS: BeautyStore[] = [
  {
    id: 'beauty_hair_1',
    name: '?쇳봽硫붿쥌 ?ㅼ뼱 媛뺣궓',
    category: 'hair',
    region: 'gangnam',
    rating: 4.9,
    reviewCount: 218,
    priceLabel: '而ㅽ듃 55,000??',
    shortDescription: '?덉씠?대뱶 而룰낵 ?먯뿰?ㅻ윭??而щ윭 ?곷떞??媛뺤젏???꾨━誘몄뾼 ?ㅼ뼱 ?ㅽ뒠?붿삤?낅땲??',
    tags: ['?붿옄??而?, '?쇱뒪??而щ윭', '?먰뵾 耳??],
  },
  {
    id: 'beauty_hair_2',
    name: '?꾪?由ъ뿉 ?깆닔 ?ㅼ뼱猷?,
    category: 'hair',
    region: 'seongsu',
    rating: 4.8,
    reviewCount: 164,
    priceLabel: '蹂쇰ⅷ ??120,000??',
    shortDescription: '蹂쇰ⅷ ?뚭낵 ?ㅽ???泥댁씤吏 ?곷떞??李⑤텇?섍쾶 吏꾪뻾?섎뒗 ?꾨씪?대퉿 ?ㅼ뼱猷몄엯?덈떎.',
    tags: ['蹂쇰ⅷ ??, '?꾨씪?대퉿', '?ㅽ????곷떞'],
  },
  {
    id: 'beauty_nail_1',
    name: '硫붿쥌 ?ㅼ씪 ?띾?',
    category: 'nail',
    region: 'hongdae',
    rating: 4.8,
    reviewCount: 137,
    priceLabel: '???ㅼ씪 79,000??',
    shortDescription: '?몃젋?뷀븳 而щ윭 議고빀怨??쒖쫵 ?꾪듃媛 媛뺥븳 ?ㅼ씪 ?꾨Ц ?ㅽ뒠?붿삤?낅땲??',
    tags: ['?대떖???꾪듃', '??耳??, '而щ윭 ?먮젅?댁뀡'],
  },
  {
    id: 'beauty_nail_2',
    name: '踰좎씠吏 ?ㅼ씪 ?좎떎',
    category: 'nail',
    region: 'jamsil',
    rating: 4.7,
    reviewCount: 102,
    priceLabel: '?ㅼ씪 耳??45,000??',
    shortDescription: '源붾걫???ㅽ뵾???ㅼ씪遺???⑤뵫 ???먰넲 耳?닿퉴吏 ?덉젙?곸쑝濡?諛쏆쓣 ???덉뼱??',
    tags: ['?ㅽ뵾???ㅼ씪', '?⑤뵫 以鍮?, '?먰넲 耳??],
  },
  {
    id: 'beauty_esthetic_1',
    name: '?몃┛ ?ㅽ궓 ?쇱슫吏 ?먭탳',
    category: 'esthetic',
    region: 'pangyo',
    rating: 4.9,
    reviewCount: 189,
    priceLabel: '蹂댁뒿 愿由?95,000??',
    shortDescription: '?쇰? 吏꾩젙怨??꾨젰 耳?대? 議곗슜??怨듦컙?먯꽌 諛쏆쓣 ???덈뒗 ?먯뒪?뚰떛 ?쇱슫吏?낅땲??',
    tags: ['吏꾩젙 耳??, '?꾨젰 愿由?, '?꾨씪?대퉿 猷?],
  },
  {
    id: 'beauty_esthetic_2',
    name: '湲濡쒖슦 ?щ???嫄대?',
    category: 'esthetic',
    region: 'konkuk',
    rating: 4.7,
    reviewCount: 121,
    priceLabel: '?섎텇 吏꾩젙 耳??88,000??',
    shortDescription: '?덈????쇰?瑜??꾪븳 留욎땄 吏꾩젙 ?꾨줈洹몃옩怨??덉???媛?대뱶媛 媛뺤젏?낅땲??',
    tags: ['?섎텇 愿由?, '?덈? ?쇰?', '留욎땄 ?곷떞'],
  },
  {
    id: 'beauty_waxing_1',
    name: '踰좎뼱 ?꾪?由ъ뿉 ?곸떛 媛뺣궓',
    category: 'waxing',
    region: 'gangnam',
    rating: 4.8,
    reviewCount: 143,
    priceLabel: '釉뚮씪吏덈━??99,000??',
    shortDescription: '?꾩깮 愿由ъ? ?몄떖???ы썑 耳???덈궡濡??щ갑臾몄쑉???믪? ?곸떛 ?꾨Ц?먯엯?덈떎.',
    tags: ['?꾩깮 愿由?, '?ы썑 耳??, '誘쇨컧 遺??],
  },
  {
    id: 'beauty_waxing_2',
    name: '?뚰봽???ㅽ듃由??띾?',
    category: 'waxing',
    region: 'hongdae',
    rating: 4.6,
    reviewCount: 96,
    priceLabel: '???곸떛 55,000??',
    shortDescription: '吏㏃? ?쇱젙?먮룄 鍮좊Ⅴ寃??덉빟?????덈뒗 媛踰쇱슫 ?곸떛 以묒떖 ?ㅽ뒠?붿삤?낅땲??',
    tags: ['???곸떛', '鍮좊Ⅸ ?쒖닠', '媛踰쇱슫 諛⑸Ц'],
  },
  {
    id: 'beauty_makeup_1',
    name: '?꾪?由ъ뿉 踰좎씪 硫붿씠?ъ뾽 ?깆닔',
    category: 'makeup',
    region: 'seongsu',
    rating: 4.9,
    reviewCount: 176,
    priceLabel: '?곗씪由?硫붿씠?ъ뾽 85,000??',
    shortDescription: '珥ъ쁺怨??됱궗 ?쇱젙??留욎텣 ?쇰? 寃??뺣룉怨?踰좎씠???쒗쁽?쇰줈 留뚯”?꾧? ?믪? ?듭엯?덈떎.',
    tags: ['珥ъ쁺 硫붿씠?ъ뾽', '?곗씪由?猷?, '?쇱뒪??臾대뱶'],
  },
  {
    id: 'beauty_makeup_2',
    name: '?붿뼱 裕ㅼ쫰 硫붿씠?ъ뾽 ?좎떎',
    category: 'makeup',
    region: 'jamsil',
    rating: 4.8,
    reviewCount: 132,
    priceLabel: '?⑤뵫 ?섍컼 硫붿씠?ъ뾽 132,000??',
    shortDescription: '?⑤뵫怨?以묒슂???쇱젙 ??硫붿씠?ъ뾽 ?곷떞??珥섏킌?섍쾶 吏꾪뻾?섎뒗 ?꾨━誘몄뾼 ?듭엯?덈떎.',
    tags: ['?⑤뵫 以鍮?, '1:1 ?곷떞', '?ㅼ뼱 ?곗텧'],
  },
  {
    id: 'beauty_lash_1',
    name: '釉붾８ ?섏돩 遺?고겕 媛뺣궓',
    category: 'lash',
    region: 'gangnam',
    rating: 4.9,
    reviewCount: 204,
    priceLabel: '?띾늿???곗옣 99,000??',
    shortDescription: '?덈ℓ??留욎텣 而??붿옄?멸낵 ?좎????믪? ?쒖닠濡??멸린 ?덈뒗 ?띾늿???꾨Ц?듭엯?덈떎.',
    tags: ['而??붿옄??, '?좎???, '?먯뿰?ㅻ윭???곗옣'],
  },
  {
    id: 'beauty_lash_2',
    name: '?섎뜑 ?섏돩 嫄대?',
    category: 'lash',
    region: 'konkuk',
    rating: 4.7,
    reviewCount: 114,
    priceLabel: '?띾늿????69,000??',
    shortDescription: '泥?諛⑸Ц 怨좉컼??遺???놁씠 ?덉빟?????덈뒗 ?띾늿????以묒떖 留ㅼ옣?낅땲??',
    tags: ['?띾늿????, '泥?諛⑸Ц 異붿쿇', '?먯뿰 而?],
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
    : tBeauty('label_designer_default', { defaultValue: '?붿옄?대꼫 ?좏깮 ???? });
  const selectedPrimaryServiceLabel = selectedPrimaryService ? selectedPrimaryService.name : tBeauty('label_service_default');
  const selectedAddOnLabel = selectedAddOnOptions.length > 0
    ? selectedAddOnOptions.map((option) => option.name).join(', ')
    : tBeauty('label_addon_default', { defaultValue: '異붽? ?듭뀡 ?놁쓬' });
  
  const selectedCommLangLabel = commLangs.find(l => l.id === selectedCommunicationLanguage)?.label ?? selectedCommunicationLanguage;
  const selectedCommIntentLabel = commIntents.find(i => i.id === selectedCommunicationIntent)?.label ?? selectedCommunicationIntent;

  useEffect(() => {
    if (!selectedBeautyAvailability) {
      setSelectedBeautyDate(null);
      setSelectedBeautyTime(null);
      if (currentStep > 1) setCurrentStep(1);
      return;
    }

    // ?좎쭨/?쒓컙 ?좏깮 ?꾨즺 ??Step 3 ?④퀎?먯꽌???낅젰 媛?ν븯?꾨줉
    // 紐⑥쓽 ?곗씠??湲곕컲???꾧꺽??媛??Slot 泥댄겕(?쇱튂 ?щ?)瑜??꾪솕?⑸땲??
    if (selectedBeautyDate && selectedBeautyTime) {
      // Logic for confirming booking even if slot doesn't match exactly exists here.
      // We skip mandatory reset to null if the value exists.
    }
  }, [selectedBeautyAvailability, selectedBeautyDate, selectedBeautyTime]);

  useEffect(() => {
    // ?좏깮 ?뺣낫媛 ?꾩삁 ?녿뒗 寃쎌슦?먮쭔 ?ロ엳?꾨줉 ?섍퀬, 
    // ?대? ?대젮 ?덈뒗 ?곹깭?쇰㈃ ?뺣낫媛 ?쇰? ?섏젙?섎뜑?쇰룄 媛뺤젣濡??レ? ?딆뒿?덈떎.
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
        return t('beauty_bookings.error_phone_format') || '?곕씫泥섎뒗 ?レ옄? ?섏씠?덈쭔 ?ъ슜???낅젰??二쇱꽭??';
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
    
    // ?대쫫 ?꾨뱶???곷Ц(??뚮Ц??怨?怨듬갚留??덉슜
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
            primaryServiceDefaultLabel: t('beauty_explore.label_service_default', { defaultValue: '誘몄꽑?? }),
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




  const isCustomerNameValid = validateCustomerField('name', customerForm.name) === '';
  const isCustomerPhoneValid = validateCustomerField('phone', customerForm.phone) === '';
  const beautyHeroFlow = beautyCategoryFilter
    ? ['吏???좏깮', '留ㅼ옣 怨좊Ⅴ湲?, '?쒓컙 ?뺤씤']
    : ['移댄뀒怨좊━ ?뺤씤', '吏???좏깮', '留ㅼ옣 怨좊Ⅴ湲?];
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
    '?뺣낫 ?낅젰',
    tBeauty('confirm_eyebrow', { defaultValue: '?덉빟?뺤씤' })
  ];
  const beautyCurrentStepIndex = submittedBooking 
    ? 4 
    : currentStep - 1;

  const renderBeautyProgressIndicator = () => (
    <ol className={styles.beautyStepIndicator} aria-label="酉고떚 ?덉빟 ?④퀎">
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
  if (isBeautyExplore) {
    return (
      <div className={styles.beautyExplorePage}>
        <div className="relative w-full">
          {/* ?ㅻ줈媛湲?踰꾪듉 - 醫뚯륫 ?곷떒 ?낅┰ 諛곗튂 */}
          <button
            type="button"
            onClick={() => {
              if (currentStep > 1 && !submittedBooking) {
                setCurrentStep(prev => prev - 1);
              } else {
                router.back();
              }
            }}
            className="absolute left-3 top-0 z-[50] flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors"
            aria-label={t('common.back', { defaultValue: 'Back' })}
          >
            {/* ?붿궡???꾩씠肄?(?????ы븿) */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>

          <section className={styles.beautyHero}>
             <span className={styles.beautyEyebrow}>STEP {currentStep} / 4</span>
             <div className="mb-1" />
             <h1 className={styles.beautyTitle}>
               {currentStep === 1 && (beautyCategoryFilter ? `${beautyCategoryLabel} 留ㅼ옣???좏깮?댁＜?몄슂` : "愿???덈뒗 留ㅼ옣??怨⑤씪蹂댁꽭??)}
               {currentStep === 2 && "?덉빟 ?쇱떆瑜??좏깮?댁＜?몄슂"}
               {currentStep === 3 && "?곸꽭 ?뺣낫瑜??낅젰?댁＜?몄슂"}
               {currentStep === 4 && "?덉빟 ?댁슜???뺤씤?댁＜?몄슂"}
             </h1>
             <div className="mt-4">
               {renderBeautyProgressIndicator()}
             </div>
          </section>
        </div>

        <main className="px-4 pb-24">
          {submittedBooking ? (
            <div className={styles.beautyCompletionCard}>
              <p className={styles.beautyCompletionTitle}>{t('beauty_explore.completion_title')}</p>
              <div className={styles.beautyCompletionMain}>
                <p className={styles.beautyCompletionDesc}>{t('beauty_explore.completion_desc1')}</p>
                <div className={styles.beautyCompletionHero}>
                  <div className={styles.beautyCompletionHeroBlock}>
                    <span className={styles.beautyCompletionHeroLabel}>?덉빟 留ㅼ옣</span>
                    <strong className={styles.beautyCompletionHeroTitle}>{submittedBooking.storeName}</strong>
                    <span className={styles.beautyCompletionHeroMeta}>{submittedBooking.date} 쨌 {submittedBooking.time}</span>
                  </div>
                </div>
              </div>
              <div className={styles.beautyCompletionActions}>
                <button type="button" className={styles.beautySecondaryAction} onClick={handleBookingEditReset}>
                  硫붿씤?쇰줈 ?뚯븘媛湲?                </button>
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
                            className={`bg-white rounded-2xl transition-all duration-300 ${isSelected ? 'ring-2 ring-[#bb8a78] shadow-md bg-[#fffbfa]' : 'shadow-sm border border-neutral-100'}`}
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
                                <h3 className="text-base font-bold text-neutral-900 truncate">{store.name}</h3>
                                <p className="text-xs text-neutral-500">{tBeauty(`region_${store.region}`)}</p>
                                <div className="text-sm font-semibold text-[#bb8a78] mt-1">{store.priceLabel}</div>
                              </div>
                              <div className="shrink-0 text-[#bb8a78] font-bold text-xs uppercase bg-[#fff5f0] px-3 py-1.5 rounded-lg border border-[#f0e0d8]">
                                {tBeauty('btn_select_salon', { defaultValue: '?좏깮' })}
                              </div>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <p className="text-center py-10 text-neutral-400">寃?됰맂 留ㅼ옣???놁뒿?덈떎.</p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="flex flex-col gap-6">
                  {selectedBeautyStore && (
                    <div className="bg-white border border-neutral-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                        <img src={selectedBeautyStore.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-[#bb8a78] uppercase tracking-wider">SELECTED STORE</span>
                        <h3 className="font-bold text-neutral-800">{selectedBeautyStoreName}</h3>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">?좎쭨? ?쒓컙??怨⑤씪二쇱꽭??/h3>
                    {selectedBeautyDate && selectedBeautyTime ? (
                      <div className="flex flex-col gap-4">
                        <div className="bg-[#fffcfb] border border-[#bb8a78]/20 rounded-xl p-4">
                          <div className="text-sm text-neutral-500 mb-1">?좏깮???쇱떆</div>
                          <div className="text-xl font-bold text-neutral-900">{selectedBeautyDateLabel} - {selectedBeautyTime}</div>
                        </div>
                        <button 
                          onClick={() => setIsIntegratedBookingMenuOpen(true)}
                          className="text-[#bb8a78] font-bold underline text-sm py-2"
                        >
                          ?ㅻⅨ ?쇱떆濡?蹂寃쏀븯湲?                        </button>
                        <button 
                          onClick={() => setCurrentStep(3)}
                          className="w-full bg-[#bb8a78] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#a67969] transition-all"
                        >
                          ?ㅼ쓬: ?곸꽭 ?뺣낫 ?낅젰
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsIntegratedBookingMenuOpen(true)}
                        className="w-full bg-[#bb8a78] text-white py-5 rounded-xl font-bold text-lg shadow-md"
                      >
                        ?좎쭨 諛??쒓컙 ?좏깮?섍린
                      </button>
                    )}
                  </div>

                  <button onClick={() => setCurrentStep(1)} className="text-neutral-400 font-medium py-2">?ㅻⅨ 留ㅼ옣 ?좏깮?섍린</button>
                </div>
              )}

              {currentStep === 3 && (
                <div className="flex flex-col gap-6">
                   {/* 1. ?쒕퉬??醫낅쪟 ?좏깮 (Primary Service) */}
                   <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex flex-col gap-4">
                     <span className="text-xs font-bold text-[#bb8a78] uppercase tracking-wider">Select Service</span>
                     <div className="flex flex-col gap-2">
                       {availablePrimaryServices.map((service) => {
                         const isSelected = selectedPrimaryServiceId === service.id;
                         return (
                           <button
                             key={service.id}
                             type="button"
                             className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all ${
                               isSelected ? 'border-[#bb8a78] bg-[#fffbfa]' : 'border-neutral-50 bg-neutral-50'
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
                       {formErrors.primaryService && <p className="text-[11px] text-red-500 font-medium px-1">{formErrors.primaryService}</p>}
                     </div>
                   </div>

                   <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex flex-col gap-4">
                     <span className="text-xs font-bold text-[#bb8a78] uppercase tracking-wider">Customer Details</span>
                     <div className="flex flex-col gap-4">
                       {customerFormFields.map((field) => {
                         const inputId = `beauty-booking-${field.key}`;
                         const fieldError = field.key === 'request' ? '' : formErrors[field.key as FormErrorKey];
                         const labelText = field.key === 'phone' ? `${field.label} (SNS ID ?ы븿 媛??` : field.label;

                         return (
                           <div key={field.key} className="flex flex-col gap-1.5">
                             <label className="text-xs font-bold text-neutral-600" htmlFor={inputId}>
                               {labelText}{field.required ? ' *' : ''}
                             </label>
                             {field.multiline ? (
                               <textarea
                                 id={inputId}
                                 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-sm focus:border-[#bb8a78] outline-none transition-all"
                                 rows={4}
                                 value={customerForm[field.key]}
                                 placeholder={field.placeholder}
                                 onChange={(e) => handleCustomerFieldChange(field.key, e.target.value)}
                               />
                             ) : field.key === 'phone' ? (
                               <div className="flex gap-2">
                                 <div className="relative shrink-0">
                                   <div 
                                      className="h-12 bg-neutral-100 border border-neutral-200 rounded-xl flex items-center px-3 gap-1.5 transition-all cursor-pointer focus-within:border-[#bb8a78]"
                                      onClick={() => setIsCountryPickerOpen(!isCountryPickerOpen)}
                                   >
                                      <div className="flex items-center justify-center p-1 bg-white/60 rounded-md backdrop-blur-[2px] border border-white/40 shadow-sm">
                                         <img src={selectedCountry.flag} alt="" className="w-5 h-3.5 object-cover rounded-[2px] mr-1.5" />
                                         <span className="text-[12px] font-black text-neutral-800 leading-none">{selectedCountry.dial}</span>
                                      </div>
                                      
                                      <div className="text-neutral-400">
                                        <svg width="8" height="5" viewBox="0 0 10 6" fill="none" className={`transition-transform duration-200 ${isCountryPickerOpen ? 'rotate-180' : ''}`}>
                                          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      </div>
                                   </div>

                                   {isCountryPickerOpen && (
                                     <>
                                       <div 
                                         className="fixed inset-0 z-[60]" 
                                         onClick={() => setIsCountryPickerOpen(false)} 
                                       />
                                       <div className="absolute top-full left-0 mt-2 w-32 max-h-60 overflow-y-auto bg-white border border-neutral-100 rounded-xl shadow-xl z-[70] py-2 animate-in fade-in zoom-in duration-200">
                                         {COUNTRY_CODES.map((c) => (
                                           <button
                                             key={c.code}
                                             type="button"
                                             className="w-full flex items-center px-3 py-2.5 hover:bg-neutral-50 transition-colors gap-2"
                                             onClick={() => {
                                               setSelectedCountry({ code: c.code, dial: c.dial, flag: c.flag });
                                               setIsCountryPickerOpen(false);
                                             }}
                                           >
                                             <img src={c.flag} alt="" className="w-5 h-3.5 object-cover rounded-[1px] shrink-0" />
                                             <span className="text-xs font-bold text-neutral-700">{c.dial}</span>
                                           </button>
                                         ))}
                                       </div>
                                     </>
                                   )}
                                 </div>
                                 <input
                                   id={inputId}
                                   className={`flex-1 h-12 bg-neutral-50 border ${fieldError ? 'border-red-400' : 'border-neutral-200'} rounded-xl px-4 text-sm focus:border-[#bb8a78] outline-none transition-all`}
                                   type="tel"
                                   value={customerForm[field.key]}
                                   placeholder={field.placeholder}
                                   onChange={(e) => handleCustomerFieldChange(field.key, e.target.value)}
                                   onBlur={() => handleCustomerFieldBlur(field.key as any)}
                                 />
                               </div>
                             ) : (
                               <input
                                 id={inputId}
                                 className={`w-full h-12 bg-neutral-50 border ${fieldError ? 'border-red-400' : 'border-neutral-200'} rounded-xl px-4 text-sm focus:border-[#bb8a78] outline-none transition-all`}
                                 type="text"
                                 value={customerForm[field.key]}
                                 placeholder={field.placeholder}
                                 onChange={(e) => handleCustomerFieldChange(field.key, e.target.value)}
                                 onBlur={() => handleCustomerFieldBlur(field.key as any)}
                               />
                             )}
                             {fieldError && <p className="text-[11px] text-red-500 font-medium px-1 mt-0.5">{fieldError}</p>}
                           </div>
                         );
                       })}
                     </div>
                   </div>

                   <button
                     type="button"
                     className="w-full bg-[#bb8a78] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#a67969] transition-all"
                     onClick={() => {
                        if (!selectedPrimaryServiceId) {
                           setFormErrors(prev => ({ ...prev, primaryService: "?쒖닠 ?댁뿭???좏깮?댁＜?몄슂." }));
                           showToast("?쒖닠 ?댁뿭???좏깮??二쇱꽭??");
                           return;
                        }
                        handleStep3ToStep4Continue();
                     }}
                   >
                     ?ㅼ쓬: ?덉빟 ?댁슜 ?뺤씤
                   </button>
                   <button onClick={() => setCurrentStep(2)} className="text-neutral-400 font-medium py-2">?댁쟾: ?좎쭨 ?좏깮?쇰줈</button>
                </div>
              )}

              {currentStep === 4 && (
                <div className="flex flex-col gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex flex-col gap-4">
                    <span className="text-xs font-bold text-[#bb8a78] uppercase tracking-wider">Booking Summary</span>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start border-b border-neutral-50 pb-3">
                        <span className="text-sm text-neutral-400">留ㅼ옣</span>
                        <strong className="text-sm text-neutral-800 text-right">{selectedBeautyStoreName}</strong>
                      </div>
                      <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
                        <span className="text-sm text-neutral-400">?쇱떆</span>
                        <strong className="text-sm text-neutral-800">{selectedBeautyDateLabel} - {selectedBeautyTime}</strong>
                      </div>
                      <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
                        <span className="text-sm text-neutral-400">?쒕퉬??/span>
                        <strong className="text-sm text-neutral-800">{selectedPrimaryService?.name}</strong>
                      </div>
                      <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
                        <span className="text-sm text-neutral-400">?대쫫</span>
                        <strong className="text-sm text-neutral-800">{customerForm.name}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-400">?곕씫泥?/span>
                        <strong className="text-sm text-neutral-800">{customerForm.phone}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-50 rounded-2xl p-5 flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-widest">{t('beauty_bookings.section_agreement')}</h4>
                    <div className="flex flex-col gap-3">
                      {agreementFields.map((field) => (
                        <label key={field.key} className="flex items-start gap-3 cursor-pointer">
                          <input
                            className="mt-1 w-4 h-4 rounded border-gray-300 text-[#bb8a78] focus:ring-[#bb8a78]"
                            type="checkbox"
                            checked={agreements[field.key as keyof AgreementState]}
                            onChange={() => handleAgreementToggle(field.key as keyof AgreementState)}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-neutral-800 leading-tight">{field.label}</span>
                            <span className="text-[11px] text-neutral-500 mt-0.5">{field.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full bg-[#bb8a78] text-white py-5 rounded-xl font-bold text-lg shadow-xl hover:bg-[#a67969] transition-all disabled:opacity-50"
                    disabled={!isBeautyConfirmSubmitEnabled || isSubmittingBeautyBooking}
                    onClick={handleBeautyBookingSubmit}
                  >
                    {isSubmittingBeautyBooking ? '泥섎━ 以?..' : '理쒖쥌 ?덉빟 ?좎껌?섍린'}
                  </button>
                  <button onClick={() => setCurrentStep(3)} className="text-neutral-400 font-medium py-2">?댁쟾: ?뺣낫 ?섏젙?섍린</button>
                </div>
              )}
            </>
          )}
        </main>

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
            showToast("?쇱떆媛 ?좏깮?섏뿀?듬땲??");
          }}
        />

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
