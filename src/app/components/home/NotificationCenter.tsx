'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Bell, CalendarCheck, MessageSquare, Gift, Info, CalendarClock, CalendarX } from 'lucide-react';
import styles from './NotificationCenter.module.css';
import { supabase } from '@/lib/supabaseClient';
import type { BeautyBookingNotificationRecord } from '@/lib/bookings/beautyNotificationServer.ts';

type NotiCategory = 'Booking' | 'Updates';
type NotiStatus = 'unread' | 'read';

interface NotificationItem {
  id: string;
  bookingId?: string;
  category: NotiCategory;
  subType: string;
  title: string;
  description: string;
  time: string;
  status: NotiStatus;
}

const BOOKING_EVENT_TYPES = new Set([
  'booking_created', 'booking_confirmed', 'booking_canceled_by_customer',
  'booking_cancel_review_required', 'booking_change_requested',
  'booking_change_approved', 'booking_change_rejected', 'booking_completed',
  'alternative_offer_sent', 'alternative_offer_accepted', 'alternative_offer_rejected',
]);

function getSubType(eventType: string): string {
  if (eventType === 'booking_canceled_by_customer' || eventType === 'booking_cancel_review_required') return 'cancel';
  if (eventType === 'booking_confirmed' || eventType === 'booking_created' || eventType === 'booking_completed') return 'confirmed';
  return 'remind';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFunc = (key: string, opts?: any) => string;

function formatRelativeTime(dateStr: string, t: TFunc): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return t('common.runtime.relative.minutes_ago', { count: Math.max(1, minutes) });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('common.runtime.relative.hours_ago', { count: hours });
  const days = Math.floor(hours / 24);
  return t('common.runtime.relative.days_ago', { count: days });
}

function recordToItem(record: BeautyBookingNotificationRecord, t: TFunc): NotificationItem {
  return {
    id: record.id,
    bookingId: record.booking_id,
    category: BOOKING_EVENT_TYPES.has(record.event_type) ? 'Booking' : 'Updates',
    subType: getSubType(record.event_type),
    title: record.title,
    description: record.message,
    time: formatRelativeTime(record.created_at, t),
    status: record.read_at ? 'read' : 'unread',
  };
}

function SkeletonItem() {
  return (
    <li className={styles.skeletonItem}>
      <div className={`${styles.skeletonCircle} ${styles.shimmer}`} />
      <div className={styles.skeletonContent}>
        <div className={`${styles.skeletonLine} ${styles.skeletonTitle} ${styles.shimmer}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonDesc} ${styles.shimmer}`} />
      </div>
    </li>
  );
}

export default function NotificationCenter() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Booking' | 'Updates'>('All');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications/beauty', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const body = await res.json() as { ok: boolean; items?: BeautyBookingNotificationRecord[] };
      if (body.ok && body.items) {
        setNotifications(body.items.map((r) => recordToItem(r, t)));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleBellClick = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) void fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => n.status === 'unread');
    if (unread.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as NotiStatus })));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await Promise.allSettled(
      unread.map(n =>
        fetch('/api/notifications/beauty', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ notificationId: n.id }),
        })
      )
    );
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const filteredNotis = notifications.filter(n => {
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

  const handleNotiClick = async (item: NotificationItem) => {
    setIsOpen(false);

    if (item.status === 'unread') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        void fetch('/api/notifications/beauty', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ notificationId: item.id }),
        });
        setNotifications(prev =>
          prev.map(n => n.id === item.id ? { ...n, status: 'read' as NotiStatus } : n)
        );
      }
    }

    if (item.category === 'Booking' && item.bookingId) {
      router.push(`/my/bookings/beauty?bookingId=${item.bookingId}`);
    } else if (item.category === 'Booking') {
      router.push('/my/bookings');
    } else {
      router.push('/my/notifications');
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
    { id: 'All', label: t('common.categories.all') },
    { id: 'Booking', label: t('notifications.tab_booking') },
    { id: 'Updates', label: t('notifications.tab_updates') },
  ] as const;

  return (
    <div className={styles.container} ref={panelRef}>
      <button
        className={styles.bellButton}
        onClick={handleBellClick}
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
            <div className={styles.headerRow}>
              <h3 className={styles.headerTitle}>{t('notification_center.title')}</h3>
              {unreadCount > 0 && (
                <button className={styles.markAllButton} onClick={() => void handleMarkAllRead()}>
                  모두 읽음
                </button>
              )}
            </div>
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
            {isLoading ? (
              <>
                <SkeletonItem />
                <SkeletonItem />
                <SkeletonItem />
              </>
            ) : filteredNotis.length > 0 ? (
              filteredNotis.map(noti => (
                <li
                  key={noti.id}
                  className={`${styles.item} ${styles[noti.status]}`}
                  onClick={() => void handleNotiClick(noti)}
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
