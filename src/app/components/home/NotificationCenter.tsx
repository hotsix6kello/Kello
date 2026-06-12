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
    title: 'Appointment Confirmed',
    description: 'Your appointment for Premium Hair Clinic has been confirmed.',
    time: '10 min ago',
    status: 'unread',
  },
  {
    id: 'n2',
    category: 'Updates',
    subType: 'message',
    title: 'New Message from Beauty Studio',
    description: 'Your stylist sent you a message regarding your visit.',
    time: '1 hour ago',
    status: 'unread',
  },
  {
    id: 'n3',
    category: 'Booking',
    subType: 'remind',
    title: 'Upcoming Appointment',
    description: 'Reminder: You have a booking tomorrow at 10:00 AM.',
    time: '1 day ago',
    status: 'unread',
  },
  {
    id: 'n4',
    category: 'Updates',
    subType: 'promo',
    title: 'Special K-Beauty Offer',
    description: 'New exclusive beauty experiences available for you.',
    time: '2 days ago',
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
            <h3 className={styles.headerTitle}>Notifications</h3>
            <div className={styles.tabs}>
              {['All', 'Booking', 'Updates'].map(tab => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
                  onClick={() => setActiveTab(tab as 'All' | 'Booking' | 'Updates')}
                >
                  {tab}
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
                No notifications to show.
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
