import { TFunction } from 'i18next';
import Image from 'next/image';
import styles from '../../home.module.css';

interface HomeHeroProps {
  t: TFunction;
}

export default function HomeHero({ t }: HomeHeroProps) {
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
      </section>
    </>
  );
}
