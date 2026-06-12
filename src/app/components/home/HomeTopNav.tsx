import HomeSettingsButton from './HomeSettingsButton';
import NotificationCenter from './NotificationCenter';
import styles from '../../home.module.css';

export default function HomeTopNav() {
  return (
    <div className={styles.topNav}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg width="76" height="30" viewBox="0 0 76 30" aria-label="Kello" style={{ display: 'block' }}>
          <text
            x="2"
            y="22"
            fontFamily="'Nunito', 'Quicksand', 'Pretendard', 'Inter', sans-serif"
            fontWeight="800"
            fontSize="24"
            fill="#FF3566"
            letterSpacing="-0.5"
          >
            Kello
          </text>
        </svg>
      </div>
      <div style={{ flexGrow: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <HomeSettingsButton />
        <NotificationCenter />
      </div>
    </div>
  );
}

