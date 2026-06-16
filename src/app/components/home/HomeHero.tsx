'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { TFunction } from 'i18next';
import styles from '../../home.module.css';

const INTERVAL_MS = 4000;

const CATEGORIES = ['헤어', '네일', '메이크업', '속눈썹'] as const;
type HeroCategory = typeof CATEGORIES[number];

interface HeroSlide {
  src: string;
  category: HeroCategory;
  caption: string;
}

const HERO_SLIDES: HeroSlide[] = [
  { src: '/images/home/hero/hair-01.png', category: '헤어', caption: '웨이브 헤어' },
  { src: '/images/home/hero/hair-02.png', category: '헤어', caption: '단발 헤어' },
  { src: '/images/home/hero/hair-03.png', category: '헤어', caption: '컬리 헤어' },
  { src: '/images/home/hero/hair-04.png', category: '헤어', caption: '댄디 헤어' },
  { src: '/images/home/hero/nail-01.png', category: '네일', caption: '아이스 네일' },
  { src: '/images/home/hero/nail-02.png', category: '네일', caption: '누드 네일' },
  { src: '/images/home/hero/nail-03.png', category: '네일', caption: '민트 네일' },
  { src: '/images/home/hero/nail-04.png', category: '네일', caption: '블랙 네일' },
  { src: '/images/home/hero/makeup-01.png', category: '메이크업', caption: '레드립 형' },
  { src: '/images/home/hero/makeup-02.png', category: '메이크업', caption: '청순 형' },
  { src: '/images/home/hero/makeup-03.png', category: '메이크업', caption: '아이돌 형' },
  { src: '/images/home/hero/makeup-04.png', category: '메이크업', caption: '글로우 형' },
  { src: '/images/home/hero/eyelash-01.png', category: '속눈썹', caption: '내추럴 형' },
  { src: '/images/home/hero/eyelash-02.png', category: '속눈썹', caption: '볼륨 형' },
  { src: '/images/home/hero/eyelash-03.png', category: '속눈썹', caption: '컬링 형' },
  { src: '/images/home/hero/eyelash-04.png', category: '속눈썹', caption: '클린 형' },
];

interface HomeHeroProps {
  t: TFunction;
}

const wrapIndex = (index: number) => (index + HERO_SLIDES.length) % HERO_SLIDES.length;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function HomeHero(_props: HomeHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [timerVersion, setTimerVersion] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex(index => wrapIndex(index + 1));
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [timerVersion]);

  const currentSlide = HERO_SLIDES[activeIndex];
  const activeCategoryIndex = CATEGORIES.indexOf(currentSlide.category);
  const prevIndex = wrapIndex(activeIndex - 1);
  const nextIndex = wrapIndex(activeIndex + 1);

  const jumpToSlide = (nextIndexValue: number) => {
    setActiveIndex(wrapIndex(nextIndexValue));
    setTimerVersion(version => version + 1);
  };

  const handleCategoryClick = (category: HeroCategory) => {
    const targetIndex = HERO_SLIDES.findIndex(slide => slide.category === category);

    if (targetIndex === -1) {
      return;
    }

    jumpToSlide(targetIndex);
  };

  const handlePrevClick = () => {
    jumpToSlide(activeIndex - 1);
  };

  const handleNextClick = () => {
    jumpToSlide(activeIndex + 1);
  };

  const getSlideState = (index: number) => {
    if (index === activeIndex) {
      return 'Current';
    }

    if (index === prevIndex) {
      return 'Prev';
    }

    if (index === nextIndex) {
      return 'Next';
    }

    return 'Hidden';
  };

  return (
    <section className={styles.heroNew}>
      <div className={styles.heroFullCarousel}>
        <div className={styles.heroSliderTrack}>
          {HERO_SLIDES.map((slide, index) => {
            const slideState = getSlideState(index);

            return (
              <div
                key={slide.src}
                className={`${styles.heroSlide} ${styles[`heroSlide${slideState}`]}`}
                aria-hidden={slideState === 'Hidden'}
              >
                <div className={styles.heroSlideCard}>
                  <Image
                    src={slide.src}
                    alt={`${slide.category} ${slide.caption}`}
                    fill
                    sizes="(max-width: 440px) 100vw, 440px"
                    className={`${styles.heroFullImg} ${slide.category === '헤어' ? styles.heroFullImgHair : ''}`}
                    priority={index < 3}
                  />
                  <div className={styles.heroSlideShade} />
                  <div className={styles.heroCaptionOverlay}>
                    <span className={styles.heroCaption}>{slide.caption}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={`${styles.heroArrow} ${styles.heroArrowPrev}`}
          aria-label="Previous hero image"
          onClick={handlePrevClick}
        >
          <span aria-hidden="true">‹</span>
        </button>

        <button
          type="button"
          className={`${styles.heroArrow} ${styles.heroArrowNext}`}
          aria-label="Next hero image"
          onClick={handleNextClick}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className={styles.heroDots} role="tablist" aria-label="Hero categories">
        {CATEGORIES.map((category, index) => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={index === activeCategoryIndex}
            aria-label={category}
            className={`${styles.heroDot} ${index === activeCategoryIndex ? styles.heroDotActive : ''}`}
            onClick={() => handleCategoryClick(category)}
          />
        ))}
      </div>
    </section>
  );
}
