import { useRouter } from 'next/navigation';
import LanguagePicker from '../LanguagePicker';
import CurrencySelector from '../CurrencySelector';
import WeatherWidget from '../WeatherWidget';
import styles from '../../home.module.css';

interface HomeTopNavProps {
  userName: string | null;
  onSignOut: () => void;
  greeting: string;
  t: (key: string, options?: any) => string;
}

export default function HomeTopNav({ userName, onSignOut, greeting, t }: HomeTopNavProps) {
  const router = useRouter();

  return (
    <div className={styles.topNav}>
      <LanguagePicker compact />
      <div style={{ flexGrow: 1 }} />
      <WeatherWidget />
      <CurrencySelector />
      {!userName ? (
        <div className={styles.navAuthWrap}>
          <button className={styles.navBtn} onClick={() => router.push('/auth/signup')}>{t('common.signup')}</button>
          <button className={`${styles.navBtn} ${styles.navBtnPrimary}`} onClick={() => router.push('/auth/login')}>{t('common.login')}</button>
        </div>
      ) : (
        <button className={styles.navBtn} onClick={onSignOut}>
          {t('home_beauty.hero.welcome_header', { name: userName })}
        </button>
      )}
    </div>
  );
}
