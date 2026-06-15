'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarCheck, MessageSquare, Gift, Info, CalendarClock, CalendarX } from 'lucide-react';
import styles from './NotificationCenter.module.css';

type NotiCategory = 'Booking' | 'Updates';
type NotiStatus = 'unread' | 'read';

interface NotificationItem {
  id: string;
  category: NotiCategory;
  subType: string;
  title: string;
  description: string;
  time: string;
  status: NotiStatus;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    category: 'Booking',
    subType: 'confirmed',
    title: '예약 확정 완료',
    description: '프리미엄 헤어 클리닉 예약이 정상적으로 확정되었습니다.',
    time: '10분 전',
    status: 'unread',
  },
  {
    id: 'n2',
    category: 'Updates',
    subType: 'message',
    title: '매장 메시지 도착',
    description: '담당 디자이너가 예약 확인 관련 신규 메시지를 발송했습니다.',
    time: '1시간 전',
    status: 'unread',
  },
  {
    id: 'n3',
    category: 'Booking',
    subType: 'remind',
    title: '예약 리마인드 알림',
    description: '안내: 내일 오전 10:00에 예정된 뷰티 예약 일정이 있습니다.',
    time: '1일 전',
    status: 'unread',
  },
  {
    id: 'n4',
    category: 'Updates',
    subType: 'promo',
    title: '특별 K-뷰티 혜택 제안',
    description: '회원님만을 위한 전용 시크릿 뷰티 스파 패키지를 확인해 보세요.',
    time: '2일 전',
    status: 'read',
  },
];

export default function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Booking' | 'Updates'>('All');
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => n.status === 'unread').length;

  const filteredNotis = MOCK_NOTIFICATIONS.filter(n => {
    if (activeTab === 'All') return true;
    return n.category === activeTab;
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotiClick = (category: NotiCategory) => {
    setIsOpen(false);
    if (category === 'Booking') {
      router.push('/my/bookings'); // 임시 경로 (Reservation Detail)
    } else {
      router.push('/my/notifications'); // 임시 경로 (Message / Promotion Detail)
    }
  };

  const getIcon = (item: NotificationItem) => {
    if (item.category === 'Booking') {
      if (item.subType === 'remind') return <CalendarClock size={20} strokeWidth={1.5} />;
      if (item.subType === 'cancel') return <CalendarX size={20} strokeWidth={1.5} />;
      return <CalendarCheck size={20} strokeWidth={1.5} />;
    } else {
      if (item.subType === 'message') return <MessageSquare size={20} strokeWidth={1.5} />;
      if (item.subType === 'promo') return <Gift size={20} strokeWidth={1.5} />;
      return <Info size={20} strokeWidth={1.5} />;
    }
  };

  const tabs = [
    { id: 'All', label: '전체' },
    { id: 'Booking', label: '예약' },
    { id: 'Updates', label: '소식' }
  ] as const;

  return (
    <div className={styles.container} ref={panelRef}>
      <button 
        className={styles.bellButton} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={22} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <h3 className={styles.headerTitle}>알림 센터</h3>
            <div className={styles.tabs}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          <ul className={styles.list}>
            {filteredNotis.length > 0 ? (
              filteredNotis.map(noti => (
                <li 
                  key={noti.id} 
                  className={`${styles.item} ${styles[noti.status]}`}
                  onClick={() => handleNotiClick(noti.category)}
                >
                  {noti.status === 'unread' && <div className={styles.unreadDot} />}
                  <div className={styles.iconWrapper}>
                    {getIcon(noti)}
                  </div>
                  <div className={styles.content}>
                    <div className={styles.titleRow}>
                      <h4 className={styles.title}>{noti.title}</h4>
                      <span className={styles.time}>{noti.time}</span>
                    </div>
                    <p className={styles.description}>{noti.description}</p>
                  </div>
                </li>
              ))
            ) : (
              <div className={styles.emptyState}>
                새로운 알림이 없습니다.
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
