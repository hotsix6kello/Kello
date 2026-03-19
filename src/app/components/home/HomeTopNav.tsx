import { useRouter } from 'next/navigation';
import LanguagePicker from '../LanguagePicker';
import CurrencySelector from '../CurrencySelector';
import WeatherWidget from '../WeatherWidget';
import styles from '../../home.module.css';

interface HomeTopNavProps {
  userName: string | null;
  onSignOut: () => void;
  t: (key: string) => string;
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
        <div className={styles.navAuthWrap}>
          <button className={styles.navBtn} onClick={() => router.push('/auth/signup')}>{t('common.signup')}</button>
          <button className={`${styles.navBtn} ${styles.navBtnPrimary}`} onClick={() => router.push('/auth/login')}>{t('common.login')}</button>
        </div>
      ) : (
        <button className={styles.navBtn} onClick={onSignOut}>
          {userName}님 👋
        </button>
      )}
    </div>
  );
}
