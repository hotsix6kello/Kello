import { useRouter } from 'next/navigation';
import { TFunction } from 'i18next';
import HomeSettingsButton from './HomeSettingsButton';
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
      <HomeSettingsButton />
      <div style={{ flexGrow: 1 }} />
      {!userName ? (
        <button className={styles.navBtn} onClick={() => router.push('/auth/login')}>
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
