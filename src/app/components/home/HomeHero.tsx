import Image from 'next/image';
import styles from '../../home.module.css';

interface HomeHeroProps {
  userName: string | null;
  greeting: string;
  t: (key: string, options?: any) => string;
}

export default function HomeHero({ userName, greeting, t }: HomeHeroProps) {
  return (
    <>
      <div className={styles.backgroundEffects}>
        <div className={styles.orbPurple} />
        <div className={styles.orbBlue} />
      </div>

      <section className={styles.heroSection}>
        <Image src="/kello-logo.png" alt={t('home.badge')} width={124} height={28} className={styles.heroLogo} priority />
        <div className={styles.heroEyebrow}>{t('home_beauty.hero.eyebrow')}</div>
        <h1 className={styles.heroTitle}>
          {userName ? (
            <span suppressHydrationWarning>
              {t('home_beauty.hero.welcome_user', { greeting, name: userName })}
            </span>
          ) : (
            t('home_beauty.hero.title')
          )}
        </h1>
        <p className={styles.heroSubtitle}>
          {t('home_beauty.hero.subtitle')}
        </p>
      </section>
    </>
  );
}
