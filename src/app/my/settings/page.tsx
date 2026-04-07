"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { supabase } from "@/lib/supabaseClient";
import {
    getPhoneCountryById,
    getPhoneCountryOptions,
    normalizePhoneNationalNumberInput,
    normalizeStructuredPhoneInput,
    parseStructuredPhoneInput,
} from "@/lib/settings/contact";
import styles from "./settings.module.css";

type PartnerStatus = "none" | "pending" | "approved" | "rejected";
type TabId = "personal" | "partner" | "admin";
type Tone = "verified" | "warning" | "neutral" | "info";

interface ProfileRecord {
    id: string;
    display_name: string | null;
    nickname: string | null;
    nickname_updated_at: string | null;
    role: string | null;
    created_at: string | null;
    avatar_url: string | null;
    avatar_path?: string | null;
    sns?: string | null;
    phone: string | null;
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
    nickname: string;
    nicknameUpdatedAt: string | null;
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

type ContactField = "sns" | "phone";
type SaveStatus = "idle" | "saving" | "success" | "error";

const NICKNAME_COOLDOWN_DAYS = 90;

interface ContactDraftState {
    sns: string;
}

interface ContactSaveState {
    sns: SaveStatus;
    phone: SaveStatus;
}

interface ContactMessageState {
    sns: string;
    phone: string;
}

interface ContactSaveResponse {
    ok?: boolean;
    error?: string;
    contact?: {
        sns: string;
        phone: string;
    };
    profile?: ProfileRecord | null;
}

interface HeroCommunityPostRecord {
    type: string | null;
    desc: string | null;
    likes_count: number | null;
}

interface HeroCommunityStats {
    postCount: number;
    reviewCount: number;
    commentCount: number;
    likesReceived: number;
    badge: string;
    points: number;
}

interface HeroBookingRecord {
    status?: string;
    storeId?: string | null;
}

interface HeroBookingStats {
    totalCount: number;
    completedCount: number;
    revisitCount: number;
    badge: string;
}

interface PhoneDraftState {
    countryId: string;
    nationalNumber: string;
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

function getAvatarPublicUrl(path: string): string {
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
}

function getProfileAvatarUrl(profile: ProfileRecord | null): string {
    return profile?.avatar_url || "";
}

function getProfileAvatarPresence(profile: ProfileRecord | null): string {
    return profile?.avatar_url || "";
}

function isReviewCommunityPost(post: HeroCommunityPostRecord): boolean {
    const type = pickString(post.type).toLowerCase();
    const desc = pickString(post.desc).toLowerCase();

    return (
        type === "review" ||
        type === "travel" ||
        desc.includes("[category:beauty_review]") ||
        desc.includes("[category:food_review]") ||
        desc.includes("[category:travel_review]")
    );
}

function getCommunityBadge(points: number, t: TFunction): string {
    if (points >= 80) return t("settings_page.badges.community.leader", { defaultValue: "커뮤니티 리더" });
    if (points >= 30) return t("settings_page.badges.community.trend", { defaultValue: "트렌드 피커" });
    if (points >= 10) return t("settings_page.badges.community.mate", { defaultValue: "뷰티 메이트" });
    return t("settings_page.badges.community.sprout", { defaultValue: "새싹" });
}

function getBookingBadge(completedCount: number, t: TFunction): string {
    if (completedCount >= 10) return t("settings_page.badges.booking.vvip", { defaultValue: "VVIP" });
    if (completedCount >= 5) return t("settings_page.badges.booking.vip", { defaultValue: "VIP" });
    if (completedCount >= 2) return t("settings_page.badges.booking.regular", { defaultValue: "Regular" });
    return t("settings_page.badges.booking.new", { defaultValue: "New" });
}

const EMPTY_COMMUNITY_STATS: HeroCommunityStats = {
    postCount: 0,
    reviewCount: 0,
    commentCount: 0,
    likesReceived: 0,
    badge: "",
    points: 0,
};

const EMPTY_BOOKING_STATS: HeroBookingStats = {
    totalCount: 0,
    completedCount: 0,
    revisitCount: 0,
    badge: "",
};

async function loadCommunityStats(userId: string, displayName: string, t: TFunction): Promise<HeroCommunityStats> {
    let posts: HeroCommunityPostRecord[] = [];

    const authoredPosts = await supabase
        .from("community_posts")
        .select("type, desc, likes_count")
        .eq("author_user_id", userId);

    if (!authoredPosts.error && Array.isArray(authoredPosts.data)) {
        posts = authoredPosts.data as HeroCommunityPostRecord[];
    } else if (displayName) {
        const fallbackPosts = await supabase
            .from("community_posts")
            .select("type, desc, likes_count")
            .eq("author", displayName);

        if (!fallbackPosts.error && Array.isArray(fallbackPosts.data)) {
            posts = fallbackPosts.data as HeroCommunityPostRecord[];
        }
    }

    const authoredComments = await supabase
        .from("community_comments")
        .select("*", { count: "exact", head: true })
        .eq("author_user_id", userId);

    const reviewCount = posts.filter((post) => isReviewCommunityPost(post)).length;
    const postCount = Math.max(posts.length - reviewCount, 0);
    const commentCount = authoredComments.error ? 0 : authoredComments.count ?? 0;
    const likesReceived = posts.reduce((sum, post) => sum + (post.likes_count ?? 0), 0);
    const points = postCount * 3 + commentCount + likesReceived + reviewCount * 5;

    return {
        postCount,
        reviewCount,
        commentCount,
        likesReceived,
        badge: getCommunityBadge(points, t),
        points,
    };
}

async function loadBookingStats(accessToken: string, t: TFunction): Promise<HeroBookingStats> {
    try {
        const response = await fetch("/api/bookings/beauty/mine", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
        });

        const body = (await response.json()) as {
            ok?: boolean;
            items?: HeroBookingRecord[];
        };

        if (!response.ok || !body.ok || !Array.isArray(body.items)) {
            return EMPTY_BOOKING_STATS;
        }

        const completedItems = body.items.filter((item) => item.status === "completed");
        const storeVisitMap = new Map<string, number>();

        completedItems.forEach((item) => {
            if (!item.storeId) return;
            storeVisitMap.set(item.storeId, (storeVisitMap.get(item.storeId) ?? 0) + 1);
        });

        const revisitCount = Array.from(storeVisitMap.values()).reduce(
            (sum, count) => sum + Math.max(count - 1, 0),
            0
        );

        return {
            totalCount: body.items.length,
            completedCount: completedItems.length,
            revisitCount,
            badge: getBookingBadge(completedItems.length, t),
        };
    } catch {
        return EMPTY_BOOKING_STATS;
    }
}

function buildNotificationSummary(
    preferences: NotificationPreferences | null,
    isLoggedIn: boolean,
    t: TFunction
): NotificationSummary {
    if (!isLoggedIn) {
        return {
            value: t("settings_page.personal.notifications.value_out", { defaultValue: "로그인 후 확인" }),
            helper: t("settings_page.personal.notifications.helper_out", {
                defaultValue: "로그인 후 현재 알림 상태를 볼 수 있어요.",
            }),
            badge: t("settings_page.personal.notifications.badge_out", { defaultValue: "대기" }),
            tone: "neutral",
        };
    }

    if (!preferences) {
        return {
            value: t("settings_page.personal.notifications.value_error", { defaultValue: "설정 확인 필요" }),
            helper: t("settings_page.personal.notifications.helper_error", {
                defaultValue: "알림 상태를 불러오지 못했어요.",
            }),
            badge: t("settings_page.personal.notifications.badge_error", { defaultValue: "확인 필요" }),
            tone: "warning",
        };
    }

    const enabledChannels = [
        preferences.inAppEnabled ? t("settings_page.personal.notifications.channel_app", { defaultValue: "앱" }) : "",
        preferences.emailEnabled ? t("settings_page.personal.notifications.channel_email", { defaultValue: "이메일" }) : "",
    ].filter(Boolean);
    const enabledTypes = [
        preferences.bookingUpdatesEnabled,
        preferences.changeRequestUpdatesEnabled,
        preferences.alternativeOfferUpdatesEnabled,
    ].filter(Boolean).length;

    if (enabledChannels.length === 0) {
        return {
            value: t("settings_page.personal.notifications.value_all_off", { defaultValue: "모든 알림 OFF" }),
            helper: t("settings_page.personal.notifications.helper_summary", {
                count: enabledTypes,
                defaultValue: `예약 관련 알림 ${enabledTypes}/3개만 수신 중이에요.`,
            }),
            badge: t("settings_page.personal.notifications.badge_off", { defaultValue: "OFF" }),
            tone: "warning",
        };
    }

    const value =
        enabledChannels.length === 2
            ? t("settings_page.personal.notifications.value_both_on", { defaultValue: "앱 · 이메일 ON" })
            : t("settings_page.personal.notifications.value_single_on", {
                  channel: enabledChannels[0],
                  defaultValue: `${enabledChannels[0]}만 ON`,
              });

    return {
        value,
        helper: t("settings_page.personal.notifications.helper_summary", {
            count: enabledTypes,
            defaultValue: `예약 관련 알림 ${enabledTypes}/3개를 수신 중이에요.`,
        }),
        badge:
            enabledTypes === 3
                ? t("settings_page.personal.notifications.badge_all_on", { defaultValue: "활성" })
                : t("settings_page.personal.notifications.badge_partial_on", { defaultValue: "일부만 ON" }),
        tone: enabledTypes === 3 ? "verified" : "info",
    };
}

function getPartnerStatusMeta(status: PartnerStatus, t: TFunction) {
    switch (status) {
        case "approved":
            return {
                value: t("settings_page.partner.status.approved.value", { defaultValue: "승인 완료" }),
                helper: t("settings_page.partner.status.approved.helper", {
                    defaultValue: "현재 파트너 계정으로 확인되고 있어요.",
                }),
                badge: t("settings_page.partner.status.approved.badge", { defaultValue: "승인" }),
                tone: "verified" as Tone,
                actionLabel: t("settings_page.messages.action_contact", { defaultValue: "문의" }),
                actionHref: "/my/support?tab=general",
            };
        case "pending":
            return {
                value: t("settings_page.partner.status.pending.value", { defaultValue: "검토 중" }),
                helper: t("settings_page.partner.status.pending.helper", {
                    defaultValue: "제출한 파트너 정보를 검토하고 있어요.",
                }),
                badge: t("settings_page.partner.status.pending.badge", { defaultValue: "대기" }),
                tone: "warning" as Tone,
                actionLabel: t("settings_page.messages.action_contact", { defaultValue: "문의" }),
                actionHref: "/my/support?tab=general",
            };
        case "rejected":
            return {
                value: t("settings_page.partner.status.rejected.value", { defaultValue: "보완 후 재신청" }),
                helper: t("settings_page.partner.status.rejected.helper", {
                    defaultValue: "신청 정보를 보완한 뒤 다시 제출할 수 있어요.",
                }),
                badge: t("settings_page.partner.status.rejected.badge", { defaultValue: "보완 필요" }),
                tone: "warning" as Tone,
                actionLabel: t("settings_page.partner.status.rejected.cta", { defaultValue: "재신청" }),
                actionHref: "/auth/partner-signup",
            };
        default:
            return {
                value: t("settings_page.partner.status.none.value", { defaultValue: "파트너 정보 없음" }),
                helper: t("settings_page.partner.status.none.helper", { defaultValue: "등록된 파트너 상태가 없어요." }),
                badge: t("settings_page.partner.status.none.badge", { defaultValue: "없음" }),
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
    const internationalPhoneExample = "01012345678";
    const phoneCountryOptions = getPhoneCountryOptions();
    const phonePlaceholder = t("my_page.settings.account.phone.placeholder", {
        defaultValue: `예: ${internationalPhoneExample}`,
    });
    const phoneEmptyHelper = t("my_page.settings.account.phone.helper_empty", {
        defaultValue: `국가번호를 포함해 입력해 주세요. 예: ${internationalPhoneExample}`,
    });
    const phoneSavedHelper = t("my_page.settings.account.phone.helper_saved", {
        defaultValue: "현재 저장된 국제형 전화번호예요.",
    });
    const phoneValidationMessage = t("my_page.settings.account.phone.helper_invalid", {
        defaultValue: `국가번호를 포함한 국제형으로 입력해 주세요. 예: ${internationalPhoneExample}`,
    });

    const structuredPhoneEmptyHelper =
        phoneEmptyHelper || t("settings_page.personal.phone.helper_empty_fallback", { defaultValue: "국가번호를 고른 뒤 전화번호를 입력하면 국제 형식(E.164)으로 저장돼요." });
    const structuredPhoneSavedHelper =
        phoneSavedHelper || t("settings_page.personal.phone.helper_saved_fallback", { defaultValue: "현재 저장된 번호는 국제 형식(E.164)으로 유지되고 있어요." });
    const structuredPhoneValidationMessage =
        phoneValidationMessage || t("settings_page.personal.phone.helper_invalid_fallback", { defaultValue: "국가번호를 선택하고 전화번호를 숫자로 입력해 주세요." });

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>("personal");
    const [account, setAccount] = useState<AccountState>({
        displayName: "",
        nickname: "",
        nicknameUpdatedAt: null,
        email: "",
        joinedAt: "",
        emailVerified: false,
        phone: "",
        phoneVerified: false,
        providerLabel: t("settings_page.personal.login.value_out", { defaultValue: "로그인 필요" }),
        snsId: "",
        isLoggedIn: false,
    });
    const [profile, setProfile] = useState<ProfileRecord | null>(null);
    const [partner, setPartner] = useState<PartnerRecord>(EMPTY_PARTNER);
    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
    const [notificationSummary, setNotificationSummary] = useState<NotificationSummary>(
        buildNotificationSummary(null, false, t)
    );
    const [viewerId, setViewerId] = useState("");
    const [avatarPath, setAvatarPath] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [communityStats, setCommunityStats] = useState<HeroCommunityStats>(EMPTY_COMMUNITY_STATS);
    const [bookingStats, setBookingStats] = useState<HeroBookingStats>(EMPTY_BOOKING_STATS);
    const [contactDrafts, setContactDrafts] = useState<ContactDraftState>({
        sns: "",
    });
    const [nicknameDraft, setNicknameDraft] = useState("");
    const [nicknameSaveStatus, setNicknameSaveStatus] = useState<SaveStatus>("idle");
    const [nicknameMessage, setNicknameMessage] = useState("");

    const [phoneDraft, setPhoneDraft] = useState<PhoneDraftState>(() => parseStructuredPhoneInput(""));
    const [contactSaveState, setContactSaveState] = useState<ContactSaveState>({
        sns: "idle",
        phone: "idle",
    });
    const [contactMessages, setContactMessages] = useState<ContactMessageState>({
        sns: "",
        phone: "",
    });
    const avatarInputRef = useRef<HTMLInputElement | null>(null);

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
                    setViewerId("");
                    setAvatarPath("");
                    setAvatarUrl("");
                    setCommunityStats(EMPTY_COMMUNITY_STATS);
                    setBookingStats(EMPTY_BOOKING_STATS);
                    setAccount({
                        displayName: pickString(storedUser.name),
                        nickname: "",
                        nicknameUpdatedAt: null,
                        email: pickString(storedUser.email),
                        joinedAt: "",
                        emailVerified: false,
                        phone: "",
                        phoneVerified: false,
                        providerLabel: t("settings_page.personal.login.value_out", { defaultValue: "로그인 필요" }),
                        snsId: "",
                        isLoggedIn: false,
                    });
                    setNicknameDraft("");
                    setContactDrafts({
                        sns: "",
                    });
                    setPhoneDraft(parseStructuredPhoneInput(""));
                    setContactSaveState({
                        sns: "idle",
                        phone: "idle",
                    });
                    setContactMessages({
                        sns: "",
                        phone: "",
                    });
                    const notLoggedInSummary = buildNotificationSummary(null, false, t);
                    setNotificationSummary(notLoggedInSummary);
                    setNotificationPrefs(null);
                    setLoading(false);
                    return;
                }

                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error("[settings-contact] profile_load_failed", profileError);
                }

                const nextProfile = (profileData as ProfileRecord | null) ?? null;
                const email = pickString(user.email, storedUser.email);
                const providerSource = pickString(
                    user.app_metadata?.provider,
                    Array.isArray(user.app_metadata?.providers)
                        ? user.app_metadata?.providers[0]
                        : ""
                );
                const nextAccount: AccountState = {
                    displayName: pickString(
                        nextProfile?.nickname,
                        nextProfile?.display_name,
                        user.user_metadata?.full_name,
                        user.user_metadata?.name,
                        storedUser.name
                    ),
                    nickname: pickString(nextProfile?.nickname),
                    nicknameUpdatedAt: nextProfile?.nickname_updated_at ?? null,
                    email,
                    joinedAt: pickString(nextProfile?.created_at, user.created_at),
                    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
                    phone: nextProfile ? pickString(nextProfile.phone) : pickString(user.phone),
                    phoneVerified:
                        !nextProfile || nextProfile.phone === null || nextProfile.phone === undefined
                            ? Boolean(user.phone && user.phone_confirmed_at)
                            : false,
                    providerLabel: providerSource ? titleCase(providerSource) : t("settings_page.personal.login.provider_email", { defaultValue: "이메일" }),
                    snsId: nextProfile ? pickString(nextProfile.sns) : extractSnsId(user),
                    isLoggedIn: true,
                };

                const {
                    data: { session },
                } = await supabase.auth.getSession();

                const [partnerResult, notificationResult, communityResult, bookingResult] = await Promise.all([
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
                        let prefs: NotificationPreferences | null = null;
                        if (!session?.access_token) {
                            return { summary: buildNotificationSummary(null, true, t), prefs: null };
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
                                prefs = body.preferences;
                                return { summary: buildNotificationSummary(prefs, true, t), prefs };
                            }
                        } catch {
                            // Ignored
                        }

                        return { summary: buildNotificationSummary(null, true, t), prefs: null };
                    })(),
                    loadCommunityStats(user.id, nextAccount.displayName, t),
                    session?.access_token
                        ? loadBookingStats(session.access_token, t)
                        : Promise.resolve(EMPTY_BOOKING_STATS),
                ]);

                if (!isMounted) return;

                setProfile(nextProfile);
                setViewerId(user.id);
                setAvatarPath(getProfileAvatarPresence(nextProfile));
                setAvatarUrl(getProfileAvatarUrl(nextProfile));
                setAccount(nextAccount);
                setNicknameDraft(nextAccount.nickname);
                setContactDrafts({
                    sns: nextAccount.snsId,
                });
                setPhoneDraft(parseStructuredPhoneInput(nextAccount.phone));
                setContactSaveState({
                    sns: "idle",
                    phone: "idle",
                });
                setContactMessages({
                    sns: "",
                    phone: "",
                });
                setNotificationPrefs(notificationResult.prefs);
                setNotificationSummary(notificationResult.summary);
                setCommunityStats(communityResult);
                setBookingStats(bookingResult);
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
    }, [t]);

    const initials = useMemo(() => {
        return account.displayName
            .split(" ")
            .map((part) => part[0] ?? "")
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }, [account.displayName]);

    const pageTitle = account.displayName || t("settings_page.hero.default_title", { defaultValue: "내 설정" });
    const heroSummaryText = t("settings_page.hero.stats", {
        postCount: communityStats.postCount,
        reviewCount: communityStats.reviewCount,
        bookingCount: bookingStats.totalCount,
        defaultValue: `게시글 ${communityStats.postCount} · 후기 ${communityStats.reviewCount} · 예약 ${bookingStats.totalCount}`,
    });

    const selectedPhoneCountry = getPhoneCountryById(phoneDraft.countryId);

    const validatePhoneInput = (draft: PhoneDraftState) => {
        if (!draft.nationalNumber.trim()) {
            return "";
        }

        if (!normalizeStructuredPhoneInput(draft.countryId, draft.nationalNumber)) {
            return structuredPhoneValidationMessage;
        }

        return "";
    };

    const getContactSaveErrorMessage = (field: ContactField, errorCode?: string) => {
        if (errorCode === "unauthorized") {
            return t("settings_page.messages.unauthorized", { defaultValue: "로그인 세션을 다시 확인해 주세요." });
        }

        if (errorCode === "profile_not_found") {
            return t("settings_page.messages.profile_not_found", {
                defaultValue: "프로필 정보를 찾지 못했어요. 다시 로그인해 주세요.",
            });
        }

        if (errorCode === "contact_schema_missing") {
            return field === "sns"
                ? t("settings_page.messages.schema_missing_sns", {
                      defaultValue: "SNS 저장 컬럼이 아직 DB에 적용되지 않았어요.",
                  })
                : t("settings_page.messages.schema_missing_phone", {
                      defaultValue: "전화번호 저장 컬럼이 아직 DB에 적용되지 않았어요.",
                  });
        }

        return t("settings_page.messages.save_error", { defaultValue: "저장하지 못했어요." });
    };

    const handleSnsDraftChange = (value: string) => {
        setContactDrafts({
            sns: value,
        });
        setContactSaveState((current) => ({
            ...current,
            sns: "idle",
        }));
        setContactMessages((current) => ({
            ...current,
            sns: "",
        }));
    };

    const handlePhoneDraftChange = (nextDraft: PhoneDraftState) => {
        setPhoneDraft(nextDraft);
        setContactSaveState((current) => ({
            ...current,
            phone: "idle",
        }));
        setContactMessages((current) => ({
            ...current,
            phone: "",
        }));
    };

    const handleContactDraftChange = (field: ContactField, value: string) => {
        if (field === "sns") {
            handleSnsDraftChange(value);
        }
    };

    const handleContactSave = async (field: ContactField) => {
        if (!viewerId) {
            return;
        }

        const normalizedPhoneDraft = normalizeStructuredPhoneInput(
            phoneDraft.countryId,
            phoneDraft.nationalNumber
        );
        const phoneError = validatePhoneInput(phoneDraft);

        if (field === "phone" && phoneError) {
            setContactSaveState((current) => ({
                ...current,
                phone: "error",
            }));
            setContactMessages((current) => ({
                ...current,
                phone: phoneError,
            }));
            return;
        }

        setContactSaveState((current) => ({
            ...current,
            [field]: "saving",
        }));
        setContactMessages((current) => ({
            ...current,
            [field]: "",
        }));

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error("unauthorized");
            }

            const response = await fetch("/api/my/settings/contact", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    field,
                    value: field === "sns" ? contactDrafts.sns : normalizedPhoneDraft ?? "",
                }),
            });

            const body = (await response.json()) as ContactSaveResponse;

            if (!response.ok || !body.ok || !body.contact) {
                throw new Error(body.error || "failed_to_update_contact");
            }

            const savedSns = body.contact.sns;
            const savedPhone = body.contact.phone;

            setProfile(body.profile ?? null);
            setAccount((current) => ({
                ...current,
                snsId: savedSns,
                phone: savedPhone,
                phoneVerified: field === "phone" ? false : current.phoneVerified,
            }));
            setContactDrafts({
                sns: savedSns,
            });
            setPhoneDraft(parseStructuredPhoneInput(savedPhone));
            setContactSaveState((current) => ({
                ...current,
                [field]: "success",
            }));
            setContactMessages((current) => ({
                ...current,
                [field]:
                    field === "sns"
                        ? t("settings_page.messages.sns_saved", { defaultValue: "SNS 아이디를 저장했어요." })
                        : t("settings_page.messages.phone_saved", { defaultValue: "전화번호를 저장했어요." }),
            }));
        } catch (error) {
            console.error("[settings-contact] save_failed", error);
            const errorCode = error instanceof Error ? error.message : undefined;
            if (field === "sns") {
                setContactDrafts({
                    sns: account.snsId,
                });
            } else {
                setPhoneDraft(parseStructuredPhoneInput(account.phone));
            }
            setContactSaveState((current) => ({
                ...current,
                [field]: "error",
            }));
            setContactMessages((current) => ({
                ...current,
                [field]: getContactSaveErrorMessage(field, errorCode),
            }));
        }

        return;
    };

    const handleNicknameSave = async () => {
        if (!viewerId) return;

        const { canUpdate, daysLeft } = getNicknameCooldownInfo(account.nicknameUpdatedAt);

        if (!canUpdate) {
            setNicknameSaveStatus("error");
            setNicknameMessage(
                t("settings_page.messages.nickname_cooldown", {
                    days: daysLeft,
                    defaultValue: `별명은 90일마다 한 번만 변경할 수 있습니다. (남은 기간: ${daysLeft}일)`,
                })
            );
            return;
        }

        const newNickname = nicknameDraft.trim();
        if (!newNickname) {
            setNicknameSaveStatus("error");
            setNicknameMessage(t("settings_page.messages.nickname_empty", { defaultValue: "별명을 입력해 주세요." }));
            return;
        }

        if (newNickname === account.nickname) {
            setNicknameSaveStatus("idle");
            setNicknameMessage("");
            return;
        }

        setNicknameSaveStatus("saving");
        setNicknameMessage("");

        try {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from("profiles")
                .update({
                    nickname: newNickname,
                    nickname_updated_at: now,
                })
                .eq("id", viewerId)
                .select("*")
                .maybeSingle();

            if (error) throw error;

            const nextProfile = data as ProfileRecord | null;
            if (!nextProfile) throw new Error("profile_not_found");

            setProfile(nextProfile);
            setAccount((current) => ({
                ...current,
                displayName: nextProfile.nickname || nextProfile.display_name || current.displayName,
                nickname: nextProfile.nickname || "",
                nicknameUpdatedAt: nextProfile.nickname_updated_at,
            }));
            setNicknameDraft(nextProfile.nickname || "");
            setNicknameSaveStatus("success");
            setNicknameMessage(
                t("settings_page.messages.nickname_saved", { defaultValue: "별명을 성공적으로 변경했습니다." })
            );
        } catch (error) {
            console.error("[settings-nickname] save_failed", error);
            setNicknameSaveStatus("error");
            setNicknameMessage(
                t("settings_page.messages.nickname_error", {
                    defaultValue: "별명을 저장하지 못했습니다. 다시 시도해 주세요.",
                })
            );
        }
    };

    const getNicknameCooldownInfo = (updatedAt: string | null) => {
        if (!updatedAt) return { canUpdate: true, daysLeft: 0, nextAvailableDate: null };

        const lastUpdate = new Date(updatedAt);
        const now = new Date();
        const diffTime = now.getTime() - lastUpdate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const canUpdate = diffDays >= NICKNAME_COOLDOWN_DAYS;
        const daysLeft = Math.max(0, NICKNAME_COOLDOWN_DAYS - diffDays);

        const nextDate = new Date(lastUpdate.getTime() + NICKNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

        return { canUpdate, daysLeft, nextAvailableDate: nextDate };
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file || !viewerId) {
            return;
        }

        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${viewerId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

        setAvatarUploading(true);
        setAvatarError(null);

        try {
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, { upsert: false });

            if (uploadError) {
                throw uploadError;
            }

            const publicUrl = getAvatarPublicUrl(filePath);
            const { data: updatedProfile, error: profileError } = await supabase
                .from("profiles")
                .update({ avatar_url: publicUrl })
                .eq("id", viewerId)
                .select("*")
                .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            const nextProfile = (updatedProfile as ProfileRecord | null) ?? null;

            if (!nextProfile) {
                throw new Error("profile_not_found");
            }

            setProfile(nextProfile);
            setAvatarUrl(nextProfile.avatar_url || publicUrl);
            
            // Sync dashboard-like view name if nickname exists, etc.
            setAccount((current) => ({
                ...current,
                displayName: nextProfile.nickname || nextProfile.display_name || current.displayName,
            }));
        } catch (error) {
            console.error("[settings-avatar] upload_failed", error);
            setAvatarError(t("settings_page.hero.avatar.error", { defaultValue: "이미지를 바꾸지 못했어요." }));
        } finally {
            setAvatarUploading(false);
        }
    };

    const showPartnerTab = partner.status !== "none";
    const showAdminTab = isAdminRole(profile?.role);
    const partnerStatusMeta = useMemo(() => getPartnerStatusMeta(partner.status, t), [partner.status, t]);

    const visibleTabs = useMemo(() => {
        const tabs: Array<{ id: TabId; label: string; desc: string }> = [
            {
                id: "personal",
                label: t("settings_page.tabs.personal.label", { defaultValue: "개인" }),
                desc: t("settings_page.tabs.personal.desc", {
                    defaultValue: "이메일, 연락처, 로그인과 알림 설정을 확인하세요.",
                }),
            },
        ];

        if (showPartnerTab) {
            tabs.push({
                id: "partner",
                label: t("settings_page.tabs.partner.label", { defaultValue: "파트너" }),
                desc: t("settings_page.tabs.partner.desc", {
                    defaultValue: "파트너 상태와 매장 운영 관련 항목을 한곳에서 확인하세요.",
                }),
            });
        }

        if (showAdminTab) {
            tabs.push({
                id: "admin",
                label: t("settings_page.tabs.admin.label", { defaultValue: "관리자" }),
                desc: t("settings_page.tabs.admin.desc", {
                    defaultValue: "관리 권한에 연결된 항목을 빠르게 확인하세요.",
                }),
            });
        }

        return tabs;
    }, [showAdminTab, showPartnerTab, t]);

    useEffect(() => {
        if (!visibleTabs.some((tab) => tab.id === activeTab)) {
            setActiveTab("personal");
        }
    }, [activeTab, visibleTabs]);

    // Re-sync translated states when t changes (client-side language settlement)
    useEffect(() => {
        if (typeof window !== "undefined") {
            setAccount(prev => ({
                ...prev,
                providerLabel: prev.isLoggedIn 
                    ? (prev.providerLabel.includes("@") || prev.providerLabel === "이메일" || prev.providerLabel === "Email"
                        ? t("settings_page.personal.login.provider_email", { defaultValue: "이메일" })
                        : prev.providerLabel)
                    : t("settings_page.personal.login.value_out", { defaultValue: "로그인 필요" })
            }));
            setNotificationSummary(buildNotificationSummary(notificationPrefs, account.isLoggedIn, t));
            setCommunityStats(prev => ({
                ...prev,
                badge: getCommunityBadge(prev.points, t)
            }));
            setBookingStats(prev => ({
                ...prev,
                badge: getBookingBadge(prev.completedCount, t)
            }));
        }
    }, [t, account.isLoggedIn, notificationPrefs]);

    const personalRows = useMemo<SettingsRow[]>(
        () => [
            {
                id: "nickname",
                title: t("settings_page.personal.nickname.title", { defaultValue: "별명" }),
                value: account.nickname || t("settings_page.badges.nickname_unset", { defaultValue: "설정 안 됨" }),
                helper: account.nickname
                    ? t("settings_page.personal.nickname.helper_set", {
                          defaultValue: "커뮤니티와 프로필에 표시되는 이름이에요.",
                      })
                    : t("settings_page.personal.nickname.helper_unset", {
                          defaultValue: "아직 별명이 설정되지 않았어요.",
                      }),
                badge: account.nickname
                    ? t("settings_page.personal.nickname.badge_set", { defaultValue: "설정됨" })
                    : t("settings_page.personal.nickname.badge_unset", { defaultValue: "미설정" }),
                tone: account.nickname ? "info" : "neutral",
            },
            {
                id: "email",
                title: t("settings_page.personal.email.title", { defaultValue: "이메일" }),
                value: account.email || t("settings_page.personal.email.value_none", { defaultValue: "연결 안 됨" }),
                helper: account.emailVerified
                    ? t("settings_page.personal.email.helper_verified", { defaultValue: "현재 확인된 이메일 주소예요." })
                    : account.email
                      ? t("settings_page.personal.email.helper_unverified", {
                            defaultValue: "이메일 확인이 아직 필요해요.",
                        })
                      : t("settings_page.personal.email.helper_none", { defaultValue: "연결된 이메일이 없어요." }),
                badge: account.emailVerified
                    ? t("settings_page.personal.email.badge_verified", { defaultValue: "확인됨" })
                    : account.email
                      ? t("settings_page.personal.email.badge_unverified", { defaultValue: "미확인" })
                      : t("settings_page.personal.email.badge_none", { defaultValue: "미연결" }),
                tone: account.emailVerified ? "verified" : account.email ? "warning" : "neutral",
            },
            {
                id: "sns",
                title: t("settings_page.personal.sns.title", { defaultValue: "SNS" }),
                value: account.snsId || t("settings_page.personal.sns.value_none", { defaultValue: "입력 안 됨" }),
                helper: account.snsId
                    ? t("settings_page.personal.sns.helper_set", { defaultValue: "현재 저장된 SNS예요." })
                    : t("settings_page.personal.sns.helper_unset", { defaultValue: "저장된 SNS가 없어요." }),
                badge: account.snsId
                    ? t("settings_page.personal.sns.badge_set", { defaultValue: "저장됨" })
                    : t("settings_page.personal.sns.badge_unset", { defaultValue: "미입력" }),
                tone: account.snsId ? "info" : "neutral",
            },
            {
                id: "phone",
                title: t("settings_page.personal.phone.title", { defaultValue: "전화번호" }),
                value: account.phone || t("settings_page.personal.phone.value_none", { defaultValue: "입력 안 됨" }),
                helper: account.phone
                    ? t("settings_page.personal.phone.helper_set", { defaultValue: "현재 저장된 전화번호예요." })
                    : t("settings_page.personal.phone.helper_unset", { defaultValue: "저장된 전화번호가 없어요." }),
                badge: account.phone
                    ? t("settings_page.personal.phone.badge_set", { defaultValue: "저장됨" })
                    : t("settings_page.personal.phone.badge_unset", { defaultValue: "미입력" }),
                tone: account.phone ? "info" : "neutral",
            },
            {
                id: "login",
                title: t("settings_page.personal.login.title", { defaultValue: "로그인 방식" }),
                value: account.providerLabel,
                helper: account.isLoggedIn
                    ? t("settings_page.personal.login.helper_in", { defaultValue: "현재 로그인에 사용 중인 방식이에요." })
                    : t("settings_page.personal.login.helper_out", { defaultValue: "로그인 후 확인할 수 있어요." }),
                badge: account.isLoggedIn
                    ? t("settings_page.personal.login.badge_in", { defaultValue: "사용 중" })
                    : t("settings_page.personal.login.badge_out", { defaultValue: "대기" }),
                tone: account.isLoggedIn ? "info" : "neutral",
            },
            {
                id: "notifications",
                title: t("settings_page.personal.notifications.title", { defaultValue: "알림 설정" }),
                value: notificationSummary.value,
                helper: notificationSummary.helper,
                badge: notificationSummary.badge,
                tone: notificationSummary.tone,
                actionLabel: account.isLoggedIn
                    ? t("settings_page.messages.action_open", { defaultValue: "열기" })
                    : undefined,
                actionHref: account.isLoggedIn ? "/my/settings/notifications" : undefined,
            },
        ],
        [account, notificationSummary, t]
    );

    const partnerStoreInfoValue = useMemo(() => {
        const base = pickString(partner.company_name);
        const partnerType = describePartnerType(partner.business_type);
        return pickString(
            [base, partnerType].filter(Boolean).join(" · "),
            base,
            partnerType,
            t("settings_page.partner.store.value_none", { defaultValue: "등록된 매장 정보 없음" })
        );
    }, [partner.business_type, partner.company_name, t]);

    const partnerStoreInfoHelper = useMemo(() => {
        const details = [
            partner.address,
            partner.website,
            partner.visibility_status === null
                ? ""
                : partner.visibility_status
                  ? t("settings_page.partner.store.visibility_on", { defaultValue: "탐색 노출 중" })
                  : t("settings_page.partner.store.visibility_off", { defaultValue: "탐색 비노출" }),
        ].filter(Boolean);

        return details.length > 0
            ? details.join(" · ")
            : t("settings_page.partner.store.helper_none", { defaultValue: "현재 저장된 매장 요약 정보가 없어요." });
    }, [partner.address, partner.visibility_status, partner.website, t]);

    const partnerRows = useMemo<SettingsRow[]>(
        () => [
            {
                id: "partner-status",
                title: t("settings_page.partner.status.title", { defaultValue: "파트너 상태" }),
                value: partnerStatusMeta.value,
                helper: partnerStatusMeta.helper,
                badge: partnerStatusMeta.badge,
                tone: partnerStatusMeta.tone,
                actionLabel: partnerStatusMeta.actionLabel,
                actionHref: partnerStatusMeta.actionHref,
            },
            {
                id: "store-info",
                title: t("settings_page.partner.store.title", { defaultValue: "매장 정보" }),
                value: partnerStoreInfoValue,
                helper: partnerStoreInfoHelper,
                badge: partner.company_name
                    ? t("settings_page.partner.store.badge_set", { defaultValue: "등록됨" })
                    : t("settings_page.partner.store.badge_unset", { defaultValue: "미등록" }),
                tone: partner.company_name ? "info" : "neutral",
            },
            {
                id: "operating-hours",
                title: t("settings_page.partner.hours.title", { defaultValue: "운영시간" }),
                value: t("settings_page.partner.hours.value_none", { defaultValue: "등록된 운영시간 없음" }),
                helper: t("settings_page.partner.hours.helper_none", {
                    defaultValue: "운영시간 정보가 연결되면 이곳에서 함께 확인할 수 있어요.",
                }),
                badge: t("settings_page.partner.hours.badge_unset", { defaultValue: "미등록" }),
                tone: "neutral",
            },
            {
                id: "booking-requests",
                title: t("settings_page.partner.bookings.title", { defaultValue: "예약 요청 관리" }),
                value:
                    partner.status === "approved"
                        ? t("settings_page.partner.bookings.value_info", { defaultValue: "별도 관리 메뉴 없음" })
                        : t("settings_page.partner.bookings.value_pending", { defaultValue: "파트너 승인 후 확인" }),
                helper:
                    partner.status === "approved"
                        ? t("settings_page.partner.bookings.helper_approved", {
                              defaultValue: "현재는 예약 요청 요약만 구조화해 두었어요.",
                          })
                        : t("settings_page.partner.bookings.helper_pending", {
                              defaultValue: "파트너 상태가 승인되면 관련 항목을 더 쉽게 확인할 수 있어요.",
                          }),
                badge:
                    partner.status === "approved"
                        ? t("settings_page.partner.bookings.badge_info", { defaultValue: "안내" })
                        : t("settings_page.partner.bookings.badge_pending", { defaultValue: "대기" }),
                tone: partner.status === "approved" ? "info" : "neutral",
            },
            {
                id: "service-pricing",
                title: t("settings_page.partner.pricing.title", { defaultValue: "시술/가격 관리" }),
                value: t("settings_page.partner.pricing.value_none", { defaultValue: "별도 관리 메뉴 없음" }),
                helper: t("settings_page.partner.pricing.helper_none", {
                    defaultValue: "현재 코드베이스에서 바로 연결되는 시술/가격 관리 화면은 없어요.",
                }),
                badge: t("settings_page.partner.pricing.badge_info", { defaultValue: "안내" }),
                tone: "neutral",
            },
        ],
        [
            partnerStatusMeta,
            partnerStoreInfoHelper,
            partnerStoreInfoValue,
            partner.company_name,
            partner.status,
            t,
        ]
    );

    const adminRows = useMemo<SettingsRow[]>(
        () => [
            {
                id: "partner-approval",
                title: t("settings_page.admin.approval.title", { defaultValue: "파트너 승인" }),
                value: t("settings_page.admin.approval.value", { defaultValue: "신청 내역 확인" }),
                helper: t("settings_page.admin.approval.helper", {
                    defaultValue: "기존 관리자 화면에서 파트너 신청을 승인하거나 거절할 수 있어요.",
                }),
                badge: t("settings_page.admin.badge_open", { defaultValue: "열기 가능" }),
                tone: "verified",
                actionLabel: t("settings_page.messages.action_open", { defaultValue: "열기" }),
                actionHref: "/admin/partners",
            },
            {
                id: "booking-issues",
                title: t("settings_page.admin.issues.title", { defaultValue: "예약 이슈" }),
                value: t("settings_page.admin.issues.value", { defaultValue: "예약 요청 및 변경 검토" }),
                helper: t("settings_page.admin.issues.helper", {
                    defaultValue: "기존 관리자 화면에서 예약 상태와 변경 요청을 확인할 수 있어요.",
                }),
                badge: t("settings_page.admin.badge_open", { defaultValue: "열기 가능" }),
                tone: "verified",
                actionLabel: t("settings_page.messages.action_open", { defaultValue: "열기" }),
                actionHref: "/admin/bookings/beauty",
            },
            {
                id: "user-management",
                title: t("settings_page.admin.users.title", { defaultValue: "사용자 관리" }),
                value: t("settings_page.admin.users.value", { defaultValue: "계정 권한 확인" }),
                helper: t("settings_page.admin.users.helper", {
                    defaultValue: "기존 관리자 화면에서 사용자와 관리자 권한을 관리할 수 있어요.",
                }),
                badge: t("settings_page.admin.badge_open", { defaultValue: "열기 가능" }),
                tone: "verified",
                actionLabel: t("settings_page.messages.action_open", { defaultValue: "열기" }),
                actionHref: "/admin/users",
            },
            {
                id: "notice-management",
                title: t("settings_page.admin.notices.title", { defaultValue: "공지 관리" }),
                value: t("settings_page.admin.notices.value", { defaultValue: "연결된 관리 화면 없음" }),
                helper: t("settings_page.admin.notices.helper", {
                    defaultValue: "현재 코드베이스에는 공지 전용 관리자 화면이 연결되어 있지 않아요.",
                }),
                badge: t("settings_page.admin.badge_unlinked", { defaultValue: "미연결" }),
                tone: "neutral",
            },
        ],
        [t]
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

    const renderEditableNicknameCard = (row: SettingsRow) => {
        const { canUpdate, nextAvailableDate } = getNicknameCooldownInfo(account.nicknameUpdatedAt);
        const isSaving = nicknameSaveStatus === "saving";
        const isDirty = nicknameDraft !== account.nickname;
        const canSave = account.isLoggedIn && isDirty && !isSaving && canUpdate;

        const helperMessage =
            nicknameSaveStatus === "error"
                ? nicknameMessage
                : nicknameSaveStatus === "success"
                  ? nicknameMessage
                  : !canUpdate && nextAvailableDate
                    ? t("settings_page.messages.nickname_cooldown_long", {
                          limit: NICKNAME_COOLDOWN_DAYS,
                          date: nextAvailableDate.toLocaleDateString(),
                          defaultValue: `${NICKNAME_COOLDOWN_DAYS}일에 한 번만 변경 가능합니다. (다음 변경 가능일: ${nextAvailableDate.toLocaleDateString()})`,
                      })
                    : row.helper;

        return (
            <article key={row.id} className={styles.itemCard}>
                <div className={styles.itemTop}>
                    <div className={styles.itemText}>
                        <h3 className={styles.itemTitle}>{row.title}</h3>
                    </div>
                    <span className={`${styles.badge} ${styles[`${row.tone}Badge`]}`}>
                        {row.badge}
                    </span>
                </div>
                <div className={styles.inlineEditorRow}>
                    <input
                        type="text"
                        value={nicknameDraft}
                        onChange={(event) => {
                            setNicknameDraft(event.target.value);
                            setNicknameSaveStatus("idle");
                            setNicknameMessage("");
                        }}
                        placeholder={t("settings_page.personal.nickname.placeholder", {
                            defaultValue: "새 별명을 입력해 주세요.",
                        })}
                        className={styles.inlineInput}
                        disabled={!account.isLoggedIn || isSaving || !canUpdate}
                    />
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => void handleNicknameSave()}
                        disabled={!canSave}
                    >
                        {isSaving
                            ? t("settings_page.messages.saving", { defaultValue: "저장 중..." })
                            : t("settings_page.messages.save", { defaultValue: "저장" })}
                    </button>
                </div>
                <p
                    className={`${styles.inlineEditorMessage} ${
                        nicknameSaveStatus === "error" || !canUpdate
                            ? styles.inlineEditorError
                            : nicknameSaveStatus === "success"
                              ? styles.inlineEditorSuccess
                              : ""
                    }`}
                >
                    {helperMessage}
                </p>
            </article>
        );
    };

    const renderEditableContactCard = (row: SettingsRow) => {
        const field = row.id as ContactField;

        if (field === "phone") {
            const saveState = contactSaveState.phone;
            const isSaving = saveState === "saving";
            const savedPhoneDraft = parseStructuredPhoneInput(account.phone);
            const normalizedPhoneDraft =
                normalizeStructuredPhoneInput(phoneDraft.countryId, phoneDraft.nationalNumber) ?? "";
            const validationMessage = validatePhoneInput(phoneDraft);
            const previewMessage =
                normalizedPhoneDraft && normalizedPhoneDraft !== account.phone
                    ? t("settings_page.personal.phone.helper_preview", {
                          value: normalizedPhoneDraft,
                          defaultValue: `저장 시 ${normalizedPhoneDraft} 형태로 저장돼요.`,
                      })
                    : "";
            const helperMessage =
                saveState === "error"
                    ? contactMessages.phone ||
                      validationMessage ||
                      previewMessage ||
                      (account.phone ? structuredPhoneSavedHelper : structuredPhoneEmptyHelper)
                    : saveState === "success"
                      ? contactMessages.phone
                      : validationMessage ||
                        previewMessage ||
                        (account.phone ? structuredPhoneSavedHelper : structuredPhoneEmptyHelper);
            const isDirty = account.phone
                ? phoneDraft.countryId !== savedPhoneDraft.countryId ||
                  phoneDraft.nationalNumber !== savedPhoneDraft.nationalNumber
                : phoneDraft.nationalNumber !== "";
            const canSave = account.isLoggedIn && isDirty && !isSaving && !validationMessage;

            return (
                <article key={row.id} className={styles.itemCard}>
                    <div className={styles.itemTop}>
                        <div className={styles.itemText}>
                            <h3 className={styles.itemTitle}>{row.title}</h3>
                            <p className={styles.itemValue}>
                                {account.phone ||
                                    t("settings_page.personal.phone.value_none", { defaultValue: "입력 안 됨" })}
                            </p>
                        </div>
                        <span className={`${styles.badge} ${styles[`${row.tone}Badge`]}`}>
                            {row.badge}
                        </span>
                    </div>
                    <div className={styles.phoneEditorGrid}>
                        <label className={styles.inputGroup}>
                            <span className={styles.inputLabel}>
                                {t("settings_page.personal.phone.country_label", { defaultValue: "국가번호" })}
                            </span>
                            <select
                                value={phoneDraft.countryId}
                                onChange={(event) =>
                                    handlePhoneDraftChange({
                                        ...phoneDraft,
                                        countryId: event.target.value,
                                    })
                                }
                                className={styles.inlineSelect}
                                disabled={!account.isLoggedIn || isSaving}
                            >
                                {phoneCountryOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className={styles.inputGroup}>
                            <span className={styles.inputLabel}>
                                {t("settings_page.personal.phone.number_label", { defaultValue: "전화번호" })}
                            </span>
                            <input
                                type="tel"
                                inputMode="numeric"
                                value={phoneDraft.nationalNumber}
                                onChange={(event) =>
                                    handlePhoneDraftChange({
                                        ...phoneDraft,
                                        nationalNumber: normalizePhoneNationalNumberInput(
                                            event.target.value
                                        ),
                                    })
                                }
                                placeholder={selectedPhoneCountry.exampleNationalNumber}
                                className={styles.inlineInput}
                                disabled={!account.isLoggedIn || isSaving}
                            />
                        </label>
                    </div>
                    <div className={styles.inlineEditorActions}>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => void handleContactSave(field)}
                            disabled={!canSave}
                        >
                            {isSaving
                                ? t("settings_page.messages.saving", { defaultValue: "저장 중..." })
                                : t("settings_page.messages.save", { defaultValue: "저장" })}
                        </button>
                    </div>
                    <p
                        className={`${styles.inlineEditorMessage} ${
                            saveState === "error" || validationMessage
                                ? styles.inlineEditorError
                                : saveState === "success"
                                  ? styles.inlineEditorSuccess
                                  : ""
                        }`}
                    >
                        {helperMessage}
                    </p>
                </article>
            );
        }

        const draftValue = contactDrafts.sns;
        const saveState = contactSaveState.sns;
        const savedValue = account.snsId;
        const validationMessage = "";
        const helperMessage =
            saveState === "error"
                ? contactMessages.sns || row.helper
                : saveState === "success"
                  ? contactMessages.sns
                  : row.helper;
        const isDirty = draftValue !== savedValue;
        const isSaving = saveState === "saving";
        const canSave =
            account.isLoggedIn && isDirty && !isSaving && !validationMessage;

        return (
            <article key={row.id} className={styles.itemCard}>
                <div className={styles.itemTop}>
                    <div className={styles.itemText}>
                        <h3 className={styles.itemTitle}>{row.title}</h3>
                    </div>
                    <span className={`${styles.badge} ${styles[`${row.tone}Badge`]}`}>
                        {row.badge}
                    </span>
                </div>
                <div className={styles.inlineEditorRow}>
                    <input
                        type="text"
                        value={draftValue}
                        onChange={(event) => handleContactDraftChange(field, event.target.value)}
                        placeholder={
                            field === "sns"
                                ? t("settings_page.personal.sns.placeholder", {
                                      defaultValue: "SNS 아이디를 입력해 주세요.",
                                  })
                                : phonePlaceholder
                        }
                        className={styles.inlineInput}
                        disabled={!account.isLoggedIn || isSaving}
                    />
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => void handleContactSave(field)}
                        disabled={!canSave}
                    >
                        {isSaving
                            ? t("settings_page.messages.saving", { defaultValue: "저장 중..." })
                            : t("settings_page.messages.save", { defaultValue: "저장" })}
                    </button>
                </div>
                <p
                    className={`${styles.inlineEditorMessage} ${
                        saveState === "error" || validationMessage
                            ? styles.inlineEditorError
                            : saveState === "success"
                              ? styles.inlineEditorSuccess
                              : ""
                    }`}
                >
                    {helperMessage}
                </p>
            </article>
        );
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.navButton} onClick={() => router.push("/my")}>
                    {t("common.back")}
                </button>
            </header>

            <section className={styles.profileCard}>
                <div className={styles.heroAvatarArea}>
                    <div className={styles.avatarFrame}>
                        <div className={styles.avatar}>
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt={pageTitle}
                                    fill
                                    className={styles.avatarImage}
                                    sizes="96px"
                                />
                            ) : (
                                initials || t("settings_page.hero.avatar.placeholder", { defaultValue: "ME" })
                            )}
                        </div>
                    </div>
                    {account.isLoggedIn ? (
                        <>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className={styles.avatarInput}
                                onChange={handleAvatarChange}
                                disabled={avatarUploading}
                            />
                            <button
                                type="button"
                                className={styles.avatarButton}
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={avatarUploading}
                            >
                                {avatarUploading
                                    ? t("settings_page.messages.uploading", { defaultValue: "업로드 중..." })
                                    : avatarPath
                                      ? t("settings_page.hero.avatar.change", { defaultValue: "이미지 변경" })
                                      : t("settings_page.hero.avatar.register", { defaultValue: "이미지 등록" })}
                            </button>
                        </>
                    ) : null}
                </div>
                <div className={styles.profileContent}>
                    <h1 className={styles.pageTitle}>{pageTitle}</h1>
                    <div className={styles.heroBadgeRow}>
                        <span className={`${styles.heroBadge} ${styles.communityHeroBadge}`}>
                            {communityStats.badge}
                        </span>
                        <span className={`${styles.heroBadge} ${styles.bookingHeroBadge}`}>
                            {bookingStats.badge}
                        </span>
                    </div>
                    <p className={styles.heroSummary}>{heroSummaryText}</p>
                    {avatarError ? <p className={styles.heroMessage}>{avatarError}</p> : null}
                </div>
            </section>

            {!loading && !account.isLoggedIn ? (
                <section className={styles.noticeCard}>
                    <div>
                        <h2 className={styles.noticeTitle}>
                            {t("settings_page.hero.login_promo.title", {
                                defaultValue: "로그인 후 더 많은 설정을 볼 수 있어요.",
                            })}
                        </h2>
                        <p className={styles.noticeText}>
                            {t("settings_page.hero.login_promo.desc", {
                                defaultValue:
                                    "개인 탭은 지금도 확인할 수 있지만, 연결된 값과 알림 상태는 로그인 후 표시돼요.",
                            })}
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
                <nav className={styles.tabBar} aria-label={t("settings_page.hero.tabs_aria", { defaultValue: "설정 탭" })}>
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
                        row.id === "nickname" ? (
                            renderEditableNicknameCard(row)
                        ) : row.id === "sns" || row.id === "phone" ? (
                            renderEditableContactCard(row)
                        ) : (
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
                        )
                    ))}
                </div>
            </section>

            {loading ? <div className={styles.loadingText}>{t("common.loading")}</div> : null}

            <div className={styles.bottomSpacer} />
        </div>
    );
}
