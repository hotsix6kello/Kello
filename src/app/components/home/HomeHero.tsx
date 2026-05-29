'use client';

import { useEffect, useRef, useState } from 'react';
import { TFunction } from 'i18next';
import styles from '../../home.module.css';

const SLIDE_ICONS = ['💅', '📸', '✅'];
const SLIDE_BGS = [
  'linear-gradient(140deg, #FFF0F5 0%, #FFF8FA 60%, #FDEEF5 100%)',
  'linear-gradient(140deg, #FFF5F9 0%, #FFF0F8 60%, #FDE8F3 100%)',
  'linear-gradient(140deg, #FDF0F5 0%, #FFF5F8 60%, #FDEAF3 100%)',
];

const INTERVAL_MS = 4200;

interface HomeHeroProps {
  t: TFunction;
}

export default function HomeHero({ t }: HomeHeroProps) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % 3);
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

  const slides = [
    {
      title: t('home_beauty.lookbook_hero.slide1_title'),
      subtitle: t('home_beauty.lookbook_hero.slide1_subtitle'),
      icon: SLIDE_ICONS[0],
      bg: SLIDE_BGS[0],
    },
    {
      title: t('home_beauty.lookbook_hero.slide2_title'),
      subtitle: t('home_beauty.lookbook_hero.slide2_subtitle'),
      icon: SLIDE_ICONS[1],
      bg: SLIDE_BGS[1],
    },
    {
      title: t('home_beauty.lookbook_hero.slide3_title'),
      subtitle: t('home_beauty.lookbook_hero.slide3_subtitle'),
      icon: SLIDE_ICONS[2],
      bg: SLIDE_BGS[2],
    },
  ];

  const slide = slides[current];

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
        {slides.map((_, i) => (
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
    </section>
  );
}
