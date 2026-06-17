'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../home.module.css';

const INTERVAL_MS = 4000;

type HeroCategory = 'hair' | 'nail' | 'makeup' | 'eyelash';
const CATEGORIES: HeroCategory[] = ['hair', 'nail', 'makeup', 'eyelash'];

interface HeroSlide {
  src: string;
  category: HeroCategory;
  captionKey: string;
}

const HERO_SLIDES: HeroSlide[] = [
  { src: '/images/home/hero/hair-01.png', category: 'hair', captionKey: 'home_hero.wave_hair' },
  { src: '/images/home/hero/hair-02.png', category: 'hair', captionKey: 'home_hero.bob_hair' },
  { src: '/images/home/hero/hair-03.png', category: 'hair', captionKey: 'home_hero.curly_hair' },
  { src: '/images/home/hero/hair-04.png', category: 'hair', captionKey: 'home_hero.dandy_hair' },
  { src: '/images/home/hero/nail-01.png', category: 'nail', captionKey: 'home_hero.ice_nail' },
  { src: '/images/home/hero/nail-02.png', category: 'nail', captionKey: 'home_hero.nude_nail' },
  { src: '/images/home/hero/nail-03.png', category: 'nail', captionKey: 'home_hero.mint_nail' },
  { src: '/images/home/hero/nail-04.png', category: 'nail', captionKey: 'home_hero.black_nail' },
  { src: '/images/home/hero/makeup-01.png', category: 'makeup', captionKey: 'home_hero.red_lip' },
  { src: '/images/home/hero/makeup-02.png', category: 'makeup', captionKey: 'home_hero.pure_look' },
  { src: '/images/home/hero/makeup-03.png', category: 'makeup', captionKey: 'home_hero.idol_look' },
  { src: '/images/home/hero/makeup-04.png', category: 'makeup', captionKey: 'home_hero.glow_look' },
  { src: '/images/home/hero/eyelash-01.png', category: 'eyelash', captionKey: 'home_hero.natural_lash' },
  { src: '/images/home/hero/eyelash-02.png', category: 'eyelash', captionKey: 'home_hero.volume_lash' },
  { src: '/images/home/hero/eyelash-03.png', category: 'eyelash', captionKey: 'home_hero.curl_lash' },
  { src: '/images/home/hero/eyelash-04.png', category: 'eyelash', captionKey: 'home_hero.clean_lash' },
];

const wrapIndex = (index: number) => (index + HERO_SLIDES.length) % HERO_SLIDES.length;

export default function HomeHero() {
  const { t } = useTranslation('common');
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
                    alt={`${t(`categories.${slide.category}.label`)} ${t(slide.captionKey)}`}
                    fill
                    sizes="(max-width: 440px) 100vw, 440px"
                    className={`${styles.heroFullImg} ${slide.category === 'hair' ? styles.heroFullImgHair : ''}`}
                    priority={index < 3}
                  />
                  <div className={styles.heroSlideShade} />
                  <div className={styles.heroCaptionOverlay}>
                    <span className={styles.heroCaption}>{t(slide.captionKey)}</span>
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
            aria-label={t(`categories.${category}.label`)}
            className={`${styles.heroDot} ${index === activeCategoryIndex ? styles.heroDotActive : ''}`}
            onClick={() => handleCategoryClick(category)}
          />
        ))}
      </div>
    </section>
  );
}
