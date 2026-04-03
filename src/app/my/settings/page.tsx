"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import styles from "./settings.module.css";

type PartnerStatus = "none" | "pending" | "approved" | "rejected";
type TabId = "personal" | "partner" | "admin";
type Tone = "verified" | "warning" | "neutral" | "info";

interface ProfileRecord {
    email: string | null;
    nickname: string | null;
    role: string | null;
    created_at: string | null;
}

interface PartnerRecord {
    status: PartnerStatus;
    company_name: string | null;
    business_type: string | null;
    address: string | null;
    website: string | null;
    visibility_status: boolean | null;
    created_at: string | null;
}

interface AccountState {
    displayName: string;
    email: string;
    joinedAt: string;
    emailVerified: boolean;
    phone: string;
    phoneVerified: boolean;
    providerLabel: string;
    snsId: string;
    isLoggedIn: boolean;
}

interface StoredUser {
    name?: string;
    email?: string;
}

interface NotificationPreferences {
    inAppEnabled: boolean;
    emailEnabled: boolean;
    bookingUpdatesEnabled: boolean;
    changeRequestUpdatesEnabled: boolean;
    alternativeOfferUpdatesEnabled: boolean;
}

interface NotificationSummary {
    value: string;
    helper: string;
    badge: string;
    tone: Tone;
}

interface SettingsRow {
    id: string;
    title: string;
    value: string;
    helper: string;
    badge: string;
    tone: Tone;
    actionLabel?: string;
    actionHref?: string;
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

function describePartnerType(rawType: string | null): string {
    if (!rawType) return "";
    return titleCase(rawType.replace(/_/g, " "));
}

function isAdminRole(role: string | null | undefined): boolean {
    return role === "admin" || role === "super_admin";
}

function pickRecordValue(record: Record<string, unknown> | null | undefined, ...keys: string[]) {
    return pickString(...keys.map((key) => record?.[key]));
}

function extractSnsId(user: {
    user_metadata?: Record<string, unknown>;
    identities?: Array<{ identity_data?: Record<string, unknown> | null }> | null;
}) {
    const identityData = Array.isArray(user.identities) ? user.identities[0]?.identity_data : null;

    return pickString(
        pickRecordValue(user.user_metadata, "user_name", "preferred_username", "screen_name"),
        pickRecordValue(identityData, "user_name", "preferred_username", "screen_name")
    );
}

function buildNotificationSummary(
    preferences: NotificationPreferences | null,
    isLoggedIn: boolean
): NotificationSummary {
    if (!isLoggedIn) {
        return {
            value: "로그인 후 확인",
            helper: "로그인 후 현재 알림 상태를 볼 수 있어요.",
            badge: "대기",
            tone: "neutral",
        };
    }

    if (!preferences) {
        return {
            value: "설정 확인 필요",
            helper: "알림 상태를 불러오지 못했어요.",
            badge: "확인 필요",
            tone: "warning",
        };
    }

    const enabledChannels = [
        preferences.inAppEnabled ? "앱" : "",
        preferences.emailEnabled ? "이메일" : "",
    ].filter(Boolean);
    const enabledTypes = [
        preferences.bookingUpdatesEnabled,
        preferences.changeRequestUpdatesEnabled,
        preferences.alternativeOfferUpdatesEnabled,
    ].filter(Boolean).length;

    if (enabledChannels.length === 0) {
        return {
            value: "모든 알림 OFF",
            helper: `예약 관련 알림 ${enabledTypes}/3개만 수신 중이에요.`,
            badge: "OFF",
            tone: "warning",
        };
    }

    const value =
        enabledChannels.length === 2 ? "앱 · 이메일 ON" : `${enabledChannels[0]}만 ON`;

    return {
        value,
        helper: `예약 관련 알림 ${enabledTypes}/3개를 수신 중이에요.`,
        badge: enabledTypes === 3 ? "활성" : "일부만 ON",
        tone: enabledTypes === 3 ? "verified" : "info",
    };
}

function getPartnerStatusMeta(status: PartnerStatus) {
    switch (status) {
        case "approved":
            return {
                value: "승인 완료",
                helper: "현재 파트너 계정으로 확인되고 있어요.",
                badge: "승인",
                tone: "verified" as Tone,
                actionLabel: "문의",
                actionHref: "/my/support?tab=general",
            };
        case "pending":
            return {
                value: "검토 중",
                helper: "제출한 파트너 정보를 검토하고 있어요.",
                badge: "대기",
                tone: "warning" as Tone,
                actionLabel: "문의",
                actionHref: "/my/support?tab=general",
            };
        case "rejected":
            return {
                value: "보완 후 재신청",
                helper: "신청 정보를 보완한 뒤 다시 제출할 수 있어요.",
                badge: "보완 필요",
                tone: "warning" as Tone,
                actionLabel: "재신청",
                actionHref: "/auth/partner-signup",
            };
        default:
            return {
                value: "파트너 정보 없음",
                helper: "등록된 파트너 상태가 없어요.",
                badge: "없음",
                tone: "neutral" as Tone,
            };
    }
}

const EMPTY_PARTNER: PartnerRecord = {
    status: "none",
    company_name: null,
    business_type: null,
    address: null,
    website: null,
    visibility_status: null,
    created_at: null,
};

export default function MySettingsPage() {
    const router = useRouter();
    const { t } = useTranslation("common");

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>("personal");
    const [account, setAccount] = useState<AccountState>({
        displayName: "",
        email: "",
        joinedAt: "",
        emailVerified: false,
        phone: "",
        phoneVerified: false,
        providerLabel: "로그인 필요",
        snsId: "",
        isLoggedIn: false,
    });
    const [profile, setProfile] = useState<ProfileRecord | null>(null);
    const [partner, setPartner] = useState<PartnerRecord>(EMPTY_PARTNER);
    const [notificationSummary, setNotificationSummary] = useState<NotificationSummary>(
        buildNotificationSummary(null, false)
    );

    useEffect(() => {
        let isMounted = true;

        const loadSettings = async () => {
            let storedUser: StoredUser = {};

            if (typeof window !== "undefined") {
                try {
                    storedUser = JSON.parse(localStorage.getItem("user") || "{}") as StoredUser;
                } catch {
                    storedUser = {};
                }
            }

            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!isMounted) return;

                if (!user) {
                    setProfile(null);
                    setPartner(EMPTY_PARTNER);
                    setAccount({
                        displayName: pickString(storedUser.name),
                        email: pickString(storedUser.email),
                        joinedAt: "",
                        emailVerified: false,
                        phone: "",
                        phoneVerified: false,
                        providerLabel: "로그인 필요",
                        snsId: "",
                        isLoggedIn: false,
                    });
                    setNotificationSummary(buildNotificationSummary(null, false));
                    setLoading(false);
                    return;
                }

                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("email, nickname, role, created_at")
                    .eq("id", user.id)
                    .maybeSingle();

                const nextProfile = (profileData as ProfileRecord | null) ?? null;
                const email = pickString(user.email, nextProfile?.email, storedUser.email);
                const providerSource = pickString(
                    user.app_metadata?.provider,
                    Array.isArray(user.app_metadata?.providers)
                        ? user.app_metadata?.providers[0]
                        : ""
                );
                const nextAccount: AccountState = {
                    displayName: pickString(
                        nextProfile?.nickname,
                        user.user_metadata?.full_name,
                        user.user_metadata?.name,
                        storedUser.name
                    ),
                    email,
                    joinedAt: pickString(nextProfile?.created_at, user.created_at),
                    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
                    phone: pickString(user.phone),
                    phoneVerified: Boolean(user.phone && user.phone_confirmed_at),
                    providerLabel: providerSource ? titleCase(providerSource) : "Email",
                    snsId: extractSnsId(user),
                    isLoggedIn: true,
                };

                const {
                    data: { session },
                } = await supabase.auth.getSession();

                const [partnerResult, notificationResult] = await Promise.all([
                    email
                        ? supabase
                              .from("partners")
                              .select(
                                  "status, company_name, business_type, address, website, visibility_status, created_at"
                              )
                              .eq("email", email)
                              .maybeSingle()
                        : Promise.resolve({ data: null }),
                    (async () => {
                        if (!session?.access_token) {
                            return buildNotificationSummary(null, true);
                        }

                        try {
                            const response = await fetch("/api/bookings/beauty/preferences", {
                                headers: {
                                    Authorization: `Bearer ${session.access_token}`,
                                },
                            });
                            const body = (await response.json()) as {
                                ok?: boolean;
                                preferences?: NotificationPreferences;
                            };

                            if (response.ok && body.ok && body.preferences) {
                                return buildNotificationSummary(body.preferences, true);
                            }
                        } catch {
                            return buildNotificationSummary(null, true);
                        }

                        return buildNotificationSummary(null, true);
                    })(),
                ]);

                if (!isMounted) return;

                setProfile(nextProfile);
                setAccount(nextAccount);
                setPartner(
                    partnerResult.data
                        ? {
                              status: partnerResult.data.status as PartnerStatus,
                              company_name: partnerResult.data.company_name ?? null,
                              business_type: partnerResult.data.business_type ?? null,
                              address: partnerResult.data.address ?? null,
                              website: partnerResult.data.website ?? null,
                              visibility_status: partnerResult.data.visibility_status ?? null,
                              created_at: partnerResult.data.created_at ?? null,
                          }
                        : EMPTY_PARTNER
                );
                setNotificationSummary(notificationResult);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        void loadSettings();

        return () => {
            isMounted = false;
        };
    }, []);

    const initials = useMemo(() => {
        return account.displayName
            .split(" ")
            .map((part) => part[0] ?? "")
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }, [account.displayName]);

    const pageTitle = account.displayName || "내 설정";

    const showPartnerTab = partner.status !== "none";
    const showAdminTab = isAdminRole(profile?.role);
    const partnerStatusMeta = useMemo(
        () => getPartnerStatusMeta(partner.status),
        [partner.status]
    );

    const visibleTabs = useMemo(() => {
        const tabs: Array<{ id: TabId; label: string; desc: string }> = [
            {
                id: "personal",
                label: "개인",
                desc: "이메일, 연락처, 로그인과 알림 설정을 확인하세요.",
            },
        ];

        if (showPartnerTab) {
            tabs.push({
                id: "partner",
                label: "파트너",
                desc: "파트너 상태와 매장 운영 관련 항목을 한곳에서 확인하세요.",
            });
        }

        if (showAdminTab) {
            tabs.push({
                id: "admin",
                label: "관리자",
                desc: "관리 권한에 연결된 항목을 빠르게 확인하세요.",
            });
        }

        return tabs;
    }, [showAdminTab, showPartnerTab]);

    useEffect(() => {
        if (!visibleTabs.some((tab) => tab.id === activeTab)) {
            setActiveTab("personal");
        }
    }, [activeTab, visibleTabs]);

    const personalRows = useMemo<SettingsRow[]>(
        () => [
            {
                id: "email",
                title: "이메일",
                value: account.email || "연결 안 됨",
                helper: account.emailVerified
                    ? "현재 확인된 이메일 주소예요."
                    : account.email
                      ? "이메일 확인이 아직 필요해요."
                      : "연결된 이메일이 없어요.",
                badge: account.emailVerified ? "확인됨" : account.email ? "미확인" : "미연결",
                tone: account.emailVerified ? "verified" : account.email ? "warning" : "neutral",
            },
            {
                id: "sns",
                title: "sns",
                value: account.snsId || "연결 안 됨",
                helper: account.snsId
                    ? "연결된 소셜 계정 아이디예요."
                    : "연결된 소셜 계정 아이디가 없어요.",
                badge: account.snsId ? "연결됨" : "미연결",
                tone: account.snsId ? "verified" : "neutral",
            },
            {
                id: "phone",
                title: "전화번호",
                value: account.phone || "연결 안 됨",
                helper: account.phoneVerified
                    ? "확인된 연락처예요."
                    : account.phone
                      ? "등록되어 있지만 확인이 필요해요."
                      : "등록된 전화번호가 없어요.",
                badge: account.phoneVerified ? "확인됨" : account.phone ? "확인 필요" : "미연결",
                tone: account.phoneVerified ? "verified" : account.phone ? "warning" : "neutral",
            },
            {
                id: "login",
                title: "로그인 방식",
                value: account.providerLabel,
                helper: account.isLoggedIn
                    ? "현재 로그인에 사용 중인 방식이에요."
                    : "로그인 후 확인할 수 있어요.",
                badge: account.isLoggedIn ? "사용 중" : "대기",
                tone: account.isLoggedIn ? "info" : "neutral",
            },
            {
                id: "notifications",
                title: "알림 설정",
                value: notificationSummary.value,
                helper: notificationSummary.helper,
                badge: notificationSummary.badge,
                tone: notificationSummary.tone,
                actionLabel: account.isLoggedIn ? "열기" : undefined,
                actionHref: account.isLoggedIn ? "/my/settings/notifications" : undefined,
            },
        ],
        [account, notificationSummary]
    );

    const partnerStoreInfoValue = useMemo(() => {
        const base = pickString(partner.company_name);
        const partnerType = describePartnerType(partner.business_type);
        return pickString(
            [base, partnerType].filter(Boolean).join(" · "),
            base,
            partnerType,
            "등록된 매장 정보 없음"
        );
    }, [partner.business_type, partner.company_name]);

    const partnerStoreInfoHelper = useMemo(() => {
        const details = [
            partner.address,
            partner.website,
            partner.visibility_status === null
                ? ""
                : partner.visibility_status
                  ? "탐색 노출 중"
                  : "탐색 비노출",
        ].filter(Boolean);

        return details.length > 0
            ? details.join(" · ")
            : "현재 저장된 매장 요약 정보가 없어요.";
    }, [partner.address, partner.visibility_status, partner.website]);

    const partnerRows = useMemo<SettingsRow[]>(
        () => [
            {
                id: "partner-status",
                title: "파트너 상태",
                value: partnerStatusMeta.value,
                helper: partnerStatusMeta.helper,
                badge: partnerStatusMeta.badge,
                tone: partnerStatusMeta.tone,
                actionLabel: partnerStatusMeta.actionLabel,
                actionHref: partnerStatusMeta.actionHref,
            },
            {
                id: "store-info",
                title: "매장 정보",
                value: partnerStoreInfoValue,
                helper: partnerStoreInfoHelper,
                badge: partner.company_name ? "등록됨" : "미등록",
                tone: partner.company_name ? "info" : "neutral",
            },
            {
                id: "operating-hours",
                title: "운영시간",
                value: "등록된 운영시간 없음",
                helper: "운영시간 정보가 연결되면 이곳에서 함께 확인할 수 있어요.",
                badge: "미등록",
                tone: "neutral",
            },
            {
                id: "booking-requests",
                title: "예약 요청 관리",
                value: partner.status === "approved" ? "별도 관리 메뉴 없음" : "파트너 승인 후 확인",
                helper:
                    partner.status === "approved"
                        ? "현재는 예약 요청 요약만 구조화해 두었어요."
                        : "파트너 상태가 승인되면 관련 항목을 더 쉽게 확인할 수 있어요.",
                badge: partner.status === "approved" ? "안내" : "대기",
                tone: partner.status === "approved" ? "info" : "neutral",
            },
            {
                id: "service-pricing",
                title: "시술/가격 관리",
                value: "별도 관리 메뉴 없음",
                helper: "현재 코드베이스에서 바로 연결되는 시술/가격 관리 화면은 없어요.",
                badge: "안내",
                tone: "neutral",
            },
        ],
        [
            partner.company_name,
            partner.status,
            partnerStatusMeta,
            partnerStoreInfoHelper,
            partnerStoreInfoValue,
        ]
    );

    const adminRows = useMemo<SettingsRow[]>(
        () => [
            {
                id: "partner-approval",
                title: "파트너 승인",
                value: "신청 내역 확인",
                helper: "기존 관리자 화면에서 파트너 신청을 승인하거나 거절할 수 있어요.",
                badge: "열기 가능",
                tone: "verified",
                actionLabel: "열기",
                actionHref: "/admin/partners",
            },
            {
                id: "booking-issues",
                title: "예약 이슈",
                value: "예약 요청 및 변경 검토",
                helper: "기존 관리자 화면에서 예약 상태와 변경 요청을 확인할 수 있어요.",
                badge: "열기 가능",
                tone: "verified",
                actionLabel: "열기",
                actionHref: "/admin/bookings/beauty",
            },
            {
                id: "user-management",
                title: "사용자 관리",
                value: "계정 권한 확인",
                helper: "기존 관리자 화면에서 사용자와 관리자 권한을 관리할 수 있어요.",
                badge: "열기 가능",
                tone: "verified",
                actionLabel: "열기",
                actionHref: "/admin/users",
            },
            {
                id: "notice-management",
                title: "공지 관리",
                value: "연결된 관리 화면 없음",
                helper: "현재 코드베이스에는 공지 전용 관리자 화면이 연결되어 있지 않아요.",
                badge: "미연결",
                tone: "neutral",
            },
        ],
        []
    );

    const activePanel = useMemo(() => {
        if (activeTab === "partner") {
            return visibleTabs.find((tab) => tab.id === "partner") ?? visibleTabs[0];
        }

        if (activeTab === "admin") {
            return visibleTabs.find((tab) => tab.id === "admin") ?? visibleTabs[0];
        }

        return visibleTabs[0];
    }, [activeTab, visibleTabs]);

    const activeRows =
        activeTab === "partner" ? partnerRows : activeTab === "admin" ? adminRows : personalRows;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.navButton} onClick={() => router.push("/my")}>
                    {t("common.back")}
                </button>
            </header>

            <section className={styles.profileCard}>
                <div className={styles.avatar}>{initials || "ME"}</div>
                <div className={styles.profileContent}>
                    <h1 className={styles.pageTitle}>{pageTitle}</h1>
                </div>
            </section>

            {!loading && !account.isLoggedIn ? (
                <section className={styles.noticeCard}>
                    <div>
                        <h2 className={styles.noticeTitle}>로그인 후 더 많은 설정을 볼 수 있어요.</h2>
                        <p className={styles.noticeText}>
                            개인 탭은 지금도 확인할 수 있지만, 연결된 값과 알림 상태는 로그인 후 표시돼요.
                        </p>
                    </div>
                    <button
                        className={styles.primaryButton}
                        onClick={() => router.push("/auth/login")}
                    >
                        {t("common.login")}
                    </button>
                </section>
            ) : null}

            {visibleTabs.length > 1 ? (
                <nav className={styles.tabBar} aria-label="설정 탭">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            className={`${styles.tabButton} ${
                                activeTab === tab.id ? styles.tabButtonActive : ""
                            }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            ) : null}

            <section className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h2 className={styles.panelTitle}>{activePanel.label}</h2>
                    <p className={styles.panelDescription}>{activePanel.desc}</p>
                </div>

                <div className={styles.itemsList}>
                    {activeRows.map((row) => (
                        <article key={row.id} className={styles.itemCard}>
                            <div className={styles.itemTop}>
                                <div className={styles.itemText}>
                                    <h3 className={styles.itemTitle}>{row.title}</h3>
                                    <p className={styles.itemValue}>{row.value}</p>
                                    <p className={styles.itemHelper}>{row.helper}</p>
                                </div>
                                <span className={`${styles.badge} ${styles[`${row.tone}Badge`]}`}>
                                    {row.badge}
                                </span>
                            </div>
                            {row.actionHref ? (
                                <div className={styles.itemActions}>
                                    <button
                                        type="button"
                                        className={styles.secondaryButton}
                                        onClick={() => router.push(row.actionHref!)}
                                    >
                                        {row.actionLabel}
                                    </button>
                                </div>
                            ) : null}
                        </article>
                    ))}
                </div>
            </section>

            {loading ? <div className={styles.loadingText}>{t("common.loading")}</div> : null}

            <div className={styles.bottomSpacer} />
        </div>
    );
}
