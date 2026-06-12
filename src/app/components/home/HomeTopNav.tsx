import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import HomeSettingsButton from './HomeSettingsButton';
import styles from '../../home.module.css';

const ICON_BTN_STYLE: React.CSSProperties = {
  width: 30,
  height: 30,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  background: 'transparent',
  border: 'none',
  color: '#B8A45A',
  cursor: 'pointer',
};

export default function HomeTopNav() {
  const router = useRouter();

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <HomeSettingsButton />
        <button 
          onClick={() => router.push('/my/notifications')}
          aria-label="Notifications"
          style={ICON_BTN_STYLE}
        >
          <Bell size={22} fill="#B8A45A" />
        </button>
      </div>
    </div>
  );
}

