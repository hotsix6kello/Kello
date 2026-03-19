"use client";

import { useRouter } from "next/navigation";
import styles from "./booking-context-banner.module.css";

type BookingContextActionTone = "primary" | "secondary" | "soft";

interface BookingContextAction {
    href: string;
    label: string;
    tone?: BookingContextActionTone;
}

interface BookingContextBannerProps {
    title: string;
    description: string;
    detailText?: string;
    chips?: string[];
    actions?: BookingContextAction[];
    className?: string;
}

export default function BookingContextBanner({
    title,
    description,
    detailText,
    chips = [],
    actions = [],
    className,
}: BookingContextBannerProps) {
    const router = useRouter();

    return (
        <section className={[styles.card, className].filter(Boolean).join(" ")}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>{title}</h2>
                    <p className={styles.description}>{description}</p>
                </div>
            </div>

            {detailText && <p className={styles.detailText}>{detailText}</p>}

            {chips.length > 0 && (
                <div className={styles.chips}>
                    {chips.map((chip) => (
                        <span key={chip} className={styles.chip}>
                            {chip}
                        </span>
                    ))}
                </div>
            )}

            {actions.length > 0 && (
                <div className={styles.actions}>
                    {actions.map((action) => (
                        <button
                            key={`${action.label}-${action.href}`}
                            className={
                                action.tone === "primary"
                                    ? styles.primaryButton
                                    : action.tone === "secondary"
                                      ? styles.secondaryButton
                                      : styles.softButton
                            }
                            onClick={() => router.push(action.href)}
                            type="button"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}
