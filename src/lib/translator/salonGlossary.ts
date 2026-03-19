import type { GlossaryEntry, TranslationDomain, TranslationLocale } from "../translation/types.ts";
import type { SpeakerRole } from "./types.ts";

type SalonLocaleTextMap = Partial<Record<TranslationLocale, string>> & { ko: string };

interface SalonGlossaryTerm {
  id: string;
  priority?: number;
  translations: SalonLocaleTextMap;
  aliases?: Partial<Record<TranslationLocale, string[]>>;
}

interface SalonQuickPhraseTemplate {
  id: string;
  category: SalonQuickPhraseCategory;
  template: SalonLocaleTextMap;
}

export type SalonQuickPhraseCategory =
  | "greeting"
  | "consultation"
  | "haircut"
  | "color"
  | "shampoo"
  | "finish";

export interface SalonQuickPhraseButton {
  id: string;
  text: string;
}

export interface SalonQuickPhraseGroup {
  category: SalonQuickPhraseCategory;
  label: string;
  phrases: SalonQuickPhraseButton[];
}

const SALON_GLOSSARY_VERSION = 1;
const SALON_GLOSSARY_PRIORITY = 20;
const SALON_QUICK_PHRASE_LOCALES = new Set<TranslationLocale>(["ko", "en", "ja", "zh-CN"]);

export const SALON_GLOSSARY_TERMS: SalonGlossaryTerm[] = [
  {
    id: "bangs",
    translations: { ko: "앞머리", en: "bangs", ja: "前髪", "zh-CN": "刘海" },
    aliases: { en: ["fringe"] },
  },
  {
    id: "length",
    translations: { ko: "길이", en: "length", ja: "長さ", "zh-CN": "长度" },
  },
  {
    id: "volume",
    translations: { ko: "볼륨", en: "volume", ja: "ボリューム", "zh-CN": "蓬松度" },
    aliases: { ko: ["볼륨감"] },
  },
  {
    id: "allergy",
    translations: { ko: "알레르기", en: "allergy", ja: "アレルギー", "zh-CN": "过敏" },
    aliases: { ko: ["알러지"], en: ["allergies"] },
  },
  {
    id: "ingredients",
    translations: { ko: "성분", en: "ingredients", ja: "成分", "zh-CN": "成分" },
  },
  {
    id: "temperature",
    translations: { ko: "온도", en: "temperature", ja: "温度", "zh-CN": "温度" },
  },
  {
    id: "mirror",
    translations: { ko: "거울", en: "mirror", ja: "鏡", "zh-CN": "镜子" },
  },
  {
    id: "natural",
    translations: { ko: "자연스럽게", en: "natural", ja: "自然に", "zh-CN": "自然一点" },
    aliases: { en: ["natural look"] },
  },
  {
    id: "sensitive-skin",
    translations: { ko: "민감성 피부", en: "sensitive skin", ja: "敏感肌", "zh-CN": "敏感肌" },
  },
  {
    id: "scalp",
    translations: { ko: "두피", en: "scalp", ja: "頭皮", "zh-CN": "头皮" },
  },
  {
    id: "lash-extension",
    translations: { ko: "속눈썹 연장", en: "lash extension", ja: "まつげエクステ", "zh-CN": "睫毛嫁接" },
    aliases: { en: ["eyelash extension"], ko: ["속눈썹"], "zh-CN": ["睫毛"] },
  },
  {
    id: "head-spa",
    translations: { ko: "헤드 스파", en: "head spa", ja: "ヘッドスパ", "zh-CN": "头疗" },
  },
  {
    id: "skin-booster",
    translations: { ko: "스킨부스터", en: "skin booster", ja: "スキンブースター", "zh-CN": "水光针" },
  },
  {
    id: "consultation",
    translations: { ko: "상담", en: "consultation", ja: "カウンセリング", "zh-CN": "咨询" },
  },
  {
    id: "haircut",
    translations: { ko: "커트", en: "haircut", ja: "カット", "zh-CN": "剪发" },
  },
  {
    id: "color",
    translations: { ko: "염색", en: "color", ja: "カラー", "zh-CN": "染发" },
  },
  {
    id: "shampoo",
    translations: { ko: "샴푸", en: "shampoo", ja: "シャンプー", "zh-CN": "洗发" },
  },
  {
    id: "finish",
    translations: { ko: "마무리", en: "finish", ja: "仕上げ", "zh-CN": "收尾" },
  },
  {
    id: "dry",
    translations: { ko: "드라이", en: "dry", ja: "ドライ", "zh-CN": "吹干" },
  },
  {
    id: "style",
    translations: { ko: "스타일링", en: "styling", ja: "スタイリング", "zh-CN": "造型" },
  },
  {
    id: "bleach",
    translations: { ko: "탈색", en: "bleach", ja: "ブリーチ", "zh-CN": "漂色" },
  },
  {
    id: "trim",
    translations: { ko: "다듬기", en: "trim", ja: "整える", "zh-CN": "修剪" },
  },
  {
    id: "rinse",
    translations: { ko: "헹굼", en: "rinse", ja: "すすぎ", "zh-CN": "冲洗" },
  },
  {
    id: "pressure",
    translations: { ko: "압", en: "pressure", ja: "圧", "zh-CN": "力度" },
  },
];

const SALON_QUICK_PHRASE_TEMPLATES: Record<SpeakerRole, SalonQuickPhraseTemplate[]> = {
  customer: [
    {
      id: "show-length",
      category: "consultation",
      template: {
        ko: "원하는 {length}를 보여드릴게요.",
        en: "I can show you the {length} I want.",
        ja: "希望する{length}をお見せします。",
        "zh-CN": "我可以给您看我想要的{length}。",
      },
    },
    {
      id: "less-volume",
      category: "haircut",
      template: {
        ko: "이 부분은 {volume}을 조금만 넣어 주세요.",
        en: "Please give me less {volume} here.",
        ja: "この部分は{volume}を少なめにしてください。",
        "zh-CN": "这里请少一点{volume}。",
      },
    },
    {
      id: "allergy-ingredients",
      category: "consultation",
      template: {
        ko: "{allergy}가 있어서 {ingredients}을 확인하고 싶어요.",
        en: "I have an {allergy}, so I want to check the {ingredients}.",
        ja: "{allergy}があるので{ingredients}を確認したいです。",
        "zh-CN": "我有{allergy}，所以想确认一下{ingredients}。",
      },
    },
    {
      id: "temperature",
      category: "shampoo",
      template: {
        ko: "{temperature}가 조금 뜨거워요.",
        en: "The {temperature} feels a little hot.",
        ja: "{temperature}が少し熱いです。",
        "zh-CN": "{temperature}有点热。",
      },
    },
    {
      id: "natural-finish",
      category: "finish",
      template: {
        ko: "최대한 {natural} 해 주세요.",
        en: "Please make it look as {natural} as possible.",
        ja: "できるだけ{natural}してください。",
        "zh-CN": "请尽量做得{natural}。",
      },
    },
    {
      id: "greeting-hello",
      category: "greeting",
      template: {
        ko: "안녕하세요. 오늘 {consultation} 먼저 부탁드려요.",
        en: "Hello. I'd like a quick {consultation} first.",
        ja: "こんにちは。まず{consultation}をお願いします。",
        "zh-CN": "您好，我想先做个简单的{consultation}。",
      },
    },
    {
      id: "haircut-trim",
      category: "haircut",
      template: {
        ko: "{haircut}는 전체 {length}는 유지하고 끝만 {trim}해 주세요.",
        en: "For the {haircut}, please keep the overall {length} and just {trim} the ends.",
        ja: "{haircut}は全体の{length}を保って、毛先だけ{trim}してください。",
        "zh-CN": "{haircut}时请保留整体{length}，只{trim}发尾。",
      },
    },
    {
      id: "color-bleach",
      category: "color",
      template: {
        ko: "{color}만 하고 {bleach}은 원하지 않아요.",
        en: "I want only {color}, not {bleach}.",
        ja: "{color}だけで、{bleach}はしたくないです。",
        "zh-CN": "我只想做{color}，不想{bleach}。",
      },
    },
    {
      id: "shampoo-pressure",
      category: "shampoo",
      template: {
        ko: "{shampoo}할 때 {pressure}를 조금 약하게 해 주세요.",
        en: "Please make the {pressure} a bit softer during the {shampoo}.",
        ja: "{shampoo}のときは{pressure}を少し弱めにしてください。",
        "zh-CN": "{shampoo}的时候请把{pressure}放轻一点。",
      },
    },
    {
      id: "finish-dry-style",
      category: "finish",
      template: {
        ko: "{finish}는 차분한 {dry}와 {style}으로 부탁드려요.",
        en: "For the {finish}, I'd like a soft {dry} and {style}.",
        ja: "{finish}は落ち着いた{dry}と{style}でお願いします。",
        "zh-CN": "{finish}时请帮我做柔和一点的{dry}和{style}。",
      },
    },
  ],
  staff: [
    {
      id: "show-length",
      category: "consultation",
      template: {
        ko: "원하시는 {length}를 보여 주세요.",
        en: "Please show me the {length} you want.",
        ja: "ご希望の{length}を見せてください。",
        "zh-CN": "请给我看一下您想要的{length}。",
      },
    },
    {
      id: "less-volume",
      category: "haircut",
      template: {
        ko: "이 부분은 {volume}을 조금 덜 넣을까요?",
        en: "Do you want less {volume} here?",
        ja: "この部分は{volume}を少なめにしますか？",
        "zh-CN": "这里要少一点{volume}吗？",
      },
    },
    {
      id: "allergy",
      category: "consultation",
      template: {
        ko: "{allergy}가 있으신가요?",
        en: "Do you have any {allergy}?",
        ja: "{allergy}はありますか？",
        "zh-CN": "您有{allergy}吗？",
      },
    },
    {
      id: "temperature",
      category: "shampoo",
      template: {
        ko: "{temperature}는 괜찮으신가요?",
        en: "Is the {temperature} okay?",
        ja: "{temperature}は大丈夫ですか？",
        "zh-CN": "{temperature}可以吗？",
      },
    },
    {
      id: "mirror",
      category: "finish",
      template: {
        ko: "{mirror}을 한번 봐 주세요.",
        en: "Please look in the {mirror}.",
        ja: "{mirror}をご確認ください。",
        "zh-CN": "请看一下{mirror}。",
      },
    },
    {
      id: "bangs",
      category: "haircut",
      template: {
        ko: "{bangs}는 어떻게 하고 싶으세요?",
        en: "How would you like your {bangs}?",
        ja: "{bangs}はどのようになさいますか？",
        "zh-CN": "{bangs}想怎么处理呢？",
      },
    },
    {
      id: "greeting-welcome",
      category: "greeting",
      template: {
        ko: "안녕하세요. 오늘 어떤 {consultation}을 도와드릴까요?",
        en: "Hello. What kind of {consultation} can I help you with today?",
        ja: "こんにちは。今日はどのような{consultation}をご希望ですか？",
        "zh-CN": "您好，今天想做哪一种{consultation}呢？",
      },
    },
    {
      id: "consultation-check",
      category: "consultation",
      template: {
        ko: "{haircut} 전 원하는 {length}와 {style}을 먼저 확인하겠습니다.",
        en: "Before the {haircut}, I'll check your preferred {length} and {style} first.",
        ja: "{haircut}の前に、ご希望の{length}と{style}を先に確認します。",
        "zh-CN": "{haircut}之前我会先确认您想要的{length}和{style}。",
      },
    },
    {
      id: "haircut-bangs-trim",
      category: "haircut",
      template: {
        ko: "{bangs}와 옆선은 가볍게 {trim}해 드릴게요.",
        en: "I'll lightly {trim} the {bangs} and sides.",
        ja: "{bangs}とサイドは軽く{trim}します。",
        "zh-CN": "我会轻轻帮您{trim}{bangs}和两侧。",
      },
    },
    {
      id: "color-check",
      category: "color",
      template: {
        ko: "{color}만 진행할지, {bleach}도 함께 할지 확인해 주세요.",
        en: "Please confirm whether you'd like only {color} or {bleach} as well.",
        ja: "{color}のみか、{bleach}も一緒にするかご確認ください。",
        "zh-CN": "请确认您是只做{color}，还是连{bleach}一起做。",
      },
    },
    {
      id: "shampoo-rinse",
      category: "shampoo",
      template: {
        ko: "{shampoo} 후 {rinse} 온도와 {pressure}는 괜찮으신가요?",
        en: "After the {shampoo}, is the {rinse} temperature and {pressure} comfortable?",
        ja: "{shampoo}後の{rinse}の温度と{pressure}は大丈夫ですか？",
        "zh-CN": "{shampoo}后{rinse}的温度和{pressure}可以吗？",
      },
    },
    {
      id: "finish-dry-style",
      category: "finish",
      template: {
        ko: "{finish}는 {dry}와 {style}까지 마무리해 드리겠습니다.",
        en: "For the {finish}, I'll complete the {dry} and {style} as well.",
        ja: "{finish}は{dry}と{style}まで仕上げます。",
        "zh-CN": "{finish}时我会帮您把{dry}和{style}一起完成。",
      },
    },
  ],
};

export const SALON_QUICK_PHRASE_CATEGORY_LABELS: Record<SalonQuickPhraseCategory, string> = {
  greeting: "Greeting",
  consultation: "Consultation",
  haircut: "Haircut",
  color: "Color",
  shampoo: "Shampoo",
  finish: "Finish",
};

export function buildSalonGlossaryEntries(
  sourceLocale: TranslationLocale,
  targetLocale: TranslationLocale,
  domain: TranslationDomain = "beauty",
): GlossaryEntry[] {
  if (domain !== "beauty" || sourceLocale === targetLocale) {
    return [];
  }

  return SALON_GLOSSARY_TERMS.flatMap((term) => {
    const sourceTerms = [term.translations[sourceLocale], ...(term.aliases?.[sourceLocale] ?? [])].filter(
      (value): value is string => Boolean(value),
    );
    const targetTerm = term.translations[targetLocale];

    if (!targetTerm) {
      return [];
    }

    return sourceTerms.map((sourceTerm, index) => ({
      id: `salon-${term.id}-${sourceLocale}-${targetLocale}-${index}`,
      domain,
      sourceLocale,
      targetLocale,
      sourceTerm,
      targetTerm,
      priority: term.priority ?? SALON_GLOSSARY_PRIORITY,
      version: SALON_GLOSSARY_VERSION,
      isActive: true,
      notes: "default_salon_glossary",
      updatedBy: "system",
    }));
  });
}

export function mergeSalonGlossaryEntries(
  sourceLocale: TranslationLocale,
  targetLocale: TranslationLocale,
  repositoryEntries: GlossaryEntry[],
  domain: TranslationDomain = "beauty",
) {
  const defaults = buildSalonGlossaryEntries(sourceLocale, targetLocale, domain);
  const filteredRepositoryEntries = repositoryEntries.filter((entry) => entry.sourceLocale === sourceLocale);
  const merged = new Map<string, GlossaryEntry>();

  defaults.forEach((entry) => {
    merged.set(`${entry.sourceLocale}:${entry.targetLocale}:${entry.sourceTerm}`, entry);
  });

  filteredRepositoryEntries.forEach((entry) => {
    merged.set(`${entry.sourceLocale}:${entry.targetLocale}:${entry.sourceTerm}`, entry);
  });

  return [...merged.values()];
}

export function getSalonQuickPhraseTexts(role: SpeakerRole, locale: TranslationLocale) {
  if (!SALON_QUICK_PHRASE_LOCALES.has(locale)) {
    return [];
  }

  return SALON_QUICK_PHRASE_TEMPLATES[role].map((phrase) => renderPhraseTemplate(phrase.template[locale] ?? phrase.template.ko, locale));
}

export function getSalonQuickPhraseGroups(role: SpeakerRole, locale: TranslationLocale): SalonQuickPhraseGroup[] {
  if (!SALON_QUICK_PHRASE_LOCALES.has(locale)) {
    return [];
  }

  const grouped = new Map<SalonQuickPhraseCategory, SalonQuickPhraseButton[]>();

  SALON_QUICK_PHRASE_TEMPLATES[role].forEach((phrase) => {
    const text = renderPhraseTemplate(phrase.template[locale] ?? phrase.template.ko, locale);
    const current = grouped.get(phrase.category) ?? [];
    current.push({
      id: phrase.id,
      text,
    });
    grouped.set(phrase.category, current);
  });

  return (Object.keys(SALON_QUICK_PHRASE_CATEGORY_LABELS) as SalonQuickPhraseCategory[]).map((category) => ({
    category,
    label: SALON_QUICK_PHRASE_CATEGORY_LABELS[category],
    phrases: grouped.get(category) ?? [],
  }));
}

function renderPhraseTemplate(template: string, locale: TranslationLocale) {
  return template.replace(/\{([a-z0-9-]+)\}/gi, (_match, termId) => {
    return getSalonTermTranslation(termId, locale);
  });
}

export function getSalonTermTranslation(termId: string, locale: TranslationLocale) {
  const term = SALON_GLOSSARY_TERMS.find((item) => item.id === termId);
  if (!term) {
    return termId;
  }

  return term.translations[locale] ?? term.translations.ko;
}
