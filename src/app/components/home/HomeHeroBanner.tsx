'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { resolveCanonicalLocale } from '@/lib/i18n/locales';
import styles from '../../home.module.css';

/* ────────────────────────────────────────────────────────── */
/*  Types                                                    */
/* ────────────────────────────────────────────────────────── */
interface HeroCopy {
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
}

interface TrustPoint {
  icon: string;
  text: string;
}

/* ────────────────────────────────────────────────────────── */
/*  Data                                                     */
/* ────────────────────────────────────────────────────────── */

// resolveCanonicalLocale가 반환하는 short code → hero locale 코드 매핑
const CODE_TO_HERO_LOCALE: Record<string, string> = {
  ko:      'ko-KR',
  en:      'en-US',
  ja:      'ja-JP',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  vi:      'vi-VN',
  th:      'th-TH',
  ar:      'ar-SA',
};

const HERO_COPY: Record<string, HeroCopy> = {
  'ko-KR': {
    title: '한국어 몰라도,\nK-뷰티 예약은 KELLO로',
    subtitle: '헤어·네일·피부관리 예약부터 번역 상담까지 한 번에 도와드려요.',
    primaryCta: '지금 예약하기',
    secondaryCta: '번역 요청하기',
  },
  'en-US': {
    title: 'Book K-Beauty in Korea,\neven without speaking Korean',
    subtitle: 'From hair and nails to skincare and translation support, KELLO helps you book with ease.',
    primaryCta: 'Book Now',
    secondaryCta: 'Ask for Translation',
  },
  'ja-JP': {
    title: '韓国語がわからなくても、\nKビューティー予約はKELLOで',
    subtitle: 'ヘア・ネイル・スキンケア의 예약부터 번역 상담까지, KELLO가 지원합니다.',
    primaryCta: '今すぐ予約',
    secondaryCta: '翻訳を依頼',
  },
  'zh-CN': {
    title: '不懂韩语也可以，\n用 KELLO 预约韩式美妆',
    subtitle: '从发型、美甲、皮肤管理预约到翻译咨询，KELLO 一次帮你完成。',
    primaryCta: '立即预约',
    secondaryCta: '请求翻译',
  },
  'zh-TW': {
    title: '不懂韓語也可以，\n用 KELLO 預約韓式美妝',
    subtitle: '從髮型、美甲、皮膚管理預約到翻譯諮詢，KELLO 一次幫你完成。',
    primaryCta: '立即預約',
    secondaryCta: '請求翻譯',
  },
  'vi-VN': {
    title: 'Không biết tiếng Hàn,\nvẫn đặt lịch K-Beauty với KELLO',
    subtitle: 'Từ tóc, nail, chăm sóc da đến hỗ trợ dịch thuật, KELLO giúp bạn đặt lịch dễ dàng.',
    primaryCta: 'Đặt lịch ngay',
    secondaryCta: 'Yêu cầu dịch thuật',
  },
  'th-TH': {
    title: 'ไม่รู้ภาษาเกาหลี\nก็จอง K-Beauty ผ่าน KELLO ได้',
    subtitle: 'ตั้งแต่ทำผม ทำเล็บ ดูแลผิว ไปจนถึงบริการช่วยแปล KELLO ช่วยให้จองได้ง่ายขึ้น',
    primaryCta: 'จองตอนนี้',
    secondaryCta: 'ขอความช่วยเหลือด้านการแปล',
  },
  'ar-SA': {
    title: 'احجزي K-Beauty في كوريا\nمع KELLO حتى بدون الكورية',
    subtitle: 'من الشعر والأظافر والعناية بالبشرة إلى دعم الترجمة، يساعدك KELLO على الحجز بسهولة.',
    primaryCta: 'احجزي الآن',
    secondaryCta: 'اطلبي الترجمة',
  },
};

const TRUST_POINTS: Record<string, TrustPoint[]> = {
  'ko-KR': [
    { icon: '🤖', text: 'AI 번역 지원' },
    { icon: '💳', text: '100% 선결제' },
    { icon: '🌏', text: '외국인 친화 샵' },
  ],
  'en-US': [
    { icon: '🤖', text: 'AI Translation' },
    { icon: '💳', text: '100% Prepaid' },
    { icon: '🌏', text: 'Foreigner-Friendly' },
  ],
  'ja-JP': [
    { icon: '🤖', text: 'AI翻訳サポート' },
    { icon: '💳', text: '100%前払い' },
    { icon: '🌏', text: '外国人対応ショップ' },
  ],
  'zh-CN': [
    { icon: '🤖', text: 'AI翻译支持' },
    { icon: '💳', text: '100%预付款' },
    { icon: '🌏', text: '外国人友好门店' },
  ],
  'zh-TW': [
    { icon: '🤖', text: 'AI翻譯支援' },
    { icon: '💳', text: '100%預付款' },
    { icon: '🌏', text: '外國人友善門店' },
  ],
  'vi-VN': [
    { icon: '🤖', text: 'Hỗ trợ AI dịch thuật' },
    { icon: '💳', text: 'Thanh toán trước 100%' },
    { icon: '🌏', text: 'Thân thiện với người nước ngoài' },
  ],
  'th-TH': [
    { icon: '🤖', text: 'การแปลด้วย AI' },
    { icon: '💳', text: 'ชำระล่วงหน้า 100%' },
    { icon: '🌏', text: 'ร้านที่เป็นมิตรกับชาวต่างชาติ' },
  ],
  'ar-SA': [
    { icon: '🤖', text: 'دعم الترجمة بالذكاء الاصطناعي' },
    { icon: '💳', text: 'دفع مسبق 100%' },
    { icon: '🌏', text: 'صالونات ودية للأجانب' },
  ],
};

const DEFAULT_LOCALE = 'en-US';

/* ────────────────────────────────────────────────────────── */
/*  Component                                                */
/* ────────────────────────────────────────────────────────── */
export default function HomeHeroBanner() {
  const { i18n } = useTranslation('common');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // 하이드레이션 오류를 막기 위해 마운트 전에는 빈 배너 래퍼만 렌더링
    return <div className={styles.heroBannerWrap} />;
  }

  // 최상단 언어 선택값 → hero locale 코드
  const canonicalCode = resolveCanonicalLocale(i18n.language, 'en');
  const heroLocale = CODE_TO_HERO_LOCALE[canonicalCode] ?? DEFAULT_LOCALE;

  const copy: HeroCopy = HERO_COPY[heroLocale] ?? HERO_COPY[DEFAULT_LOCALE];
  const trustPoints: TrustPoint[] = TRUST_POINTS[heroLocale] ?? TRUST_POINTS[DEFAULT_LOCALE];
  const isRTL = heroLocale === 'ar-SA';

  return (
    <div className={styles.heroBannerSection}>
      {/* ── 배너 이미지 + 텍스트 레이어 ── */}
      <div className={styles.heroBannerWrap}>
        {/* 배경 이미지 */}
        <Image
          src="/images/home/hero-banner.png"
          alt="Kello Beauty Banner"
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'right center' }}
        />

        {/* 왼쪽 그라디언트 오버레이 */}
        <div className={styles.heroBannerOverlay} />

        {/* 텍스트 레이어 */}
        <div
          className={styles.heroBannerText}
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          <h1
            className={styles.heroBannerTitle}
            style={{ whiteSpace: 'pre-line' }}
          >
            {copy.title}
          </h1>
          <p className={styles.heroBannerSubtitle}>{copy.subtitle}</p>
          <div
            className={styles.heroBannerCtaRow}
            style={{ justifyContent: isRTL ? 'flex-end' : 'flex-start' }}
          >
            <button type="button" className={styles.heroBannerCtaPrimary}>
              {copy.primaryCta}
            </button>
            <button type="button" className={styles.heroBannerCtaSecondary}>
              {copy.secondaryCta}
            </button>
          </div>
        </div>
      </div>

      {/* ── 신뢰 포인트 ── */}
      <div className={styles.heroBannerTrustRow} dir={isRTL ? 'rtl' : 'ltr'}>
        {trustPoints.map((tp, i) => (
          <div key={i} className={styles.heroBannerTrustItem}>
            <span className={styles.heroBannerTrustIcon}>{tp.icon}</span>
            <span className={styles.heroBannerTrustText}>{tp.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
