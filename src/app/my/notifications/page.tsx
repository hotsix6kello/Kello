"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import styles from "./notifications.module.css";
import type { BeautyBookingNotificationRecord } from "@/lib/bookings/beautyNotificationServer.ts";
import { useBeautyTranslation } from "@/hooks/useBeautyTranslation";

export default function MyNotificationsPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation("common");
  const { translate } = useBeautyTranslation();
  const [notifications, setNotifications] = useState<BeautyBookingNotificationRecord[]>([]);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [translatedTitles, setTranslatedTitles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications/beauty");
        const body = (await response.json()) as { ok: boolean; items?: BeautyBookingNotificationRecord[]; error?: string };

        if (!response.ok || body.ok !== true || !body.items) {
          if (response.status === 401) {
            router.push("/login?redirect=/my/notifications");
            return;
          }
          throw new Error(body.error ?? t("notifications.loading"));
        }

        setNotifications(body.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("notifications.loading"));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchNotifications();
  }, [router, t]);

  // Translate titles and messages whenever notifications or language change
  useEffect(() => {
    if (notifications.length === 0) return;

    const targetLocale = i18n.language;

    notifications.forEach(async (n) => {
      // Translate title
      if (n.title) {
        const title = await translate({
          text: n.title,
          targetLocale,
          contentType: "notificationMessage",
        });
        setTranslatedTitles((prev) => ({ ...prev, [n.id]: title }));
      }

      // Translate message
      if (n.message) {
        const msg = await translate({
          text: n.message,
          targetLocale,
          contentType: "notificationMessage",
        });
        setTranslatedMessages((prev) => ({ ...prev, [n.id]: msg }));
      }
    });
  }, [notifications, i18n.language, translate]);

  const handleMarkAsRead = async (id: string, read: boolean) => {
    if (read) return;

    try {
      const response = await fetch("/api/notifications/beauty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });

      if (response.ok) {
        setNotifications((current) =>
          current.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
      }
    } catch (err) {
      console.error("mark-as-read failed", err);
    }
  };

  function formatEventType(type: string): string {
    const key = `notifications.event_${type}`;
    const translated = t(key);
    // i18next returns the key itself if missing – fall back to default label
    return translated === key ? t("notifications.event_default") : translated;
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>{t("notifications.loading")}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/my" className={styles.backButton}>
          {t("notifications.back")}
        </Link>
        <h1 className={styles.title}>{t("notifications.page_title")}</h1>
      </header>

      {error ? (
        <div className={styles.errorCard}>{error}</div>
      ) : notifications.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>🔔</div>
          <p>{t("notifications.empty")}</p>
          <Link href="/explore?category=beauty" className={styles.exploreLink}>
            {t("notifications.empty_cta")}
          </Link>
        </div>
      ) : (
        <div className={styles.notificationList}>
          {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`${styles.notificationCard} ${!notification.read_at ? styles.unread : ""}`}
                onClick={() => {
                  void handleMarkAsRead(notification.id, !!notification.read_at);
                  if (notification.booking_id) {
                    const focusParam = notification.event_type === 'alternative_offer_sent' ? '&focus=alternative-offer' : '';
                    router.push(`/my/bookings/beauty?bookingId=${notification.booking_id}${focusParam}`);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.eventType}>{formatEventType(notification.event_type)}</span>
                <span className={styles.createdAt}>
                  {new Date(notification.created_at).toLocaleString(i18n.language, {
                    year: "numeric", month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <h3 className={styles.notificationTitle}>
                {translatedTitles[notification.id] || notification.title}
              </h3>
              <p className={styles.notificationMessage}>
                {translatedMessages[notification.id] || notification.message}
              </p>
                {notification.booking_id && (
                  <span className={styles.bookingLink}>
                    {t("notifications.booking_link")}
                  </span>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

