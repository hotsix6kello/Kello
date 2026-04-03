"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { normalizeInternationalPhoneInput } from "@/lib/settings/contact";
import styles from "./settings.module.css";

type PartnerStatus = "none" | "pending" | "approved" | "rejected";
type TabId = "personal" | "partner" | "admin";
type Tone = "verified" | "warning" | "neutral" | "info";

interface ProfileRecord {
    id: string;
    display_name: string | null;
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

interface ContactDraftState {
    sns: string;
    phone: string;
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

function getCommunityBadge(points: number): string {
    if (points >= 80) return "커뮤니티 리더";
    if (points >= 30) return "트렌드 피커";
    if (points >= 10) return "뷰티 메이트";
    return "새싹";
}

function getBookingBadge(completedCount: number): string {
    if (completedCount >= 10) return "VVIP";
    if (completedCount >= 5) return "VIP";
    if (completedCount >= 2) return "Regular";
    return "New";
}

const EMPTY_COMMUNITY_STATS: HeroCommunityStats = {
    postCount: 0,
    reviewCount: 0,
    commentCount: 0,
    likesReceived: 0,
    badge: "새싹",
};

const EMPTY_BOOKING_STATS: HeroBookingStats = {
    totalCount: 0,
    completedCount: 0,
    revisitCount: 0,
    badge: "New",
};

async function loadCommunityStats(userId: string, displayName: string): Promise<HeroCommunityStats> {
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
        badge: getCommunityBadge(points),
    };
}

async function loadBookingStats(accessToken: string): Promise<HeroBookingStats> {
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
            badge: getBookingBadge(completedItems.length),
        };
    } catch {
        return EMPTY_BOOKING_STATS;
    }
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
    const internationalPhoneExample = "+82 10 1234 5678";
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
    const [viewerId, setViewerId] = useState("");
    const [avatarPath, setAvatarPath] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [communityStats, setCommunityStats] = useState<HeroCommunityStats>(EMPTY_COMMUNITY_STATS);
    const [bookingStats, setBookingStats] = useState<HeroBookingStats>(EMPTY_BOOKING_STATS);
    const [contactDrafts, setContactDrafts] = useState<ContactDraftState>({
        sns: "",
        phone: "",
    });
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
                        email: pickString(storedUser.email),
                        joinedAt: "",
                        emailVerified: false,
                        phone: "",
                        phoneVerified: false,
                        providerLabel: "로그인 필요",
                        snsId: "",
                        isLoggedIn: false,
                    });
                    setContactDrafts({
                        sns: "",
                        phone: "",
                    });
                    setContactSaveState({
                        sns: "idle",
                        phone: "idle",
                    });
                    setContactMessages({
                        sns: "",
                        phone: "",
                    });
                    setNotificationSummary(buildNotificationSummary(null, false));
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
                        nextProfile?.display_name,
                        user.user_metadata?.full_name,
                        user.user_metadata?.name,
                        storedUser.name
                    ),
                    email,
                    joinedAt: pickString(nextProfile?.created_at, user.created_at),
                    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
                    phone: nextProfile ? pickString(nextProfile.phone) : pickString(user.phone),
                    phoneVerified:
                        !nextProfile || nextProfile.phone === null || nextProfile.phone === undefined
                            ? Boolean(user.phone && user.phone_confirmed_at)
                            : false,
                    providerLabel: providerSource ? titleCase(providerSource) : "Email",
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
                    loadCommunityStats(user.id, nextAccount.displayName),
                    session?.access_token
                        ? loadBookingStats(session.access_token)
                        : Promise.resolve(EMPTY_BOOKING_STATS),
                ]);

                if (!isMounted) return;

                setProfile(nextProfile);
                setViewerId(user.id);
                setAvatarPath(nextProfile?.avatar_url ?? "");
                setAvatarUrl(nextProfile?.avatar_url ?? "");
                setAccount(nextAccount);
                setContactDrafts({
                    sns: nextAccount.snsId,
                    phone: nextAccount.phone,
                });
                setContactSaveState({
                    sns: "idle",
                    phone: "idle",
                });
                setContactMessages({
                    sns: "",
                    phone: "",
                });
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
    const heroSummaryText = `게시글 ${communityStats.postCount} · 후기 ${communityStats.reviewCount} · 예약 ${bookingStats.totalCount}`;

    const validatePhoneInput = (value: string) => {
        if (!value.trim()) {
            return "";
        }

        if (!normalizeInternationalPhoneInput(value)) {
            return phoneValidationMessage;
        }

        return "";
    };

    const getContactSaveErrorMessage = (field: ContactField, errorCode?: string) => {
        if (errorCode === "unauthorized") {
            return "로그인 세션을 다시 확인해 주세요.";
        }

        if (errorCode === "profile_not_found") {
            return "프로필 정보를 찾지 못했어요. 다시 로그인해 주세요.";
        }

        if (errorCode === "contact_schema_missing") {
            return field === "sns"
                ? "SNS 저장 컬럼이 아직 DB에 적용되지 않았어요."
                : "전화번호 저장 컬럼이 아직 DB에 적용되지 않았어요.";
        }

        return "저장하지 못했어요.";
    };

    const handleContactDraftChange = (field: ContactField, value: string) => {
        setContactDrafts((current) => ({
            ...current,
            [field]: value,
        }));
        setContactSaveState((current) => ({
            ...current,
            [field]: "idle",
        }));
        setContactMessages((current) => ({
            ...current,
            [field]: "",
        }));
    };

    const handleContactSave = async (field: ContactField) => {
        if (!viewerId) {
            return;
        }

        const phoneError = validatePhoneInput(contactDrafts.phone);

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
                    value: field === "sns" ? contactDrafts.sns : contactDrafts.phone,
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
                phone: savedPhone,
            });
            setContactSaveState((current) => ({
                ...current,
                [field]: "success",
            }));
            setContactMessages((current) => ({
                ...current,
                [field]: field === "sns" ? "SNS 아이디를 저장했어요." : "전화번호를 저장했어요.",
            }));
        } catch (error) {
            console.error("[settings-contact] save_failed", error);
            const errorCode = error instanceof Error ? error.message : undefined;
            setContactDrafts((current) => ({
                ...current,
                ...(field === "sns" ? { sns: account.snsId } : { phone: account.phone }),
            }));
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

            const { error: profileError } = await supabase
                .from("profiles")
                .update({ avatar_path: filePath })
                .eq("id", viewerId);

            if (profileError) {
                throw profileError;
            }

            setAvatarPath(filePath);
            setAvatarUrl(getAvatarPublicUrl(filePath));
            setProfile((current) =>
                current
                    ? {
                          ...current,
                          avatar_path: filePath,
                      }
                    : current
            );
        } catch (error) {
            console.error("[settings-avatar] upload_failed", error);
            setAvatarError("이미지를 바꾸지 못했어요.");
        } finally {
            setAvatarUploading(false);
        }
    };

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
                title: "SNS",
                value: account.snsId || "입력 안 됨",
                helper: account.snsId
                    ? "현재 저장된 sns예요."
                    : "저장된 sns가 없어요.",
                badge: account.snsId ? "저장됨" : "미입력",
                tone: account.snsId ? "info" : "neutral",
            },
            {
                id: "phone",
                title: "전화번호",
                value: account.phone || "입력 안 됨",
                helper: account.phone
                    ? "현재 저장된 전화번호예요."
                    : "저장된 전화번호가 없어요.",
                badge: account.phone ? "저장됨" : "미입력",
                tone: account.phone ? "info" : "neutral",
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

    const renderEditableContactCard = (row: SettingsRow) => {
        const field = row.id as ContactField;
        const draftValue = contactDrafts[field];
        const saveState = contactSaveState[field];
        const savedValue = field === "sns" ? account.snsId : account.phone;
        const validationMessage = field === "phone" ? validatePhoneInput(draftValue) : "";
        const helperMessage =
            saveState === "error"
                ? contactMessages[field] || validationMessage || row.helper
                : saveState === "success"
                  ? contactMessages[field]
                  : validationMessage ||
                    (field === "phone" ? (savedValue ? phoneSavedHelper : phoneEmptyHelper) : row.helper);
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
                        placeholder={field === "sns" ? "SNS 아이디를 입력해 주세요." : phonePlaceholder}
                        className={styles.inlineInput}
                        disabled={!account.isLoggedIn || isSaving}
                    />
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => void handleContactSave(field)}
                        disabled={!canSave}
                    >
                        {isSaving ? "저장 중..." : "저장"}
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
                                initials || "ME"
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
                                {avatarUploading ? "업로드 중..." : avatarPath ? "이미지 변경" : "이미지 등록"}
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
                        row.id === "sns" || row.id === "phone" ? (
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
