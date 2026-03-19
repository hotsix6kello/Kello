import { TRANSLATION_LOCALES } from "../translation/config.ts";
import type { BeautyServiceCatalogItem, ConciergeLocale, SpeakerRole } from "./types.ts";

type LocaleTextMap = Partial<Record<ConciergeLocale, string>> & { ko: string };

export const BEAUTY_SERVICE_CATALOG: BeautyServiceCatalogItem[] = [
  {
    id: "lash-extension",
    category: "beauty",
    canonicalName: "속눈썹 연장",
    aliases: {
      ko: ["속눈썹 연장", "속눈썹"],
      en: ["lash extension", "eyelash extension", "lashes"],
      ja: ["まつげエクステ", "まつげ"],
      "zh-CN": ["睫毛嫁接", "睫毛"],
    },
    priceKrw: 79000,
    durationMinutes: 60,
    cancellationPolicy: "예약 24시간 전까지 무료 취소, 이후 취소 시 30% 수수료가 발생합니다.",
    availableSlots: [
      "2026-03-18T11:00",
      "2026-03-18T14:00",
      "2026-03-19T10:30",
      "2026-03-19T16:00",
    ],
  },
  {
    id: "skin-boost",
    category: "beauty",
    canonicalName: "스킨부스터",
    aliases: {
      ko: ["스킨부스터", "물광주사"],
      en: ["skin booster", "hydration injection"],
      ja: ["スキンブースター", "水光注射"],
      "zh-CN": ["水光针", "肌肤补水"],
    },
    priceKrw: 149000,
    durationMinutes: 45,
    cancellationPolicy: "예약 24시간 전까지 무료 취소, 이후 취소 시 50% 수수료가 발생합니다.",
    availableSlots: [
      "2026-03-18T15:30",
      "2026-03-19T12:00",
      "2026-03-19T15:00",
    ],
  },
  {
    id: "scalp-care",
    category: "beauty",
    canonicalName: "두피 케어",
    aliases: {
      ko: ["두피 케어", "헤드 스파"],
      en: ["scalp care", "head spa"],
      ja: ["頭皮ケア", "ヘッドスパ"],
      "zh-CN": ["头皮护理", "头疗"],
    },
    priceKrw: 99000,
    durationMinutes: 50,
    cancellationPolicy: "예약 12시간 전까지 무료 취소 가능합니다.",
    availableSlots: [
      "2026-03-18T13:00",
      "2026-03-20T10:00",
      "2026-03-20T17:00",
    ],
  },
];

export const QUICK_INTERPRETER_PHRASES: Record<
  "customer" | "staff",
  Array<{ label: string; text: string }>
> = {
  customer: [
    { label: "통증 있어요", text: "조금 아프면 바로 말해 주세요." },
    { label: "강도 약하게", text: "강도를 조금 약하게 해 주세요." },
    { label: "예약 확인", text: "제 예약 시간과 시술 내용을 확인해 주세요." },
  ],
  staff: [
    { label: "곧 시작합니다", text: "곧 시술을 시작하겠습니다. 불편하면 바로 말씀해 주세요." },
    { label: "사후관리 안내", text: "오늘은 뜨거운 사우나와 강한 마사지, 음주는 피해 주세요." },
    { label: "결제 안내", text: "이 시술은 오늘 결제 금액과 예약 변경 규정이 함께 적용됩니다." },
  ],
};

export const INTERPRETER_SUPPORTED_LOCALES: ConciergeLocale[] = [...TRANSLATION_LOCALES];

export const SALON_QUICK_PHRASES: Record<
  SpeakerRole,
  Array<{
    id: string;
    translations: LocaleTextMap;
  }>
> = {
  customer: [
    {
      id: "show-length",
      translations: {
        ko: "원하는 길이를 보여드릴게요.",
        en: "I can show you the length I want.",
        ja: "希望する長さをお見せします。",
        "zh-CN": "我可以给您看我想要的长度。",
      },
    },
    {
      id: "less-volume",
      translations: {
        ko: "이 부분은 볼륨을 조금만 넣어 주세요.",
        en: "Please give me less volume here.",
        ja: "この部分はボリュームを少なめにしてください。",
        "zh-CN": "这里请少一点蓬松度。",
      },
    },
    {
      id: "allergy",
      translations: {
        ko: "알레르기가 있어서 성분을 확인하고 싶어요.",
        en: "I have allergies, so I want to check the ingredients.",
        ja: "アレルギーがあるので成分を確認したいです。",
        "zh-CN": "我有过敏，所以想确认一下成分。",
      },
    },
    {
      id: "temperature",
      translations: {
        ko: "온도가 조금 뜨거워요.",
        en: "The temperature feels a little hot.",
        ja: "温度が少し熱いです。",
        "zh-CN": "温度有点热。",
      },
    },
    {
      id: "natural-finish",
      translations: {
        ko: "최대한 자연스럽게 해 주세요.",
        en: "Please make it look as natural as possible.",
        ja: "できるだけ自然にしてください。",
        "zh-CN": "请尽量做得自然一点。",
      },
    },
  ],
  staff: [
    {
      id: "show-length",
      translations: {
        ko: "원하시는 길이를 보여 주세요.",
        en: "Please show me the length you want.",
        ja: "ご希望の長さを見せてください。",
        "zh-CN": "请给我看一下您想要的长度。",
      },
    },
    {
      id: "less-volume",
      translations: {
        ko: "이 부분은 볼륨을 조금 덜 넣을까요?",
        en: "Do you want less volume here?",
        ja: "この部分はボリュームを少なめにしますか？",
        "zh-CN": "这里要少一点蓬松度吗？",
      },
    },
    {
      id: "please-wait",
      translations: {
        ko: "잠시만 기다려 주세요.",
        en: "Please wait a moment.",
        ja: "少々お待ちください。",
        "zh-CN": "请稍等一下。",
      },
    },
    {
      id: "allergy",
      translations: {
        ko: "알레르기가 있으신가요?",
        en: "Do you have any allergies?",
        ja: "アレルギーはありますか？",
        "zh-CN": "您有过敏吗？",
      },
    },
    {
      id: "temperature",
      translations: {
        ko: "온도는 괜찮으신가요?",
        en: "Is the temperature okay?",
        ja: "温度は大丈夫ですか？",
        "zh-CN": "温度可以吗？",
      },
    },
    {
      id: "mirror",
      translations: {
        ko: "거울을 한번 봐 주세요.",
        en: "Please look in the mirror.",
        ja: "鏡をご確認ください。",
        "zh-CN": "请看一下镜子。",
      },
    },
    {
      id: "bangs",
      translations: {
        ko: "앞머리는 어떻게 하고 싶으세요?",
        en: "How would you like your bangs?",
        ja: "前髪はどのようになさいますか？",
        "zh-CN": "刘海想怎么处理呢？",
      },
    },
  ],
};

export function findServiceByName(query: string) {
  const lowered = query.toLowerCase();

  return (
    BEAUTY_SERVICE_CATALOG.find((service) => {
      return Object.values(service.aliases).some((aliases) => {
        return aliases.some((alias) => lowered.includes(alias.toLowerCase()));
      });
    }) ?? null
  );
}

export function getLocaleLabel(locale: ConciergeLocale) {
  const labels: Record<ConciergeLocale, string> = {
    ko: "한국어",
    en: "English",
    ja: "日本語",
    "zh-CN": "简体中文",
    "zh-HK": "繁體中文",
    vi: "Tiếng Việt",
    th: "ไทย",
    id: "Bahasa Indonesia",
    ms: "Bahasa Melayu",
  };

  return labels[locale];
}

export function getLocaleDisplayLabel(locale: ConciergeLocale) {
  const labels: Record<ConciergeLocale, string> = {
    ko: "Korean (KO)",
    en: "English (EN)",
    ja: "Japanese (JA)",
    "zh-CN": "Chinese Simplified (ZH-CN)",
    "zh-HK": "Chinese Traditional (ZH-HK)",
    vi: "Vietnamese (VI)",
    th: "Thai (TH)",
    id: "Indonesian (ID)",
    ms: "Malay (MS)",
  };

  return labels[locale];
}

export function getSpeechLocale(locale: ConciergeLocale) {
  const map: Record<ConciergeLocale, string> = {
    ko: "ko-KR",
    en: "en-US",
    ja: "ja-JP",
    "zh-CN": "zh-CN",
    "zh-HK": "zh-HK",
    vi: "vi-VN",
    th: "th-TH",
    id: "id-ID",
    ms: "ms-MY",
  };

  return map[locale];
}

export function getQuickPhraseText(
  phrase: { translations: LocaleTextMap },
  locale: ConciergeLocale,
) {
  return phrase.translations[locale] ?? phrase.translations.ko;
}
