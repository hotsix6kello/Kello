import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import HomeSettingsButton from './HomeSettingsButton';
import styles from '../../home.module.css';

const ICON_BTN_STYLE: React.CSSProperties = {
  width: 36,
  height: 36,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  background: 'transparent',
  border: '1.5px solid #B8A45A',
  color: '#B8A45A',
  cursor: 'pointer',
};

export default function HomeTopNav() {
  const router = useRouter();

  return (
    <div className={styles.topNav}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg width="80" height="30" viewBox="0 0 80 30" aria-label="Kello">
          <text
            x="2"
            y="24"
            fontFamily="'Nunito', 'Quicksand', 'Pretendard', 'Inter', sans-serif"
            fontWeight="800"
            fontSize="26"
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
          <Bell size={18} />
        </button>
      </div>
    </div>
  );
}

