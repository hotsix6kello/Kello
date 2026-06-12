'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { resolveCanonicalLocale } from '@/lib/i18n/locales';
import { Star, ShieldCheck, MessageCircle, Lock } from 'lucide-react';
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
  iconType: 'star' | 'shield' | 'message' | 'lock';
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
    title: '한국어 몰라도,<br/><span style="color: #FF3566">K-뷰티 예약은 Kello로</span>',
    subtitle: '헤어·네일·피부관리 예약부터 번역 상담까지 한 번에 도와드려요.',
    primaryCta: '지금 예약하기',
    secondaryCta: '번역 요청하기',
  },
  'en-US': {
    title: 'Book <span style="color: #FF3566">K-Beauty</span> in Korea,<br/>even without speaking Korean',
    subtitle: 'From hair and nails to skincare and translation support, Kello helps you book with ease.',
    primaryCta: 'Book Now',
    secondaryCta: 'Ask for Translation',
  },
  'ja-JP': {
    title: '韓国語がわからなくても、<br/><span style="color: #FF3566">Kビューティー予約はKello로</span>',
    subtitle: 'ヘア・ネイル・スキンケア의 예약부터 번역 상담까지, Kello가 지원합니다.',
    primaryCta: '今すぐ予約',
    secondaryCta: '翻訳を依頼',
  },
  'zh-CN': {
    title: '不懂韩语也可以，<br/>用 <span style="color: #FF3566">Kello</span> 预约韩式美妆',
    subtitle: '从发型、美甲、皮肤管理预约到翻译咨询，Kello 一次帮你完成。',
    primaryCta: '立即预约',
    secondaryCta: '请求翻译',
  },
  'zh-TW': {
    title: '不懂韓語也可以，<br/>用 <span style="color: #FF3566">Kello</span> 預約韓式美妝',
    subtitle: '從髮型、美甲、皮膚管理預約到翻譯諮詢，Kello 一次幫你完成。',
    primaryCta: '立即預約',
    secondaryCta: '請求翻譯',
  },
  'vi-VN': {
    title: 'Không biết tiếng Hàn,<br/>vẫn đặt lịch <span style="color: #FF3566">K-Beauty với Kello</span>',
    subtitle: 'Từ tóc, nail, chăm sóc da đến hỗ trợ dịch thuật, Kello giúp bạn đặt lịch dễ dàng.',
    primaryCta: 'Đặt lịch ngay',
    secondaryCta: 'Yêu cầu dịch thuật',
  },
  'th-TH': {
    title: 'ไม่รู้ภาษาเกาหลี<br/>ก็จอง <span style="color: #FF3566">K-Beauty ผ่าน Kello</span> ได้',
    subtitle: 'ตั้งแต่ทำผม ทำเล็บ ดูแลผิว ไปจนถึงบริการช่วยแปล Kello ช่วยให้จองได้ง่ายขึ้น',
    primaryCta: 'จองตอนนี้',
    secondaryCta: 'ขอความช่วยเหลือด้านการแปล',
  },
  'ar-SA': {
    title: 'احجزي <span style="color: #FF3566">K-Beauty</span> في كوريا<br/>مع Kello حتى بدون الكورية',
    subtitle: 'من الشعر والأظافر والعناية بالبشرة إلى دعم الترجمة، يساعدك Kello على الحجز بسهولة.',
    primaryCta: 'احجزي الآن',
    secondaryCta: 'اطلبي الترجمة',
  },
};

const TRUST_POINTS: Record<string, TrustPoint[]> = {
  'ko-KR': [
    { iconType: 'star', text: '100%\n실제 후기' },
    { iconType: 'shield', text: '예약 즉시\n확정' },
    { iconType: 'message', text: '전문 통역\n지원' },
    { iconType: 'lock', text: '안심 결제\n시스템' },
  ],
  'en-US': [
    { iconType: 'star', text: '100%\nReal Reviews' },
    { iconType: 'shield', text: 'Instant\nConfirmation' },
    { iconType: 'message', text: 'Professional\nTranslation' },
    { iconType: 'lock', text: 'Secure\nPayment' },
  ],
  'ja-JP': [
    { iconType: 'star', text: '100%\nリアルレビュー' },
    { iconType: 'shield', text: '即時予約\n確定' },
    { iconType: 'message', text: '専門通訳\nサポート' },
    { iconType: 'lock', text: '安心決済\nシステム' },
  ],
  'zh-CN': [
    { iconType: 'star', text: '100%\n真实评价' },
    { iconType: 'shield', text: '即时\n确认' },
    { iconType: 'message', text: '专业翻译\n支持' },
    { iconType: 'lock', text: '安全支付\n系统' },
  ],
  'zh-TW': [
    { iconType: 'star', text: '100%\n真實評價' },
    { iconType: 'shield', text: '即時\n確認' },
    { iconType: 'message', text: '專業翻譯\n支援' },
    { iconType: 'lock', text: '安全支付\n系統' },
  ],
  'vi-VN': [
    { iconType: 'star', text: '100%\nĐánh giá thật' },
    { iconType: 'shield', text: 'Xác nhận\nngay' },
    { iconType: 'message', text: 'Hỗ trợ\nphiên dịch' },
    { iconType: 'lock', text: 'Thanh toán\nan toàn' },
  ],
  'th-TH': [
    { iconType: 'star', text: 'รีวิว\nจริง 100%' },
    { iconType: 'shield', text: 'ยืนยัน\nทันที' },
    { iconType: 'message', text: 'ล่ามมืออาชีพ\nช่วยเหลือ' },
    { iconType: 'lock', text: 'ระบบชำระเงิน\nปลอดภัย' },
  ],
  'ar-SA': [
    { iconType: 'star', text: '100%\nتقييمات حقيقية' },
    { iconType: 'shield', text: 'تأكيد\nفوري' },
    { iconType: 'message', text: 'ترجمة\nاحترافية' },
    { iconType: 'lock', text: 'دفع\nآمن' },
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

  function renderTrustIcon(type: string) {
    const size = 20;
    const strokeColor = '#FF3566';
    switch (type) {
      case 'star':
        return <Star size={size} stroke={strokeColor} strokeWidth={1.5} fill="none" />;
      case 'shield':
        return <ShieldCheck size={size} stroke={strokeColor} strokeWidth={1.5} fill="none" />;
      case 'message':
        return <MessageCircle size={size} stroke={strokeColor} strokeWidth={1.5} fill="none" />;
      case 'lock':
        return <Lock size={size} stroke={strokeColor} strokeWidth={1.5} fill="none" />;
      default:
        return null;
    }
  }

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
            dangerouslySetInnerHTML={{ __html: copy.title }}
          />
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
            <span className={styles.heroBannerTrustIcon}>{renderTrustIcon(tp.iconType)}</span>
            <span className={styles.heroBannerTrustText}>{tp.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
