import { useRouter } from 'next/navigation';
import { TFunction } from 'i18next';
import LanguagePicker from '../LanguagePicker';
import CurrencySelector from '../CurrencySelector';
import WeatherWidget from '../WeatherWidget';
import styles from '../../home.module.css';

interface HomeTopNavProps {
  userName: string | null;
  onSignOut: () => void;
  t: TFunction;
}

export default function HomeTopNav({ userName, onSignOut, t }: HomeTopNavProps) {
  const router = useRouter();

  return (
    <div className={styles.topNav}>
      <LanguagePicker compact />
      <div style={{ flexGrow: 1 }} />
      <WeatherWidget />
      <CurrencySelector />
      {!userName ? (
        <button className={`${styles.navBtn} ${styles.navBtnPrimary}`} onClick={() => router.push('/auth/login')}>
          {t('common.login')}
        </button>
      ) : (
        <button className={styles.navBtn} onClick={onSignOut}>
          {t('home_beauty.hero.welcome_header', { name: userName })}
        </button>
      )}
    </div>
  );
}
