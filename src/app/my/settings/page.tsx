"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/app/components/LanguagePicker";
import { useTrip } from "@/lib/contexts/TripContext";
import { resolveCanonicalLocale } from "@/lib/i18n/locales";
import { readSavedItemIds } from "@/lib/savedHub";
import { supabase } from "@/lib/supabaseClient";
import styles from "./settings.module.css";

type PartnerStatus = "none" | "pending" | "approved" | "rejected";

interface ProfileRecord {
    email: string | null;
    nickname: string | null;
    is_admin: boolean | null;
    created_at: string | null;
}

interface PartnerRecord {
    status: PartnerStatus;
    company_name: string | null;
    business_type: string | null;
    created_at: string | null;
}

interface AccountState {
    displayName: string;
    email: string;
    joinedAt: string;
    lastSignInAt: string;
    emailVerified: boolean;
    phone: string;
    phoneVerified: boolean;
    providerLabel: string;
    isLoggedIn: boolean;
}

interface StoredUser {
    name?: string;
    email?: string;
}


function titleCase(value: string): string {
    return value
        .split(/[_-\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function pickString(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return "";
}

function formatDate(value: string): string {
    if (!value) return "";

    try {
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        }).format(new Date(value));
    } catch {
        return value;
    }
}



function getLanguageMeta(
    code: string,
    t: (key: string, options?: Record<string, unknown>) => string
) {
    const canonicalCode = resolveCanonicalLocale(code, "en");
    const match = LANGUAGES.find((option) => option.code === canonicalCode);

    if (match) {
        return {
            label: match.label,
            flag: match.flag,
        };
    }

    return {
        label: code ? code.toUpperCase() : t("common.states.not_set"),
        flag: "",
    };
}

function describePartnerType(rawType: string | null): string {
    if (!rawType) return "";
    return titleCase(rawType.replace(/_/g, " "));
}

export default function MySettingsPage() {
    const router = useRouter();
    const { t, i18n } = useTranslation("common");
    const { itinerary, tripDays } = useTrip();

    const [loading, setLoading] = useState(true);
    const [account, setAccount] = useState<AccountState>({
        displayName: t("my_page.settings.account.default_name"),
        email: "",
        joinedAt: "",
        lastSignInAt: "",
        emailVerified: false,
        phone: "",
        phoneVerified: false,
        providerLabel: "",
        isLoggedIn: false,
    });
    const [profile, setProfile] = useState<ProfileRecord | null>(null);
    const [partner, setPartner] = useState<PartnerRecord>({
        status: "none",
        company_name: null,
        business_type: null,
        created_at: null,
    });
    const [languageCode, setLanguageCode] = useState("en");
    const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        setLanguageCode(
            resolveCanonicalLocale(localStorage.getItem("kello_lang") || i18n.language || "en")
        );
        setSavedPlaceIds(readSavedItemIds());
    }, [i18n.language]);

    useEffect(() => {
        let isMounted = true;

        const loadAccount = async () => {
            let storedUser: StoredUser = {};

            if (typeof window !== "undefined") {
                try {
                    storedUser = JSON.parse(localStorage.getItem("user") || "{}") as StoredUser;
                } catch {
                    storedUser = {};
                }
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!isMounted) return;

            if (!user) {
                setAccount({
                    displayName: pickString(
                        storedUser.name,
                        t("my_page.settings.account.default_name")
                    ),
                    email: pickString(storedUser.email),
                    joinedAt: "",
                    lastSignInAt: "",
                    emailVerified: false,
                    phone: "",
                    phoneVerified: false,
                    providerLabel: t("common.states.sign_in_required"),
                    isLoggedIn: false,
                });
                setLoading(false);
                return;
            }

            const { data: profileData } = await supabase
                .from("profiles")
                .select("email, nickname, is_admin, created_at")
                .eq("id", user.id)
                .maybeSingle();

            if (!isMounted) return;

            const nextProfile = (profileData as ProfileRecord | null) ?? null;
            const email = pickString(user.email, nextProfile?.email, storedUser.email);
            const displayName = pickString(
                nextProfile?.nickname,
                user.user_metadata?.full_name,
                user.user_metadata?.name,
                storedUser.name,
                email ? email.split("@")[0] : "",
                t("my_page.settings.account.default_name")
            );
            const providerSource = pickString(
                user.app_metadata?.provider,
                Array.isArray(user.app_metadata?.providers)
                    ? user.app_metadata?.providers[0]
                    : ""
            );

            setProfile(nextProfile);
            setAccount({
                displayName,
                email,
                joinedAt: pickString(nextProfile?.created_at, user.created_at),
                lastSignInAt: pickString(user.last_sign_in_at),
                emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
                phone: pickString(user.phone),
                phoneVerified: Boolean(user.phone && user.phone_confirmed_at),
                providerLabel: providerSource
                    ? titleCase(providerSource)
                    : t("my_page.settings.verification.email_provider"),
                isLoggedIn: true,
            });

            if (!email) {
                setPartner({
                    status: "none",
                    company_name: null,
                    business_type: null,
                    created_at: null,
                });
                setLoading(false);
                return;
            }

            const { data: partnerData } = await supabase
                .from("partners")
                .select("status, company_name, business_type, created_at")
                .eq("email", email)
                .maybeSingle();

            if (!isMounted) return;

            setPartner(
                partnerData
                    ? {
                          status: partnerData.status as PartnerStatus,
                          company_name: partnerData.company_name ?? null,
                          business_type: partnerData.business_type ?? null,
                          created_at: partnerData.created_at ?? null,
                      }
                    : {
                          status: "none",
                          company_name: null,
                          business_type: null,
                          created_at: null,
                      }
            );
            setLoading(false);
        };

        loadAccount();

        return () => {
            isMounted = false;
        };
    }, [t]);

    const initials = useMemo(() => {
        return account.displayName
            .split(" ")
            .map((part) => part[0] ?? "")
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }, [account.displayName]);

    const languageMeta = useMemo(() => getLanguageMeta(languageCode, t), [languageCode, t]);



    const verificationItems = useMemo(() => {
        return [
            {
                id: "email",
                label: t("my_page.settings.verification.email"),
                value:
                    account.email ||
                    t("common.states.not_connected"),
                helper: account.emailVerified
                    ? t("my_page.settings.verification.email_ready")
                    : t("my_page.settings.verification.email_missing"),
                badge: account.emailVerified
                    ? t("common.states.verified")
                    : t("common.states.not_verified"),
                tone: account.emailVerified ? "verified" : "warning",
            },
            {
                id: "phone",
                label: t("my_page.settings.verification.phone"),
                value:
                    account.phone ||
                    t("common.states.not_connected"),
                helper: account.phone
                    ? account.phoneVerified
                        ? t("my_page.settings.verification.phone_ready")
                        : t("my_page.settings.verification.phone_partial")
                    : t("my_page.settings.verification.phone_empty"),
                badge: account.phoneVerified
                    ? t("common.states.verified")
                    : account.phone
                      ? t("common.states.needs_review")
                      : t("common.states.not_connected"),
                tone: account.phoneVerified
                    ? "verified"
                    : account.phone
                      ? "warning"
                      : "neutral",
            },
            {
                id: "provider",
                label: t("my_page.settings.verification.provider"),
                value:
                    account.providerLabel ||
                    t("common.states.sign_in_required"),
                helper: t("my_page.settings.verification.provider_hint"),
                badge: account.isLoggedIn
                    ? t("common.states.active")
                    : t("common.states.sign_in_required"),
                tone: account.isLoggedIn ? "info" : "neutral",
            },
        ];
    }, [account, t]);



    const partnerPanel = useMemo(() => {
        if (partner.status === "approved") {
            return {
                badge: t("common.states.approved"),
                tone: "verified",
                title: t("my_page.settings.partner.title"),
                desc: t("my_page.settings.partner.approved_desc"),
                actionLabel: t("common.actions.open_support"),
                actionHref: "/my/support?tab=general",
            };
        }

        if (partner.status === "pending") {
            return {
                badge: t("common.states.pending_review"),
                tone: "warning",
                title: t("my_page.settings.partner.title"),
                desc: t("my_page.settings.partner.pending_desc"),
                actionLabel: t("common.actions.open_support"),
                actionHref: "/my/support?tab=general",
            };
        }

        if (partner.status === "rejected") {
            return {
                badge: t("common.states.needs_update"),
                tone: "warning",
                title: t("my_page.settings.partner.title"),
                desc: t("my_page.settings.partner.rejected_desc"),
                actionLabel: t("common.actions.apply_again"),
                actionHref: "/auth/partner-signup",
            };
        }

        return {
            badge: t("common.states.not_joined"),
            tone: "neutral",
            title: t("my_page.settings.partner.title"),
            desc: t("my_page.settings.partner.none_desc"),
            actionLabel: t("common.actions.apply_as_partner"),
            actionHref: "/auth/partner-signup",
        };
    }, [partner.status, t]);

    const adminPanel = useMemo(() => {
        if (profile?.is_admin) {
            return {
                badge: t("my_page.settings.admin.enabled"),
                tone: "admin",
                desc: t("my_page.settings.admin.enabled_desc"),
                actionLabel: t("common.actions.open_admin_console"),
                actionHref: "/admin",
            };
        }

        return {
            badge: t("common.states.standard_account"),
            tone: "neutral",
            desc: t("my_page.settings.admin.disabled_desc"),
            actionLabel: "",
            actionHref: "",
        };
    }, [profile?.is_admin, t]);

    const summaryCards = useMemo(() => {
        return [
            {
                id: "saved",
                label: t("my_page.settings.summary.saved"),
                value: savedPlaceIds.length,
            },
            {
                id: "stops",
                label: t("my_page.settings.summary.stops"),
                value: itinerary.length,
            },
            {
                id: "days",
                label: t("my_page.settings.summary.days"),
                value: tripDays,
            },
        ];
    }, [itinerary.length, savedPlaceIds.length, t, tripDays]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.navButton} onClick={() => router.push("/my")}>
                    {t("common.back")}
                </button>
            </header>

            <section className={styles.heroCard}>
                <div className={styles.avatar}>{initials || "ME"}</div>
                <div className={styles.heroBody}>
                    <p className={styles.eyebrow}>
                        {t("my_page.settings.eyebrow")}
                    </p>
                    <h1 className={styles.heroTitle}>
                        {t("my_page.settings.title")}
                    </h1>
                    <p className={styles.heroSubtitle}>
                        {t("my_page.settings.subtitle")}
                    </p>
                    <div className={styles.badgeRow}>
                        <span className={`${styles.badge} ${styles.infoBadge}`}>
                            {account.emailVerified
                                ? t("my_page.settings.hero.email_ready")
                                : t("my_page.settings.hero.email_pending")}
                        </span>
                        <span className={`${styles.badge} ${styles.infoBadge}`}>
                            {`${languageMeta.flag} ${languageMeta.label}`.trim()}
                        </span>
                        <span
                            className={`${styles.badge} ${
                                styles[`${partnerPanel.tone}Badge`]
                            }`}
                        >
                            {partnerPanel.badge}
                        </span>
                    </div>
                </div>
            </section>

            <section className={styles.summarySection}>
                <div className={styles.summaryGrid}>
                    {summaryCards.map((card) => (
                        <div key={card.id} className={styles.summaryCard}>
                            <span className={styles.summaryLabel}>{card.label}</span>
                            <strong className={styles.summaryValue}>{card.value}</strong>
                        </div>
                    ))}
                </div>
            </section>

            {!loading && !account.isLoggedIn && (
                <section className={styles.section}>
                    <div className={styles.emptyCallout}>
                        <h2 className={styles.calloutTitle}>
                            {t("my_page.settings.account.sign_in_title")}
                        </h2>
                        <p className={styles.calloutText}>
                            {t("my_page.settings.account.sign_in_desc")}
                        </p>
                        <button
                            className={styles.primaryButton}
                            onClick={() => router.push("/auth/login")}
                        >
                            {t("common.login")}
                        </button>
                    </div>
                </section>
            )}



            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>
                            {t("my_page.settings.verification.title")}
                        </h2>
                        <p className={styles.sectionText}>
                            {t("my_page.settings.verification.desc")}
                        </p>
                    </div>
                </div>

                <div className={styles.list}>
                    {verificationItems.map((item) => (
                        <div key={item.id} className={styles.row}>
                            <div className={styles.rowInfo}>
                                <div className={styles.rowLabel}>{item.label}</div>
                                <div className={styles.rowHelper}>{item.helper}</div>
                            </div>
                            <div className={styles.valueGroup}>
                                <div className={styles.rowValue}>{item.value}</div>
                                <span className={`${styles.badge} ${styles[`${item.tone}Badge`]}`}>
                                    {item.badge}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.sectionNote}>
                    {t("my_page.settings.verification.identity_note")}
                </div>
            </section>





            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>
                            {t("my_page.settings.partner_admin.title")}
                        </h2>
                        <p className={styles.sectionText}>
                            {t("my_page.settings.partner_admin.desc")}
                        </p>
                    </div>
                </div>

                <div className={styles.duoGrid}>
                    <article className={styles.infoCard}>
                        <div className={styles.cardHeader}>
                            <div>
                                <h3 className={styles.cardTitle}>{partnerPanel.title}</h3>
                                <p className={styles.cardText}>{partnerPanel.desc}</p>
                            </div>
                            <span className={`${styles.badge} ${styles[`${partnerPanel.tone}Badge`]}`}>
                                {partnerPanel.badge}
                            </span>
                        </div>

                        <div className={styles.metaRow}>
                            {partner.company_name && (
                                <span className={styles.metaChip}>{partner.company_name}</span>
                            )}
                            {partner.business_type && (
                                <span className={styles.metaChip}>
                                    {describePartnerType(partner.business_type)}
                                </span>
                            )}
                            {partner.created_at && (
                                <span className={styles.metaChip}>
                                    {formatDate(partner.created_at)}
                                </span>
                            )}
                        </div>

                        <div className={styles.actionRow}>
                            <button
                                className={styles.primaryButton}
                                onClick={() => router.push(partnerPanel.actionHref)}
                            >
                                {partnerPanel.actionLabel}
                            </button>
                        </div>
                    </article>

                    <article className={styles.infoCard}>
                        <div className={styles.cardHeader}>
                            <div>
                                <h3 className={styles.cardTitle}>
                                    {t("my_page.settings.admin.title")}
                                </h3>
                                <p className={styles.cardText}>{adminPanel.desc}</p>
                            </div>
                            <span className={`${styles.badge} ${styles[`${adminPanel.tone}Badge`]}`}>
                                {adminPanel.badge}
                            </span>
                        </div>

                        <div className={styles.metaRow}>
                            <span className={styles.metaChip}>
                                {profile?.is_admin
                                    ? t("my_page.settings.admin.source")
                                    : t("my_page.settings.admin.source_none")}
                            </span>
                        </div>

                        {adminPanel.actionHref ? (
                            <div className={styles.actionRow}>
                                <button
                                    className={styles.secondaryButton}
                                    onClick={() => router.push(adminPanel.actionHref)}
                                >
                                    {adminPanel.actionLabel}
                                </button>
                            </div>
                        ) : null}
                    </article>
                </div>
            </section>

            {loading && (
                <div className={styles.loadingText}>
                    {t("common.loading")}
                </div>
            )}

            <div className={styles.bottomSpacer} />
        </div>
    );
}
