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

      <section className={`${styles.heroSection} h-auto`}>
        <Image src="/kello-logo.png" alt={t('home.badge')} width={800} height={180} className={styles.heroLogo} priority />
        <h1 className={`${styles.heroTitle} whitespace-normal break-keep h-auto`}>
          {userName ? (
            <span suppressHydrationWarning>
              {t('home_beauty.hero.welcome_user', { greeting, name: userName })}
            </span>
          ) : (
            t('home_beauty.hero.title')
          )}
        </h1>
      </section>
    </>
  );
}
