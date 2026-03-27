import { TFunction } from 'i18next';
import Image from 'next/image';
import styles from '../../home.module.css';

interface HomeHeroProps {
  userName: string | null;
  t: TFunction;
}

export default function HomeHero({ userName, t }: HomeHeroProps) {
  return (
    <>
      <section className={`${styles.heroSection} h-auto`}>
        <Image 
          src="/kello-logo.png" 
          alt={t('home.badge')} 
          width={960} 
          height={320} 
          className={styles.heroLogo} 
          priority 
        />
        <div style={{ padding: '0 20px' }}>
          <h1 className={`${styles.heroTitle} whitespace-normal break-keep h-auto`}>
            {userName ? (
              <span suppressHydrationWarning>
                {t('home_beauty.hero.welcome_hero', { name: userName })}
              </span>
            ) : (
              t('home_beauty.hero.title')
            )}
          </h1>
        </div>
      </section>
    </>
  );
}
