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
    if (points >= 80) return t("settings_page.badges.community.leader");
    if (points >= 30) return t("settings_page.badges.community.trend");
    if (points >= 10) return t("settings_page.badges.community.mate");
    return t("settings_page.badges.community.sprout");
}

function getBookingBadge(completedCount: number, t: TFunction): string {
    if (completedCount >= 10) return t("settings_page.badges.booking.vvip");
    if (completedCount >= 5) return t("settings_page.badges.booking.vip");
    if (completedCount >= 2) return t("settings_page.badges.booking.regular");
    return t("settings_page.badges.booking.new");
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
            value: t("settings_page.personal.notifications.value_out"),
            helper: t("settings_page.personal.notifications.helper_out", {
                
            }),
            badge: t("settings_page.personal.notifications.badge_out"),
            tone: "neutral",
        };
    }

    if (!preferences) {
        return {
            value: t("settings_page.personal.notifications.value_error"),
            helper: t("settings_page.personal.notifications.helper_error", {
                
            }),
            badge: t("settings_page.personal.notifications.badge_error"),
            tone: "warning",
        };
    }

    const enabledChannels = [
        preferences.inAppEnabled ? t("settings_page.personal.notifications.channel_app") : "",
        preferences.emailEnabled ? t("settings_page.personal.notifications.channel_email") : "",
    ].filter(Boolean);
    const enabledTypes = [
        preferences.bookingUpdatesEnabled,
        preferences.changeRequestUpdatesEnabled,
        preferences.alternativeOfferUpdatesEnabled,
    ].filter(Boolean).length;

    if (enabledChannels.length === 0) {
        return {
            value: t("settings_page.personal.notifications.value_all_off"),
            helper: t("settings_page.personal.notifications.helper_summary", {
                count: enabledTypes,
            }),
            badge: t("settings_page.personal.notifications.badge_off"),
            tone: "warning",
        };
    }

    const value =
        enabledChannels.length === 2
            ? t("settings_page.personal.notifications.value_both_on")
            : t("settings_page.personal.notifications.value_single_on", {
                  channel: enabledChannels[0],
              });

    return {
        value,
        helper: t("settings_page.personal.notifications.helper_summary", {
            count: enabledTypes,
        }),
        badge:
            enabledTypes === 3
                ? t("settings_page.personal.notifications.badge_all_on")
                : t("settings_page.personal.notifications.badge_partial_on"),
        tone: enabledTypes === 3 ? "verified" : "info",
    };
}

function getPartnerStatusMeta(status: PartnerStatus, t: TFunction) {
    switch (status) {
        case "approved":
            return {
                value: t("settings_page.partner.status.approved.value"),
                helper: t("settings_page.partner.status.approved.helper", {
                    
                }),
                badge: t("settings_page.partner.status.approved.badge"),
                tone: "verified" as Tone,
                actionLabel: t("settings_page.messages.action_contact"),
                actionHref: "/my/support?tab=general",
            };
        case "pending":
            return {
                value: t("settings_page.partner.status.pending.value"),
                helper: t("settings_page.partner.status.pending.helper", {
                    
                }),
                badge: t("settings_page.partner.status.pending.badge"),
                tone: "warning" as Tone,
                actionLabel: t("settings_page.messages.action_contact"),
                actionHref: "/my/support?tab=general",
            };
        case "rejected":
            return {
                value: t("settings_page.partner.status.rejected.value"),
                helper: t("settings_page.partner.status.rejected.helper", {
                    
                }),
                badge: t("settings_page.partner.status.rejected.badge"),
                tone: "warning" as Tone,
                actionLabel: t("settings_page.partner.status.rejected.cta"),
                actionHref: "/auth/partner-signup",
            };
        default:
            return {
                value: t("settings_page.partner.status.none.value"),
                helper: t("settings_page.partner.status.none.helper"),
                badge: t("settings_page.partner.status.none.badge"),
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
    const { t, i18n } = useTranslation("common");
    const phoneCountryOptions = getPhoneCountryOptions();
    const phonePlaceholder = t("my_page.settings.account.phone.placeholder", {
        
    });
    const phoneEmptyHelper = t("my_page.settings.account.phone.helper_empty", {
        
    });
    const phoneSavedHelper = t("my_page.settings.account.phone.helper_saved", {
        
    });
    const phoneValidationMessage = t("my_page.settings.account.phone.helper_invalid", {
        
    });

    const structuredPhoneEmptyHelper =
        phoneEmptyHelper || t("settings_page.personal.phone.helper_empty_fallback");
    const structuredPhoneSavedHelper =
        phoneSavedHelper || t("settings_page.personal.phone.helper_saved_fallback");
    const structuredPhoneValidationMessage =
        phoneValidationMessage || t("settings_page.personal.phone.helper_invalid_fallback");

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
        providerLabel: t("settings_page.personal.login.value_out"),
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [avatarPath, setAvatarPath] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                        providerLabel: t("settings_page.personal.login.value_out"),
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
                    providerLabel: providerSource ? titleCase(providerSource) : t("settings_page.personal.login.provider_email"),
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const initials = useMemo(() => {
        return account.displayName
            .split(" ")
            .map((part) => part[0] ?? "")
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }, [account.displayName]);

    const pageTitle = account.displayName || t("settings_page.hero.default_title");
    const heroSummaryText = t("settings_page.hero.stats", {
        postCount: communityStats.postCount,
        reviewCount: communityStats.reviewCount,
        bookingCount: bookingStats.totalCount,
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
            return t("settings_page.messages.unauthorized");
        }

        if (errorCode === "profile_not_found") {
            return t("settings_page.messages.profile_not_found", {
                
            });
        }

        if (errorCode === "contact_schema_missing") {
            return field === "sns"
                ? t("settings_page.messages.schema_missing_sns", {
                      
                  })
                : t("settings_page.messages.schema_missing_phone", {
                      
                  });
        }

        return t("settings_page.messages.save_error");
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
                        ? t("settings_page.messages.sns_saved")
                        : t("settings_page.messages.phone_saved"),
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
                })
            );
            return;
        }

        const newNickname = nicknameDraft.trim();
        if (!newNickname) {
            setNicknameSaveStatus("error");
            setNicknameMessage(t("settings_page.messages.nickname_empty"));
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
                t("settings_page.messages.nickname_saved")
            );
        } catch (error) {
            console.error("[settings-nickname] save_failed", error);
            setNicknameSaveStatus("error");
            setNicknameMessage(
                t("settings_page.messages.nickname_error", {
                    
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            setAvatarError(t("settings_page.hero.avatar.error"));
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
                label: t("settings_page.tabs.personal.label"),
                desc: t("settings_page.tabs.personal.desc", {
                    
                }),
            },
        ];

        if (showPartnerTab) {
            tabs.push({
                id: "partner",
                label: t("settings_page.tabs.partner.label"),
                desc: t("settings_page.tabs.partner.desc", {
                    
                }),
            });
        }

        if (showAdminTab) {
            tabs.push({
                id: "admin",
                label: t("settings_page.tabs.admin.label"),
                desc: t("settings_page.tabs.admin.desc", {
                    
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
                    ? (prev.providerLabel.includes("@") || ["email", "이메일", "メール", "邮件"].includes(prev.providerLabel.toLowerCase())
                        ? t("settings_page.personal.login.provider_email")
                        : prev.providerLabel)
                    : t("settings_page.personal.login.value_out")
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
                title: t("settings_page.personal.nickname.title"),
                value: account.nickname || t("settings_page.badges.nickname_unset"),
                helper: account.nickname
                    ? t("settings_page.personal.nickname.helper_set", {
                          
                      })
                    : t("settings_page.personal.nickname.helper_unset", {
                          
                      }),
                badge: account.nickname
                    ? t("settings_page.personal.nickname.badge_set")
                    : t("settings_page.personal.nickname.badge_unset"),
                tone: account.nickname ? "info" : "neutral",
            },
            {
                id: "email",
                title: t("settings_page.personal.email.title"),
                value: account.email || t("settings_page.personal.email.value_none"),
                helper: account.emailVerified
                    ? t("settings_page.personal.email.helper_verified")
                    : account.email
                      ? t("settings_page.personal.email.helper_unverified", {
                            
                        })
                      : t("settings_page.personal.email.helper_none"),
                badge: account.emailVerified
                    ? t("settings_page.personal.email.badge_verified")
                    : account.email
                      ? t("settings_page.personal.email.badge_unverified")
                      : t("settings_page.personal.email.badge_none"),
                tone: account.emailVerified ? "verified" : account.email ? "warning" : "neutral",
            },
            {
                id: "sns",
                title: t("settings_page.personal.sns.title"),
                value: account.snsId || t("settings_page.personal.sns.value_none"),
                helper: account.snsId
                    ? t("settings_page.personal.sns.helper_set")
                    : t("settings_page.personal.sns.helper_unset"),
                badge: account.snsId
                    ? t("settings_page.personal.sns.badge_set")
                    : t("settings_page.personal.sns.badge_unset"),
                tone: account.snsId ? "info" : "neutral",
            },
            {
                id: "phone",
                title: t("settings_page.personal.phone.title"),
                value: account.phone || t("settings_page.personal.phone.value_none"),
                helper: account.phone
                    ? t("settings_page.personal.phone.helper_set")
                    : t("settings_page.personal.phone.helper_unset"),
                badge: account.phone
                    ? t("settings_page.personal.phone.badge_set")
                    : t("settings_page.personal.phone.badge_unset"),
                tone: account.phone ? "info" : "neutral",
            },
            {
                id: "login",
                title: t("settings_page.personal.login.title"),
                value: account.providerLabel,
                helper: account.isLoggedIn
                    ? t("settings_page.personal.login.helper_in")
                    : t("settings_page.personal.login.helper_out"),
                badge: account.isLoggedIn
                    ? t("settings_page.personal.login.badge_in")
                    : t("settings_page.personal.login.badge_out"),
                tone: account.isLoggedIn ? "info" : "neutral",
            },
            {
                id: "notifications",
                title: t("settings_page.personal.notifications.title"),
                value: notificationSummary.value,
                helper: notificationSummary.helper,
                badge: notificationSummary.badge,
                tone: notificationSummary.tone,
                actionLabel: account.isLoggedIn
                    ? t("settings_page.messages.action_open")
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
            t("settings_page.partner.store.value_none")
        );
    }, [partner.business_type, partner.company_name, t]);

    const partnerStoreInfoHelper = useMemo(() => {
        const details = [
            partner.address,
            partner.website,
            partner.visibility_status === null
                ? ""
                : partner.visibility_status
                  ? t("settings_page.partner.store.visibility_on")
                  : t("settings_page.partner.store.visibility_off"),
        ].filter(Boolean);

        return details.length > 0
            ? details.join(" · ")
            : t("settings_page.partner.store.helper_none");
    }, [partner.address, partner.visibility_status, partner.website, t]);

    const partnerRows = useMemo<SettingsRow[]>(
        () => [
            {
                id: "partner-status",
                title: t("settings_page.partner.status.title"),
                value: partnerStatusMeta.value,
                helper: partnerStatusMeta.helper,
                badge: partnerStatusMeta.badge,
                tone: partnerStatusMeta.tone,
                actionLabel: partnerStatusMeta.actionLabel,
                actionHref: partnerStatusMeta.actionHref,
            },
            {
                id: "store-info",
                title: t("settings_page.partner.store.title"),
                value: partnerStoreInfoValue,
                helper: partnerStoreInfoHelper,
                badge: partner.company_name
                    ? t("settings_page.partner.store.badge_set")
                    : t("settings_page.partner.store.badge_unset"),
                tone: partner.company_name ? "info" : "neutral",
            },
            {
                id: "operating-hours",
                title: t("settings_page.partner.hours.title"),
                value: t("settings_page.partner.hours.value_none"),
                helper: t("settings_page.partner.hours.helper_none", {
                    
                }),
                badge: t("settings_page.partner.hours.badge_unset"),
                tone: "neutral",
            },
            {
                id: "booking-requests",
                title: t("settings_page.partner.bookings.title"),
                value:
                    partner.status === "approved"
                        ? t("settings_page.partner.bookings.value_info")
                        : t("settings_page.partner.bookings.value_pending"),
                helper:
                    partner.status === "approved"
                        ? t("settings_page.partner.bookings.helper_approved", {
                              
                          })
                        : t("settings_page.partner.bookings.helper_pending", {
                              
                          }),
                badge:
                    partner.status === "approved"
                        ? t("settings_page.partner.bookings.badge_info")
                        : t("settings_page.partner.bookings.badge_pending"),
                tone: partner.status === "approved" ? "info" : "neutral",
            },
            {
                id: "service-pricing",
                title: t("settings_page.partner.pricing.title"),
                value: t("settings_page.partner.pricing.value_none"),
                helper: t("settings_page.partner.pricing.helper_none", {
                    
                }),
                badge: t("settings_page.partner.pricing.badge_info"),
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
                title: t("settings_page.admin.approval.title"),
                value: t("settings_page.admin.approval.value"),
                helper: t("settings_page.admin.approval.helper", {
                    
                }),
                badge: t("settings_page.admin.badge_open"),
                tone: "verified",
                actionLabel: t("settings_page.messages.action_open"),
                actionHref: "/admin/partners",
            },
            {
                id: "booking-issues",
                title: t("settings_page.admin.issues.title"),
                value: t("settings_page.admin.issues.value"),
                helper: t("settings_page.admin.issues.helper", {
                    
                }),
                badge: t("settings_page.admin.badge_open"),
                tone: "verified",
                actionLabel: t("settings_page.messages.action_open"),
                actionHref: "/admin/bookings/beauty",
            },
            {
                id: "user-management",
                title: t("settings_page.admin.users.title"),
                value: t("settings_page.admin.users.value"),
                helper: t("settings_page.admin.users.helper", {
                    
                }),
                badge: t("settings_page.admin.badge_open"),
                tone: "verified",
                actionLabel: t("settings_page.messages.action_open"),
                actionHref: "/admin/users",
            },
            {
                id: "notice-management",
                title: t("settings_page.admin.notices.title"),
                value: t("settings_page.admin.notices.value"),
                helper: t("settings_page.admin.notices.helper", {
                    
                }),
                badge: t("settings_page.admin.badge_unlinked"),
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
                          date: nextAvailableDate.toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : (i18n.language === 'ja' ? 'ja-JP' : 'en-US')),
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
                            ? t("settings_page.messages.saving")
                            : t("settings_page.messages.save")}
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
                                    t("settings_page.personal.phone.value_none")}
                            </p>
                        </div>
                        <span className={`${styles.badge} ${styles[`${row.tone}Badge`]}`}>
                            {row.badge}
                        </span>
                    </div>
                    <div className={styles.phoneEditorGrid}>
                        <label className={styles.inputGroup}>
                            <span className={styles.inputLabel}>
                                {t("settings_page.personal.phone.country_label")}
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
                                {t("settings_page.personal.phone.number_label")}
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
                                ? t("settings_page.messages.saving")
                                : t("settings_page.messages.save")}
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
                            ? t("settings_page.messages.saving")
                            : t("settings_page.messages.save")}
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
            <header className={styles.header} style={{ padding: '12px 0', height: '60px', boxSizing: 'border-box' }}>
                <button 
                    className={styles.navButton} 
                    onClick={() => router.push("/my")}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: '12px' }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                    </svg>
                </button>
            </header>

            <section className={styles.profileCard}>
                <div className={styles.heroAvatarArea}>
                    <div className={styles.avatarFrame}>
                        <div className={styles.avatar} style={{ background: 'none', border: '2.5px solid var(--primary)', borderRadius: '50%', backgroundColor: '#FFF0F3' }}>
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt={pageTitle}
                                    fill
                                    className={styles.avatarImage}
                                    sizes="96px"
                                />
                            ) : (
                                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#FF4D82', width: '55%', height: '55%' }}>
                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            )}
                        </div>
                    </div>
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
                                
                            })}
                        </h2>
                        <p className={styles.noticeText}>
                            {t("settings_page.hero.login_promo.desc", {
                                
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
                <nav className={styles.tabBar} aria-label={t("settings_page.hero.tabs_aria")}>
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
