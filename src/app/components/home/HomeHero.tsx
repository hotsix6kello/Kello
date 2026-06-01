'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { TFunction } from 'i18next';
import styles from '../../home.module.css';

const INTERVAL_MS = 3000;

const HERO_SLIDES = [
  { src: '/images/home/hero/hair-01.png', category: '헤어' },
  { src: '/images/home/hero/hair-02.png', category: '헤어' },
  { src: '/images/home/hero/hair-03.png', category: '헤어' },
  { src: '/images/home/hero/hair-04.png', category: '헤어' },
  { src: '/images/home/hero/nail-01.png', category: '네일' },
  { src: '/images/home/hero/nail-02.png', category: '네일' },
  { src: '/images/home/hero/nail-03.png', category: '네일' },
  { src: '/images/home/hero/nail-04.png', category: '네일' },
  { src: '/images/home/hero/makeup-01.png', category: '메이크업' },
  { src: '/images/home/hero/makeup-02.png', category: '메이크업' },
  { src: '/images/home/hero/makeup-03.png', category: '메이크업' },
  { src: '/images/home/hero/makeup-04.png', category: '메이크업' },
  { src: '/images/home/hero/eyelash-01.png', category: '속눈썹' },
  { src: '/images/home/hero/eyelash-02.png', category: '속눈썹' },
  { src: '/images/home/hero/eyelash-03.png', category: '속눈썹' },
  { src: '/images/home/hero/eyelash-04.png', category: '속눈썹' },
];

// 무한 루프: [마지막 복사본, ...원본 16장, 첫 번째 복사본]
const EXTENDED = [
  HERO_SLIDES[HERO_SLIDES.length - 1],
  ...HERO_SLIDES,
  HERO_SLIDES[0],
];

interface HomeHeroProps {
  t: TFunction;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function HomeHero(_props: HomeHeroProps) {
  const [pos, setPos] = useState(1);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimate(true);
      setPos(p => p + 1);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const onTransitionEnd = () => {
    if (pos >= HERO_SLIDES.length + 1) {
      setAnimate(false);
      setPos(1);
    } else if (pos <= 0) {
      setAnimate(false);
      setPos(HERO_SLIDES.length);
    }
  };

  return (
    <section className={styles.heroNew}>
      <div className={styles.heroFullCarousel}>
        <div
          className={styles.heroSliderTrack}
          style={{
            transform: `translateX(-${pos * 100}%)`,
            transition: animate ? 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {EXTENDED.map((s, i) => (
            <div key={`${s.src}-${i}`} className={styles.heroSlide}>
              <Image
                src={s.src}
                alt={s.category}
                fill
                sizes="(max-width: 440px) 100vw, 440px"
                className={styles.heroFullImg}
                priority={i < 3}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
