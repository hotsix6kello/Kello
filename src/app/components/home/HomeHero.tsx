'use client';

import { useEffect, useRef, useState } from 'react';
import { TFunction } from 'i18next';
import styles from '../../home.module.css';

interface Slide {
  title: string;
  subtitle: string;
  icon: string;
  bg: string;
  // image: string; // e.g. '/images/home/hero/slide-01.jpg' — add when assets ready
}

const SLIDES: Slide[] = [
  {
    title: 'Book K-Beauty\nin Korea,',
    subtitle: 'without the stress.',
    icon: '💅',
    bg: 'linear-gradient(140deg, #FFF0F5 0%, #FFF8FA 60%, #FDEEF5 100%)',
  },
  {
    title: 'Upload your\nstyle photo',
    subtitle: 'Tell us your date, area, and style.',
    icon: '📸',
    bg: 'linear-gradient(140deg, #FFF5F9 0%, #FFF0F8 60%, #FDE8F3 100%)',
  },
  {
    title: 'No walk-in\nwaiting',
    subtitle: 'Kello checks availability and price before payment.',
    icon: '✅',
    bg: 'linear-gradient(140deg, #FDF0F5 0%, #FFF5F8 60%, #FDEAF3 100%)',
  },
];

const BADGES = [
  { icon: '📵', label: 'No Korean calls' },
  { icon: '💰', label: 'Price checked' },
  { icon: '📸', label: 'Photo request' },
];

const INTERVAL_MS = 4200;

interface HomeHeroProps {
  t: TFunction;
}

export default function HomeHero({ t: _t }: HomeHeroProps) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % SLIDES.length);
    }, INTERVAL_MS);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goTo = (idx: number) => {
    setCurrent(idx);
    resetTimer();
  };

  const handleCta = () => {
    document.getElementById('beauty-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const slide = SLIDES[current];

  return (
    <section className={styles.heroNew}>
      {/* ── Slide area ── */}
      <div
        className={styles.heroSlideArea}
        style={{ background: slide.bg }}
      >
        {/* Decorative placeholder card — replace inner content with next/image when assets ready */}
        <div className={styles.heroCardWrap} aria-hidden="true">
          <div className={styles.heroCard}>
            {/* image: slide.image → future next/image goes here */}
            <span className={styles.heroCardIcon}>{slide.icon}</span>
          </div>
        </div>

        {/* Text */}
        <div className={styles.heroSlideText}>
          <h1 className={styles.heroSlideTitle} style={{ whiteSpace: 'pre-line' }}>
            {slide.title}
          </h1>
          <p className={styles.heroSlideSubtitle}>{slide.subtitle}</p>
        </div>
      </div>

      {/* ── Dot nav ── */}
      <div className={styles.heroDots} role="tablist" aria-label="Hero slides">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Slide ${i + 1}`}
            className={`${styles.heroDot} ${i === current ? styles.heroDotActive : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      {/* ── Trust badges ── */}
      <div className={styles.heroBadgeRow}>
        {BADGES.map(b => (
          <div key={b.label} className={styles.heroBadge}>
            <span aria-hidden="true">{b.icon}</span>
            <span>{b.label}</span>
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div className={styles.heroCtaWrap}>
        <button className={styles.heroCtaBtn} onClick={handleCta}>
          Start booking request
        </button>
        <p className={styles.heroCtaHint}>
          Upload your style photo and preferred date.
          Kello checks available salons, prices, and reservation options for you.
        </p>
      </div>
    </section>
  );
}
