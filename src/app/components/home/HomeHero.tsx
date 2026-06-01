'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { TFunction } from 'i18next';
import styles from '../../home.module.css';

const INTERVAL_MS = 3000;

const HERO_SLIDES = [
  { src: '/images/home/hero/hair-01.png', category: '헤어', badge: '여신 웨이브' },
  { src: '/images/home/hero/hair-02.png', category: '헤어', badge: '여신 웨이브' },
  { src: '/images/home/hero/hair-03.png', category: '헤어', badge: '여신 웨이브' },
  { src: '/images/home/hero/hair-04.png', category: '헤어', badge: '여신 웨이브' },
  { src: '/images/home/hero/nail-01.png', category: '네일', badge: '글로시 네일' },
  { src: '/images/home/hero/nail-02.png', category: '네일', badge: '글로시 네일' },
  { src: '/images/home/hero/nail-03.png', category: '네일', badge: '글로시 네일' },
  { src: '/images/home/hero/nail-04.png', category: '네일', badge: '글로시 네일' },
  { src: '/images/home/hero/makeup-01.png', category: '메이크업', badge: '아이돌 메이크업' },
  { src: '/images/home/hero/makeup-02.png', category: '메이크업', badge: '아이돌 메이크업' },
  { src: '/images/home/hero/makeup-03.png', category: '메이크업', badge: '아이돌 메이크업' },
  { src: '/images/home/hero/makeup-04.png', category: '메이크업', badge: '아이돌 메이크업' },
  { src: '/images/home/hero/eyelash-01.png', category: '속눈썹', badge: '내추럴 래쉬' },
  { src: '/images/home/hero/eyelash-02.png', category: '속눈썹', badge: '내추럴 래쉬' },
  { src: '/images/home/hero/eyelash-03.png', category: '속눈썹', badge: '내추럴 래쉬' },
  { src: '/images/home/hero/eyelash-04.png', category: '속눈썹', badge: '내추럴 래쉬' },
];

const CATEGORIES = ['헤어', '네일', '메이크업', '속눈썹'];

interface HomeHeroProps {
  t: TFunction;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function HomeHero(_props: HomeHeroProps) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % HERO_SLIDES.length);
    }, INTERVAL_MS);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goToCategory = (catIdx: number) => {
    const firstIdx = HERO_SLIDES.findIndex(s => s.category === CATEGORIES[catIdx]);
    if (firstIdx !== -1) {
      setCurrent(firstIdx);
      resetTimer();
    }
  };

  const slide = HERO_SLIDES[current];
  const activeCatIdx = CATEGORIES.indexOf(slide.category);

  return (
    <section className={styles.heroNew}>
      {/* Full-width photo carousel */}
      <div className={styles.heroFullCarousel}>
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.category}
          fill
          sizes="(max-width: 440px) 100vw, 440px"
          className={styles.heroFullImg}
          priority={current === 0}
        />
        <div className={styles.heroFullOverlay} />
        <div className={styles.heroFullBadge}>
          ✨ {slide.category} / {slide.badge}
        </div>
      </div>

      {/* Category dot nav */}
      <div className={styles.heroDots} role="tablist" aria-label="Hero categories">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat}
            role="tab"
            aria-selected={i === activeCatIdx}
            aria-label={cat}
            className={`${styles.heroDot} ${i === activeCatIdx ? styles.heroDotActive : ''}`}
            onClick={() => goToCategory(i)}
          />
        ))}
      </div>
    </section>
  );
}
