'use client';

import Image from 'next/image';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './community.module.css';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';

interface Post {
    id: number;
    author: string;
    flag: string;
    type: string;
    title: string;
    desc: string;
    time: string;
    comments: number;
    start_time?: string;
    end_time?: string;
    place_name?: string;
    place_lat?: number;
    place_lng?: number;
}

interface CommunityImageDraft {
    id: string;
    dataUrl: string;
    name: string;
}

type CommunityCategory = 'beauty_review' | 'food_review' | 'travel_review' | 'meetup' | 'help';
type CommunityTag = 'solo_friendly' | 'friends_friendly' | 'photo_spot' | 'waiting' | 'foreigner_friendly';
type CommunityStatus = 'REVIEWS' | 'REACTING' | 'SURVEYING' | 'DRAFTING' | 'CLOSED';
type CommunitySubFilter = 'all' | 'saved' | 'reacted' | 'mine' | 'recruiting' | 'active_reactions' | 'open_meetup' | 'weekend' | 'fresh';

const CATEGORY_OPTIONS: CommunityCategory[] = ['beauty_review', 'food_review', 'travel_review', 'meetup', 'help'];
const SUB_FILTER_OPTIONS: CommunitySubFilter[] = ['all', 'saved', 'reacted', 'mine', 'recruiting', 'active_reactions', 'open_meetup', 'weekend', 'fresh'];
const TAG_OPTIONS: CommunityTag[] = ['solo_friendly', 'friends_friendly', 'photo_spot', 'waiting', 'foreigner_friendly'];
const COMMUNITY_IMAGE_META_KEY = 'IMAGE';
const COMMUNITY_IMAGE_MAX_SIDE = 1280;
const COMMUNITY_IMAGE_LIMIT = 4;

const LEGACY_TAG_MAP: Record<string, CommunityTag> = {
    '혼자 가기 좋음': 'solo_friendly',
    '친구랑 가기 좋음': 'friends_friendly',
    '사진 맛집': 'photo_spot',
    '웨이팅 있음': 'waiting',
    '외국인 편함': 'foreigner_friendly',
};

const STATUS_KEY_MAP: Record<CommunityStatus, 'reviews' | 'reacting' | 'surveying' | 'drafting' | 'closed'> = {
    REVIEWS: 'reviews',
    REACTING: 'reacting',
    SURVEYING: 'surveying',
    DRAFTING: 'drafting',
    CLOSED: 'closed',
};

const isCommunityCategory = (value: string): value is CommunityCategory =>
    CATEGORY_OPTIONS.includes(value as CommunityCategory);

const normalizeCommunityTag = (value: string): CommunityTag | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (TAG_OPTIONS.includes(trimmed as CommunityTag)) return trimmed as CommunityTag;
    return LEGACY_TAG_MAP[trimmed] ?? null;
};

const getDatabaseTypeForCategory = (category: CommunityCategory) => {
    if (category === 'beauty_review' || category === 'food_review') return 'review';
    if (category === 'travel_review') return 'travel';
    return category;
};

const getPostCategory = (post: Pick<Post, 'type' | 'desc'>): CommunityCategory => {
    const categoryMatch = post.desc.match(/\[CATEGORY:(.*?)\]/);
    const explicitCategory = categoryMatch?.[1]?.trim();

    if (explicitCategory && isCommunityCategory(explicitCategory)) {
        return explicitCategory as CommunityCategory;
    }

    if (post.type === 'review') return 'beauty_review';
    if (post.type === 'travel') return 'travel_review';
    if (post.type === 'meetup') return 'meetup';
    return 'help';
};

const getMetaValue = (desc: string, key: string) => desc.match(new RegExp(`\\[${key}:(.*?)\\]`))?.[1] ?? '';
const getMetaValues = (desc: string, key: string) =>
    Array.from(desc.matchAll(new RegExp(`\\[${key}:(.*?)\\]`, 'g')))
        .map((match) => match[1]?.trim() ?? '')
        .filter(Boolean);

const stripCommunityMetadata = (desc: string) => desc
    .replace(/\[CATEGORY:.*?\]\s*/g, '')
    .replace(/\[REGION:.*?\]\s*/g, '')
    .replace(/\[POINT:.*?\]\s*/g, '')
    .replace(/\[TAGS:.*?\]\s*/g, '')
    .replace(/\[MEETUP_OPEN:.*?\]\s*/g, '')
    .replace(/\[IMAGE:.*?\]\s*/g, '')
    .trim();

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
            resolve(result);
            return;
        }
        reject(new Error('Invalid file result'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
});

const loadImageElement = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
});

const prepareCommunityImage = async (file: File) => {
    const originalDataUrl = await readFileAsDataUrl(file);
    const image = await loadImageElement(originalDataUrl);
    const longestSide = Math.max(image.width, image.height);

    if (!longestSide || longestSide <= COMMUNITY_IMAGE_MAX_SIDE) {
        return originalDataUrl;
    }

    const scale = COMMUNITY_IMAGE_MAX_SIDE / longestSide;
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
        return originalDataUrl;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/jpeg', 0.82);
};

const hasMeaningfulErrorValue = (value: unknown) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;

    return false;
};

const toErrorDetailText = (value: unknown): string | null => {
    if (!hasMeaningfulErrorValue(value)) return null;
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    if (Array.isArray(value)) {
        const normalizedValues = value
            .map((item) => toErrorDetailText(item))
            .filter((item): item is string => Boolean(item));

        return normalizedValues.length > 0 ? normalizedValues.join(', ') : null;
    }

    if (typeof value === 'object') {
        const normalizedEntries = Object.entries(value as Record<string, unknown>)
            .map(([key, item]) => {
                const normalizedItem = toErrorDetailText(item);
                return normalizedItem ? `${key}: ${normalizedItem}` : null;
            })
            .filter((item): item is string => Boolean(item));

        return normalizedEntries.length > 0 ? normalizedEntries.join(', ') : null;
    }

    return null;
};

const getMeaningfulFetchError = (error: unknown): Record<string, string> | null => {
    if (!error) return null;

    if (typeof error === 'string') {
        const message = error.trim();
        return message ? { message } : null;
    }

    if (error instanceof Error) {
        return error.message ? { message: error.message } : null;
    }

    if (typeof error !== 'object') return null;

    const candidate = error as Record<string, unknown>;
    if (Object.keys(candidate).length === 0) return null;

    const details = Object.fromEntries(
        ['message', 'details', 'hint', 'status', 'code', 'error']
            .map((key) => [key, toErrorDetailText(candidate[key])])
            .filter(([, value]) => Boolean(value))
    ) as Record<string, string>;

    return Object.keys(details).length > 0 ? details : null;
};

const formatMeaningfulFetchError = (error: Record<string, string> | null) => {
    if (!error) return null;

    const entries = Object.entries(error)
        .filter(([, value]) => value.trim().length > 0)
        .map(([key, value]) => `${key}: ${value}`);

    return entries.length > 0 ? entries.join(' | ') : null;
};

const getCategoryLabel = (t: (key: string, options?: Record<string, unknown>) => string, category: CommunityCategory) =>
    t(`community_page.categories.${category}`);

const getSubFilterLabel = (t: (key: string, options?: Record<string, unknown>) => string, subFilter: CommunitySubFilter) =>
    t(`community_page.sub_filters.${subFilter}`);

const getStatusLabel = (t: (key: string, options?: Record<string, unknown>) => string, status: string) => {
    const key = STATUS_KEY_MAP[status as CommunityStatus];
    return key ? t(`community_page.status.${key}`) : status;
};

const getTagLabel = (t: (key: string, options?: Record<string, unknown>) => string, tag: string) => {
    const normalizedTag = normalizeCommunityTag(tag);
    return normalizedTag ? t(`community_page.tags.${normalizedTag}`) : tag;
};

export default function CommunityPage() {
    const { t } = useTranslation('common');
    const router = useRouter();
    const [filter, setFilter] = useState<string>('all');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedError, setFeedError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [subFilter, setSubFilter] = useState('all');
    const [sortBy, setSortBy] = useState('latest');

    const [isWriting, setIsWriting] = useState(false);
    const [newType, setNewType] = useState<CommunityCategory>('beauty_review');
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [placeName, setPlaceName] = useState('');
    const [newRegion, setNewRegion] = useState('');
    const [newPoint, setNewPoint] = useState('');
    const [newTags, setNewTags] = useState<CommunityTag[]>([]);
    const [isOpenForMeetup, setIsOpenForMeetup] = useState(false);
    const [newImages, setNewImages] = useState<CommunityImageDraft[]>([]);
    const [isPreparingImage, setIsPreparingImage] = useState(false);

    // Step 17: Activity Tracking States
    const [savedIds, setSavedIds] = useState<number[]>([]);
    const [reactedIds, setReactedIds] = useState<number[]>([]);
    const [recentIds, setRecentIds] = useState<number[]>([]);

    const communityFetchErrorMessage = t('community_page.states.fetch_failed_desc');
    const communityCategories = CATEGORY_OPTIONS.map((id) => ({ id, label: getCategoryLabel(t, id) }));
    const communitySubFilters = SUB_FILTER_OPTIONS.map((id) => ({ id, label: getSubFilterLabel(t, id) }));
    const tagChoices = TAG_OPTIONS.map((id) => ({ id, label: getTagLabel(t, id) }));
    const getCategoryText = (category: CommunityCategory) => getCategoryLabel(t, category);
    const getStatusText = (status: string) => getStatusLabel(t, status);

    const getHint = () => t(`community_page.form.category_hints.${newType}`);

    const getNavSummary = () => {
        const currentTab = filter === 'all'
            ? t('community_page.categories.all')
            : getCategoryText(filter as CommunityCategory);
        const currentSub = communitySubFilters.find((sub) => sub.id === subFilter)?.label || '';
        
        if (subFilter === 'all') return t('community_page.nav_summary.all', { tab: currentTab });
        if (subFilter === 'active_reactions') return t('community_page.nav_summary.active_reactions', { tab: currentTab });
        if (subFilter === 'open_meetup') return t('community_page.nav_summary.open_meetup', { tab: currentTab });
        if (subFilter === 'weekend') return t('community_page.nav_summary.weekend', { tab: currentTab });
        return t('community_page.nav_summary.default', { sub: currentSub, tab: currentTab });
    };

    // For simplicity, we can default these or let the user choose. We'll set a default Seoul coordinate if a place name is given.
    const [placeLat, setPlaceLat] = useState<number | null>(null);
    const [placeLng, setPlaceLng] = useState<number | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPostId, setEditingPostId] = useState<number | null>(null);

    const [loggedInUserName, setLoggedInUserName] = useState("Jessie Kim");
    const imageInputRef = useRef<HTMLInputElement | null>(null);

    // Step 15: Onboarding States
    const [isBannerClosed, setIsBannerClosed] = useState(false);

    const searchParams = useSearchParams();
    useEffect(() => {
        const initialSearch = searchParams.get('search');
        if (initialSearch) setSearchQuery(initialSearch);
    }, [searchParams]);

    // Step 16: Quality Signals Helper
    const getQualitySignals = (post: Post) => {
        const signals: { id: string; label: string; type: string }[] = [];
        const isReview = post.type === 'review';
        const cleanDescText = post.desc.replace(/\[.*?\]/g, '').trim();
        const hasPoint = post.desc.includes('[POINT:');
        const hasTags = post.desc.includes('[TAGS:');
        const hasResult = post.desc.includes('[RESULT:') || post.desc.includes('[TIPS:');
        const commentsCount = post.comments || 0;

        if (isReview && cleanDescText.length > 80 && hasPoint && hasTags) {
            signals.push({ id: 'organized', label: t('community_page.quality_signals.organized'), type: 'well_organized' });
        }
        if (commentsCount >= 5) {
            signals.push({ id: 'active', label: t('community_page.quality_signals.active'), type: 'active' });
        }
        if (hasResult) {
            signals.push({ id: 'asset', label: t('community_page.quality_signals.asset'), type: 'asset' });
        }
        if (post.desc.includes('[MEETUP_OPEN:true]') && commentsCount >= 3) {
            signals.push({ id: 'mate', label: t('community_page.quality_signals.mate'), type: 'mate' });
        }
        return signals;
    };

    // Step 18: Next Best Action Helper
    interface RecommendedAction {
        id: string;
        type: 'mine' | 'reacted' | 'saved';
        badge: string;
        label: string;
        desc: string;
        cta: string;
        link: string;
    }

    const getNextActions = (): RecommendedAction[] => {
        const actions: RecommendedAction[] = [];
        
        // 1. My Own Posts needing updates
        const myPosts = posts.filter(p => p.author === loggedInUserName);
        myPosts.forEach(p => {
            const hasResult = p.desc.includes('[RESULT:') || p.desc.includes('[TIPS:');
            const isClosed = p.desc.includes('[STATUS:CLOSED]');
            if (isClosed && !hasResult) {
                actions.push({
                    id: `mine-result-${p.id}`,
                    type: 'mine',
                    badge: t('community_page.next_actions.mine_result.badge'),
                    label: p.title,
                    desc: t('community_page.next_actions.mine_result.desc'),
                    cta: t('community_page.next_actions.mine_result.cta'),
                    link: `/community/${p.id}`
                });
            } else if (p.comments >= 5) {
                actions.push({
                    id: `mine-active-${p.id}`,
                    type: 'mine',
                    badge: t('community_page.next_actions.mine_active.badge'),
                    label: p.title,
                    desc: t('community_page.next_actions.mine_active.desc'),
                    cta: t('community_page.next_actions.mine_active.cta'),
                    link: `/community/${p.id}`
                });
            }
        });

        // 2. Reacted posts needing more input
        reactedIds.forEach(rid => {
            const p = posts.find(post => post.id === rid);
            if (!p) return;
            const isSurveying = p.desc.includes('[STATUS:SURVEYING]');
            if (isSurveying) {
                actions.push({
                    id: `reacted-survey-${p.id}`,
                    type: 'reacted',
                    badge: t('community_page.next_actions.reacted_survey.badge'),
                    label: p.title,
                    desc: t('community_page.next_actions.reacted_survey.desc'),
                    cta: t('community_page.next_actions.reacted_survey.cta'),
                    link: `/community/${p.id}`
                });
            }
        });

        // 3. Saved posts with updates
        savedIds.forEach(sid => {
            const p = posts.find(post => post.id === sid);
            if (!p) return;
            const hasResult = p.desc.includes('[RESULT:') || p.desc.includes('[TIPS:');
            if (hasResult) {
                actions.push({
                    id: `saved-result-${p.id}`,
                    type: 'saved',
                    badge: t('community_page.next_actions.saved_result.badge'),
                    label: p.title,
                    desc: t('community_page.next_actions.saved_result.desc'),
                    cta: t('community_page.next_actions.saved_result.cta'),
                    link: `/community/${p.id}`
                });
            }
        });

        return actions;
    };

    // Step 22: Feedback & Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleToggleSaveInFeed = (e: React.MouseEvent, postId: number) => {
        e.stopPropagation();
        const saved = JSON.parse(localStorage.getItem('kello_saved_posts') || '[]');
        let newSaved;
        if (saved.includes(postId)) {
            newSaved = saved.filter((id: number) => id !== postId);
            showToast(t('community_page.toasts.save_removed'), 'info');
        } else {
            newSaved = [...saved, postId];
            showToast(t('community_page.toasts.save_added'));
        }
        localStorage.setItem('kello_saved_posts', JSON.stringify(newSaved));
        setSavedIds(newSaved);
    };

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        setFeedError(null);

        try {
            const { data, error } = await supabase
                .from('community_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (Array.isArray(data)) {
                setPosts(data as Post[]);
                return;
            }

            const meaningfulError = getMeaningfulFetchError(error);
            const errorLogMessage = formatMeaningfulFetchError(meaningfulError);

            if (errorLogMessage) {
                console.warn('Community posts fetch issue:', errorLogMessage);
                setFeedError(communityFetchErrorMessage);
                setPosts((prevPosts) => (prevPosts.length > 0 ? prevPosts : []));
                return;
            }

            setPosts([]);
        } catch (error) {
            const meaningfulError = getMeaningfulFetchError(error);
            const errorLogMessage = formatMeaningfulFetchError(meaningfulError);

            if (errorLogMessage) {
                console.warn('Community posts fetch issue:', errorLogMessage);
                setFeedError(communityFetchErrorMessage);
                setPosts((prevPosts) => (prevPosts.length > 0 ? prevPosts : []));
            } else {
                setPosts([]);
            }
        } finally {
            // Artificial delay for smoother UX transition
            setTimeout(() => setLoading(false), 300);
        }
    }, [communityFetchErrorMessage]);

    useEffect(() => {
        const bannerState = localStorage.getItem('kello_community_banner_closed');
        if (bannerState === 'true') setIsBannerClosed(true);

        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                if (parsed.name) setLoggedInUserName(parsed.name);
            }
        } catch {
            // ignore
        }
        
        // Step 17: Load Activity
        const saved = JSON.parse(localStorage.getItem('kello_saved_posts') || '[]');
        const reacted = JSON.parse(localStorage.getItem('kello_reacted_posts') || '[]');
        const recent = JSON.parse(localStorage.getItem('kello_recently_viewed') || '[]');
        setSavedIds(saved);
        setReactedIds(reacted);
        setRecentIds(recent);

        fetchPosts();
    }, [fetchPosts]);

    const closeBanner = () => {
        setIsBannerClosed(true);
        localStorage.setItem('kello_community_banner_closed', 'true');
    };

    const resetDraftForm = (category: CommunityCategory = 'beauty_review') => {
        setEditingPostId(null);
        setNewType(category);
        setNewTitle('');
        setNewDesc('');
        setStartTime('');
        setEndTime('');
        setPlaceName('');
        setNewRegion('');
        setNewPoint('');
        setNewTags([]);
        setIsOpenForMeetup(false);
        setPlaceLat(null);
        setPlaceLng(null);
        setNewImages([]);
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    const openComposer = (category: CommunityCategory = 'beauty_review') => {
        resetDraftForm(category);
        setIsWriting(true);
    };

    const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) return;

        const validFiles = files.filter((file) => file.type.startsWith('image/'));
        if (validFiles.length !== files.length) {
            alert(t('community_page.form.image.file_only_alert'));
        }

        const availableSlots = COMMUNITY_IMAGE_LIMIT - newImages.length;
        if (availableSlots <= 0) {
            alert(t('community_page.form.image.limit_alert', { count: COMMUNITY_IMAGE_LIMIT }));
            event.target.value = '';
            return;
        }

        const selectedFiles = validFiles.slice(0, availableSlots);
        if (selectedFiles.length < validFiles.length) {
            alert(t('community_page.form.image.limit_alert', { count: COMMUNITY_IMAGE_LIMIT }));
        }

        if (selectedFiles.length === 0) {
            event.target.value = '';
            return;
        }

        setIsPreparingImage(true);

        try {
            const preparedImages = await Promise.all(
                selectedFiles.map(async (file, index) => ({
                    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                    dataUrl: await prepareCommunityImage(file),
                    name: file.name
                }))
            );
            setNewImages((prevImages) => [...prevImages, ...preparedImages].slice(0, COMMUNITY_IMAGE_LIMIT));
        } catch {
            alert(t('community_page.form.image.load_failed_alert'));
        } finally {
            setIsPreparingImage(false);
            event.target.value = '';
        }
    };

    const handleRemoveImage = (imageId: string) => {
        setNewImages((prevImages) => prevImages.filter((image) => image.id !== imageId));
    };

    // Comment logic moved to detail page

    const handleDeletePost = async (id: number) => {
        if (confirm(t('community_page.actions.delete_confirm'))) {
            await supabase.from('community_posts').delete().eq('id', id);
            fetchPosts();
            showToast(t('community_page.toasts.deleted'));
        }
    };

    const handleSubmit = async () => {
        if (!newTitle.trim() || !newDesc.trim()) return;
        setIsSubmitting(true);
        const databaseType = getDatabaseTypeForCategory(newType);
        const imageMeta = newImages
            .map((image) => `\n[${COMMUNITY_IMAGE_META_KEY}:${image.dataUrl}]`)
            .join('');
        const composedDesc = `${stripCommunityMetadata(newDesc)}\n\n[CATEGORY:${newType}]\n[REGION:${newRegion}]\n[POINT:${newPoint}]\n[TAGS:${newTags.join(',')}]\n[MEETUP_OPEN:${isOpenForMeetup}]${imageMeta}`;

        const fakeUser = { author: loggedInUserName, flag: '🌍' };

        if (editingPostId) {
            const { error } = await supabase.from('community_posts').update({
                type: databaseType,
                title: newTitle,
                desc: composedDesc,
                start_time: startTime || null,
                end_time: endTime || null,
                place_name: placeName || null,
                place_lat: placeName ? (placeLat || 37.5665) : null,
                place_lng: placeName ? (placeLng || 126.9780) : null
            }).eq('id', editingPostId);

            if (!error) {
                setIsWriting(false);
                resetDraftForm();
                fetchPosts(); // Reload feed
                showToast(t('community_page.toasts.updated'));
            } else {
                alert(t('community_page.errors.update_failed'));
            }
        } else {
            const { error } = await supabase.from('community_posts').insert([{
                author: fakeUser.author,
                flag: fakeUser.flag,
                type: databaseType,
                title: newTitle,
                desc: composedDesc,
                time: t('community_page.time.just_now'),
                comments: 0,
                start_time: startTime || null,
                end_time: endTime || null,
                place_name: placeName || null,
                place_lat: placeName ? (placeLat || 37.5665) : null,
                place_lng: placeName ? (placeLng || 126.9780) : null
            }]);

            if (!error) {
                setIsWriting(false);
                resetDraftForm();
                fetchPosts(); // Reload feed
                showToast(t('community_page.toasts.created'));
            } else {
                alert(t('community_page.errors.post_failed', { message: error.message }));
            }
        }
        setIsSubmitting(false);
    };

    const handleEditPost = (post: Post) => {
        const category = getPostCategory(post);
        const tags = getMetaValue(post.desc, 'TAGS')
            .split(',')
            .map((tag) => normalizeCommunityTag(tag))
            .filter((tag): tag is CommunityTag => Boolean(tag));

        setEditingPostId(post.id);
        setNewType(category);
        setNewTitle(post.title);
        setNewDesc(stripCommunityMetadata(post.desc));
        setStartTime(post.start_time || '');
        setEndTime(post.end_time || '');
        setPlaceName(post.place_name || '');
        setNewRegion(getMetaValue(post.desc, 'REGION'));
        setNewPoint(getMetaValue(post.desc, 'POINT'));
        setNewTags(tags);
        setIsOpenForMeetup(getMetaValue(post.desc, 'MEETUP_OPEN') === 'true');
        setNewImages(
            getMetaValues(post.desc, COMMUNITY_IMAGE_META_KEY).slice(0, COMMUNITY_IMAGE_LIMIT).map((dataUrl, index) => ({
                id: `saved-${post.id}-${index}`,
                dataUrl,
                name: t('community_page.form.image.saved_name', { index: index + 1 })
            }))
        );
        setPlaceLat(post.place_lat || null);
        setPlaceLng(post.place_lng || null);
        setIsWriting(true);
    };

    const filteredPosts = posts
        .filter(p => {
            const postCategory = getPostCategory(p);
            const matchesTab = filter === 'all' || postCategory === filter;
            const normalizedSearchQuery = searchQuery.toLowerCase();
            const matchesSearch = p.title.toLowerCase().includes(normalizedSearchQuery) ||
                stripCommunityMetadata(p.desc).toLowerCase().includes(normalizedSearchQuery);
            
            if (!matchesSearch) return false;

            // Step 17: Activity Filters - These ignore the 'Tab' filter for convenience
            if (subFilter === 'saved') return savedIds.includes(p.id);
            if (subFilter === 'reacted') return reactedIds.includes(p.id);
            if (subFilter === 'mine') return p.author === loggedInUserName;

            if (!matchesTab) return false;

            // Sub Filters
            if (subFilter === 'recruiting') return !p.desc.includes('[STATUS:CLOSED]');
            if (subFilter === 'active_reactions') return p.comments >= 4;
            if (subFilter === 'open_meetup') return p.desc.includes('[MEETUP_OPEN:true]');
            if (subFilter === 'weekend') return p.desc.includes('주말');
            if (subFilter === 'fresh') return p.comments >= 1 || p.desc.includes('[RESULT:') || p.desc.includes('[TIPS:');
            
            return true;
        })
        .sort((a, b) => {
            if (subFilter === 'fresh') return b.comments - a.comments; // 가짜 신선도: 반응 많은 순
            if (sortBy === 'reactions') return b.comments - a.comments;
            if (sortBy === 'draft') {
                const aDraft = a.comments >= 2 ? 1 : 0;
                const bDraft = b.comments >= 2 ? 1 : 0;
                return bDraft - aDraft || b.comments - a.comments;
            }
            // Default latest (created_at is implicitly sorted by fetch order, but we use ID for safety)
            return b.id - a.id;
        });

    const hasSearchInput = searchQuery.trim().length > 0;
    const hasNoPosts = posts.length === 0;
    const showFeedErrorNotice = !loading && Boolean(feedError) && posts.length > 0;
    const showFeedErrorState = !loading && Boolean(feedError) && posts.length === 0;
    const showEmptyState = !loading && !showFeedErrorState && filteredPosts.length === 0;
    const emptyStateTitle = showFeedErrorState
        ? t('community_page.states.fetch_failed_title')
        : hasNoPosts
            ? t('community_page.states.empty_title')
            : hasSearchInput || filter !== 'all' || subFilter !== 'all'
            ? t('community_page.states.no_results_title')
            : t('community_page.states.empty_title');
    const emptyStateDesc = showFeedErrorState
        ? feedError ?? communityFetchErrorMessage
        : hasNoPosts
            ? t('community_page.states.empty_desc')
            : hasSearchInput || subFilter !== 'all'
            ? t('community_page.states.no_results_desc')
            : t('community_page.states.empty_desc');
    const emptyStateTip = showFeedErrorState
        ? t('community_page.states.fetch_failed_tip')
        : t('community_page.states.empty_tip');
    const isBeautyDraft = newType === 'beauty_review';
    const isFoodDraft = newType === 'food_review';
    const isTravelDraft = newType === 'travel_review';
    const formCategoryKey = isBeautyDraft
        ? 'beauty_review'
        : isFoodDraft
            ? 'food_review'
            : isTravelDraft
                ? 'travel_review'
                : newType === 'meetup'
                    ? 'meetup'
                    : 'help';
    const writeGuideTitle = t(`community_page.form.write_guide_title.${formCategoryKey}`);
    const writeGuideBody = t(`community_page.form.write_guide_body.${formCategoryKey}`);
    const titleFieldLabel = isBeautyDraft ? t('community_page.form.title_label.beauty_review') : t('community_page.form.title_label.default');
    const titleFieldPlaceholder = t(`community_page.form.title_placeholder.${formCategoryKey}`);
    const pointFieldLabel = isBeautyDraft ? t('community_page.form.point_label.beauty_review') : t('community_page.form.point_label.default');
    const pointFieldPlaceholder = t(`community_page.form.point_placeholder.${formCategoryKey}`);
    const descFieldLabel = isBeautyDraft ? t('community_page.form.desc_label.beauty_review') : t('community_page.form.desc_label.default');
    const descFieldPlaceholder = t(`community_page.form.desc_placeholder.${formCategoryKey}`);
    const placeFieldLabel = isBeautyDraft ? t('community_page.form.place_label.beauty_review') : t('community_page.form.place_label.default');
    const placeFieldPlaceholder = isBeautyDraft ? t('community_page.form.place_placeholder.beauty_review') : t('community_page.form.place_placeholder.default');
    const placeFieldHelp = isBeautyDraft ? t('community_page.form.place_help.beauty_review') : t('community_page.form.place_help.default');
    const summaryCategoryLabel = getCategoryText(newType);
    const imageUploadGuide = t(`community_page.form.image.guides.${formCategoryKey}`);
    const isImageLimitReached = newImages.length >= COMMUNITY_IMAGE_LIMIT;

    return (
        <div className={styles.container}>
            {/* Step 22: Toast Notification */}
            {toast && (
                <div className={`${styles.toast} ${styles['toast_' + toast.type]}`}>
                    {toast.message}
                </div>
            )}

            <header className={styles.header}>
                <h1 className={styles.title}>{t('community_page.hero.title')}</h1>
                <p className={styles.subtitle}>{t('community_page.hero.subtitle')}</p>
                <div className={styles.searchBar}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder={t('community_page.hero.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`} onClick={() => { setFilter('all'); setLoading(true); setTimeout(()=>setLoading(false),200);}}>
                        {t('community_page.categories.all')}
                    </button>
                    {communityCategories.map((category) => (
                        <button
                            key={category.id}
                            className={`${styles.tab} ${filter === category.id ? styles.activeTab : ''}`}
                            onClick={() => {
                                setFilter(category.id);
                                if (category.id === 'travel_review' || category.id === 'meetup' || category.id === 'help') {
                                    setSubFilter('all');
                                }
                                setLoading(true);
                                setTimeout(() => setLoading(false), 200);
                            }}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>

                {/* Quick Sub-Filters */}
                <div className={styles.subTabs}>
                    {communitySubFilters.map(sub => (
                        <button 
                            key={sub.id} 
                            className={`${styles.subTab} ${subFilter === sub.id ? styles.activeSubTab : ''}`} 
                            onClick={() => { setSubFilter(sub.id); setLoading(true); setTimeout(()=>setLoading(false),200); }}
                        >
                            {sub.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className={styles.feed}>
                {/* 1. Onboarding Banner - Step 21 Simplified */}
                {!isBannerClosed && (
                    <div className={styles.onboardingBannerCompact}>
                        <div className={styles.onboardingText}>
                            <b>{t('community_page.banner.title')}</b> {t('community_page.banner.body')}
                        </div>
                        <button className={styles.bannerCloseBtnCompact} onClick={closeBanner}>×</button>
                    </div>
                )}
                {false && !isBannerClosed && (
                    <div className={styles.onboardingBannerCompact}>
                        <div className={styles.onboardingText}>
                            <b>{t('community_page.banner.secondary_title')}</b> {t('community_page.banner.secondary_body')}
                        </div>
                        <button className={styles.bannerCloseBtnCompact} onClick={closeBanner}>✕</button>
                    </div>
                )}

                {/* 2. Quick Entry Cards - Compact Mode */}
                <div className={styles.quickEntryScroll}>
                    <div className={styles.entryCardCompact} onClick={() => { setFilter('beauty_review'); setSubFilter('all'); setLoading(true); setTimeout(()=>setLoading(false),200); }}>
                        <span className={styles.entryIcon}>💄</span>
                        <div className={styles.entryMeta}>
                            <span className={styles.entryLabel}>{t('community_page.quick_entry.beauty.label')}</span>
                            <span className={styles.entrySubLabel}>{t('community_page.quick_entry.beauty.sub')}</span>
                        </div>
                    </div>
                    <div className={styles.entryCardCompact} onClick={() => { setFilter('food_review'); setSubFilter('all'); setLoading(true); setTimeout(()=>setLoading(false),200); }}>
                        <span className={styles.entryIcon}>🍽️</span>
                        <div className={styles.entryMeta}>
                            <span className={styles.entryLabel}>{t('community_page.quick_entry.food.label')}</span>
                            <span className={styles.entrySubLabel}>{t('community_page.quick_entry.food.sub')}</span>
                        </div>
                    </div>
                    <div className={styles.entryCardCompact} onClick={() => { setFilter('travel_review'); setSubFilter('all'); setLoading(true); setTimeout(()=>setLoading(false),200); }}>
                        <span className={styles.entryIcon}>📍</span>
                        <div className={styles.entryMeta}>
                            <span className={styles.entryLabel}>{t('community_page.quick_entry.travel.label')}</span>
                            <span className={styles.entrySubLabel}>{t('community_page.quick_entry.travel.sub')}</span>
                        </div>
                    </div>
                    <div className={styles.entryCardCompact} onClick={() => openComposer()}>
                        <span className={styles.entryIcon}>📝</span>
                        <div className={styles.entryMeta}>
                            <span className={styles.entryLabel}>{t('community_page.quick_entry.write.label')}</span>
                            <span className={styles.entrySubLabel}>{t('community_page.quick_entry.write.sub')}</span>
                        </div>
                    </div>
                </div>
                {false && (
                <div className={styles.quickEntryScroll}>
                    <div className={styles.entryCardCompact} onClick={() => { setFilter('beauty_review'); setSubFilter('all'); setLoading(true); setTimeout(()=>setLoading(false),200); }}>
                        <span className={styles.entryIcon}>👀</span>
                        <div className={styles.entryMeta}>
                            <span className={styles.entryLabel}>{t('community_page.quick_entry.browse.label')}</span>
                            <span className={styles.entrySubLabel}>{t('community_page.quick_entry.browse.sub')}</span>
                        </div>
                    </div>
                    <div className={styles.entryCardCompact} onClick={() => { setFilter('food_review'); setSubFilter('all'); setLoading(true); setTimeout(()=>setLoading(false),200); }}>
                        <span className={styles.entryIcon}>🤝</span>
                        <div className={styles.entryMeta}>
                            <span className={styles.entryLabel}>{t('community_page.quick_entry.recruiting.label')}</span>
                            <span className={styles.entrySubLabel}>{t('community_page.quick_entry.recruiting.sub')}</span>
                        </div>
                    </div>
                    <div className={styles.entryCardCompact} onClick={() => { setFilter('travel_review'); setSubFilter('all'); setLoading(true); setTimeout(()=>setLoading(false),200); }}>
                        <span className={styles.entryIcon}>📅</span>
                        <div className={styles.entryMeta}>
                            <span className={styles.entryLabel}>{t('community_page.quick_entry.weekend.label')}</span>
                            <span className={styles.entrySubLabel}>{t('community_page.quick_entry.weekend.sub')}</span>
                        </div>
                    </div>
                    <div className={styles.entryCardCompact} onClick={() => setIsWriting(true)}>
                        <span className={styles.entryIcon}>📝</span>
                        <div className={styles.entryMeta}>
                            <span className={styles.entryLabel}>{t('community_page.quick_entry.record.label')}</span>
                            <span className={styles.entrySubLabel}>{t('community_page.quick_entry.record.sub')}</span>
                        </div>
                    </div>
                </div>
                )}

                {/* Activity & Recommendation Hub - Consolidated for Step 21 */}
                <div className={styles.recommendationHub}>
                    {/* Activity Fragment */}
                    {(!loading && (savedIds.length > 0 || reactedIds.length > 0)) && (
                        <div className={styles.compactActivityRow}>
                             💡 <b>{t('community_page.activity.label')}</b> {t('community_page.activity.summary', { saved: savedIds.length, reacted: reactedIds.length })}
                             {posts.filter(p => (savedIds.includes(p.id) || reactedIds.includes(p.id)) && p.comments >= 3).length > 0 && ` ${t('community_page.activity.new_updates')}`}
                        </div>
                    )}

                    {/* Quick Recommendations Horizontal Scroll */}
                    {!loading && (filter === 'all' || filter === 'beauty_review') && subFilter === 'all' && (
                        <div className={styles.recommendScrollCompact}>
                            {posts.filter(p => (p.comments || 0) >= 4).slice(0, 3).map(p => (
                                <div key={p.id} className={styles.recommendChip} onClick={() => router.push(`/community/${p.id}`)}>
                                    🔥 {p.title}
                                </div>
                            ))}
                            {posts.filter(p => p.desc.includes('[RESULT:')).slice(0, 2).map(p => (
                                <div key={p.id} className={styles.recommendChip} onClick={() => router.push(`/community/${p.id}`)}>
                                    🎁 {p.title.slice(0, 10)}...
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Step 18 & 21: Consolidated Recommendations (Now as a secondary list) */}
                {!loading && (() => {
                    const recommendations = getNextActions();
                    if (recommendations.length === 0 && recentIds.length === 0) return null;

                    return (
                        <section className={styles.nextActionCompact}>
                            <div className={styles.nextActionScroll}>
                                {recommendations.slice(0, 3).map(action => (
                                    <div key={action.id} className={styles.nextActionTag} onClick={() => router.push(action.link)}>
                                        🏃 {action.badge}: {action.label.slice(0, 8)}..
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })()}

                {/* Navigation Summary & Sorting */}
                <div className={styles.navSummaryBox}>
                    <div className={styles.summaryText}>{getNavSummary()}</div>
                    <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="latest">{t('community_page.sort.latest')}</option>
                        <option value="reactions">{t('community_page.sort.reactions')}</option>
                        <option value="draft">{t('community_page.sort.draft')}</option>
                    </select>
                </div>

                {loading ? (
                    // Step 22: Improved Skeleton Feed
                    <div className={styles.skeletonFeed}>
                        {[1, 2, 3].map(n => (
                            <div key={n} className={styles.skeletonCard}>
                                <div className={styles.skeletonHeader}>
                                    <div className={styles.skeletonAvatar} />
                                    <div className={styles.skeletonAuthorInfo}>
                                        <div className={styles.skeletonName} />
                                        <div className={styles.skeletonTime} />
                                    </div>
                                </div>
                                <div className={styles.skeletonTitle} />
                                <div className={styles.skeletonDesc} />
                                <div className={styles.skeletonFooter} />
                            </div>
                        ))}
                    </div>
                ) : showEmptyState || showFeedErrorState ? (
                    <div className={`${styles.emptyStateContainer} ${showFeedErrorState ? styles.errorStateContainer : ''}`}>
                        <div className={styles.emptyIcon}>🔍</div>
                        <div className={styles.emptyTitle}>{emptyStateTitle}</div>
                        <div className={styles.emptyDesc}>{emptyStateDesc}</div>
                        <div className={styles.emptyTip}>{emptyStateTip}</div>
                        {!showFeedErrorState && (
                            <div className={styles.emptyCtaGroup}>
                                <button className={`${styles.emptyCta} ${styles.emptyCtaPrimary}`} onClick={() => openComposer()}>{t('community_page.states.cta_write')}</button>
                                <button className={`${styles.emptyCta} ${styles.emptyCtaSecondary}`} onClick={() => { setFilter('all'); setSubFilter('all'); setSearchQuery(''); }}>{t('community_page.states.cta_all')}</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                    {showFeedErrorNotice && (
                        <div className={styles.feedNotice}>{feedError}</div>
                    )}
                    {filteredPosts.map(post => {
                        const postCategory = getPostCategory(post);
                        const isReview = post.type === 'review';
                        const isBeautyReview = postCategory === 'beauty_review';
                        const isFoodReview = postCategory === 'food_review';
                        const isMeetup = postCategory === 'meetup';
                        const isTravel = postCategory === 'travel_review';
                        const isHelp = postCategory === 'help';
                        const displayTypeLabel = getCategoryText(postCategory);
                        const titlePrefix = isBeautyReview
                            ? t('community_page.card.title_prefix.beauty_review')
                            : isFoodReview
                                ? t('community_page.card.title_prefix.food_review')
                                : isTravel
                                    ? t('community_page.card.title_prefix.travel_review')
                                    : '';
                                // Metadata Parser
                                const regionMatch = post.desc.match(/\[REGION:(.*?)\]/);
                                const pointMatch = post.desc.match(/\[POINT:(.*?)\]/);
                                const tagsMatch = post.desc.match(/\[TAGS:(.*?)\]/);

                                const displayRegion = regionMatch ? regionMatch[1] : (post.place_name?.split(' ')[0] || t('community_page.defaults.region'));
                                const displayPoint = pointMatch ? pointMatch[1] : '';
                                const displayTags = tagsMatch
                                    ? tagsMatch[1]
                                        .split(',')
                                        .map((tag) => getTagLabel(t, tag))
                                        .filter(Boolean)
                                    : [];
                                const cleanDesc = stripCommunityMetadata(post.desc);
                                const imagePreviewSrcList = getMetaValues(post.desc, COMMUNITY_IMAGE_META_KEY).slice(0, COMMUNITY_IMAGE_LIMIT);

                                // Status & Result Parsing
                                const statusMatch = post.desc.match(/\[STATUS:(.*?)\]/);
                                const resultMatch = post.desc.match(/\[RESULT:(.*?)\]/);
                                const tipsMatch = post.desc.match(/\[TIPS:(.*?)\]/);
                                const hasResult = !!(resultMatch || tipsMatch);
                                
                                const currentStatus = statusMatch ? statusMatch[1] : ((isReview || isTravel) ? 'REVIEWS' : 'REACTING');

                                return (
                                    <div 
                                        key={post.id} 
                                        className={`${styles.card} ${isReview ? styles.reviewCard : ''} ${isMeetup ? styles.meetupCard : ''} ${isTravel ? styles.infoCard : ''} ${isHelp ? styles.helpCard : ''} ${loading ? styles.cardExiting : ''}`} 
                                        onClick={() => router.push(`/community/${post.id}`)} 
                                        style={{ cursor: 'pointer', opacity: currentStatus === 'CLOSED' ? 0.7 : 1, filter: currentStatus === 'CLOSED' ? 'grayscale(0.3)' : 'none' }}
                                    >
                                        {/* Card Header - Focus on Author and Meta */}
                                        <div className={styles.cardHeader} style={{ marginBottom: isReview ? '8px' : '12px' }}>
                                            <div className={styles.avatar} style={{ width: 36, height: 36, fontSize: 16 }}>{post.flag}</div>
                                            <div className={styles.authorInfo}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className={styles.authorName}>{post.author}</div>
                                                    <span className={`${styles.statusBadge} ${styles['status_' + currentStatus]}`}>
                                                        {getStatusText(currentStatus)}
                                                    </span>
                                                    {hasResult && <span className={styles.resultFeedBadge}>{t('community_page.card.result_badge')}</span>}
                                                </div>
                                                <div className={styles.postTime}>{post.time}</div>
                                            </div>
                                            <div className={`${styles.badge} ${styles['badge_' + post.type]}`}>
                                                {displayTypeLabel}
                                            </div>
                                            {post.author === loggedInUserName && (
                                                <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                                                    <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleEditPost(post); }} style={{ padding: '2px 4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                        ✏️
                                                    </button>
                                                    <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }} style={{ padding: '2px 4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                        🗑️
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Body Content based on Type */}
                                        {isReview && (
                                            <div className={styles.reviewMeta}>
                                                <span className={styles.areaTag}>{displayRegion}</span>
                                                {displayTags.length > 0 ? (
                                                    displayTags.map(tag => <span key={tag} className={styles.vibeTag}>{tag}</span>)
                                                ) : (
                                                    <span className={styles.vibeTag}>{t('community_page.card.default_vibe')}</span>
                                                )}
                                                {post.desc.includes('[MEETUP_OPEN:true]') && (
                                                    <span style={{ fontSize: '10px', background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>{t('community_page.card.open_meetup_badge')}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Step 20 & 21: Limited Freshness Signal */}
                                        {(() => {
                                            const hasResult = post.desc.includes('[RESULT:') || post.desc.includes('[TIPS:');
                                            const isFresh = post.comments >= 3;
                                            if (!isFresh && !hasResult) return null;

                                            return (
                                                <div className={styles.freshnessBadgeRow}>
                                                    {post.comments >= 3 ? (
                                                        <span className={styles.freshBadge_comment}>{t('community_page.card.fresh_badges.comment')}</span>
                                                    ) : hasResult ? (
                                                        <span className={styles.freshBadge_update}>{t('community_page.card.fresh_badges.update')}</span>
                                                    ) : null}
                                                </div>
                                            );
                                        })()}

                                        <h2 className={styles.postTitle} style={{ fontSize: isReview ? '18px' : '16px', marginBottom: '4px' }}>
                                            {titlePrefix ? `${titlePrefix} ${post.title}` : post.title}
                                        </h2>

                                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                            📍 {displayRegion} · {displayTypeLabel}
                                            {displayPoint && (
                                                <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 800, background: '#fff1f2', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                                                    🎯 {displayPoint}
                                                </span>
                                            )}
                                            {getQualitySignals(post).map(signal => (
                                                <span key={signal.id} style={{ fontSize: '9px', background: '#f8fafc', color: '#475569', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                                    {signal.label}
                                                </span>
                                            ))}
                                        </div>
                                        
                                        <p className={styles.postDesc} style={{ 
                                            marginBottom: '8px',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            fontSize: '13px'
                                        }}>
                                            {cleanDesc}
                                        </p>

                                        {imagePreviewSrcList.length > 0 && (
                                            <div className={`${styles.postImageGrid} ${imagePreviewSrcList.length === 1 ? styles.postImageGridSingle : ''}`}>
                                                {imagePreviewSrcList.map((imagePreviewSrc, index) => (
                                                    <div
                                                        key={`${post.id}-image-${index}`}
                                                        className={`${styles.postImageFrame} ${imagePreviewSrcList.length === 1 ? styles.postImageFrameSingle : ''}`}
                                                    >
                                                        <Image
                                                            src={imagePreviewSrc}
                                                            alt={`${post.title} ${index + 1}`}
                                                            fill
                                                            unoptimized
                                                            className={styles.postImage}
                                                            sizes="(max-width: 768px) 50vw, 320px"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                {/* Contextual Info */}
                                {isMeetup && (
                                    <div className={styles.meetupInfo}>
                                        {post.start_time && <div>🕒 {post.start_time} {post.end_time ? ` ~ ${post.end_time}` : ''}</div>}
                                        {post.place_name && <div>📍 {post.place_name}</div>}
                                    </div>
                                )}

                                {isReview && post.place_name && (
                                    <div style={{ fontSize: '13px', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        📍 <strong>{post.place_name}</strong>
                                    </div>
                                )}

                                {/* Footer Actions */}
                                <div className={styles.cardFooter}>
                                    <div className={styles.footerLeft}>
                                        <button className={styles.actionBtn}>
                                            💬 {post.comments}
                                        </button>
                                        {/* Step 22: Feedback for Bookmark */}
                                        <button 
                                            className={`${styles.saveBtn} ${savedIds.includes(post.id) ? styles.savedActive : ''}`} 
                                            onClick={(e) => handleToggleSaveInFeed(e, post.id)}
                                        >
                                            {savedIds.includes(post.id) ? '⭐' : '🔖'}
                                        </button>
                                    </div>
                                    {(isReview || isMeetup || isTravel) && post.comments > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                            <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: 700, background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                                                {post.comments >= 4 ? t('community_page.card.draft_status.active') : post.comments >= 2 ? t('community_page.card.draft_status.forming') : t('community_page.card.draft_status.preparing')}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--gray-500)', marginLeft: '4px' }}>
                                                {post.comments >= 4 ? t('community_page.card.draft_desc.active') : 
                                                 post.comments >= 2 ? t('community_page.card.draft_desc.forming') : 
                                                 t('community_page.card.draft_desc.preparing')}
                                            </div>
                                        </div>
                                    )}
                                    <div className={styles.footerRight}>
                                        {isReview && post.author !== loggedInUserName && (
                                            <button 
                                                className={styles.matchBtn}
                                                onClick={(e) => { e.stopPropagation(); router.push(`/community/${post.id}?action=apply`); }}
                                            >
                                                {t('community_page.card.cta.review')}
                                            </button>
                                        )}
                                        {isReview && post.author === loggedInUserName && post.comments > 0 && (
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '10px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, border: '1px solid #bfdbfe' }}>
                                                    {t('community_page.card.owner_reactions.region', { region: displayRegion, count: post.comments })}
                                                </span>
                                            </div>
                                        )}
                                        {isMeetup && post.author !== loggedInUserName && (
                                            <button 
                                                className={styles.matchBtn}
                                                onClick={(e) => { e.stopPropagation(); router.push(`/community/${post.id}?action=apply`); }}
                                            >
                                                {t('community_page.card.cta.join')}
                                            </button>
                                        )}
                                        {isMeetup && post.author === loggedInUserName && post.comments > 0 && (
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '10px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, border: '1px solid #bfdbfe' }}>
                                                    {t('community_page.card.owner_reactions.join', { count: post.comments })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Step 19: Topic Connectivity Hint */}
                                <div className={styles.cardTopicHint}>
                                    <span 
                                        className={styles.moreHint} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchQuery(displayRegion);
                                            setFilter('all');
                                            setSubFilter('all');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                            showToast(t('community_page.toasts.region_collected', { region: displayRegion }));
                                        }}
                                    >
                                        {t('community_page.card.more_region', { region: displayRegion })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    </>
                )}
            </div>

            {/* Purpose-driven CTAs */}
            <div className={styles.fabGroup}>
                <button className={`${styles.fab} ${styles.fabSecondary}`} onClick={() => openComposer('beauty_review')}>
                    <span className={styles.fabIcon}>📝</span>
                    <span className={styles.fabLabel}>{t('community_page.fab.beauty')}</span>
                </button>
                <button className={styles.fab} onClick={() => openComposer('meetup')}>
                    <span className={styles.fabIcon}>🤝</span>
                    <span className={styles.fabLabel}>{t('community_page.fab.meetup')}</span>
                </button>
            </div>

            {isWriting && (
                <div className={styles.modalOverlay} onClick={() => setIsWriting(false)}>
                    <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>
                                {editingPostId
                                    ? t('community_page.edit', { defaultValue: 'Edit Post' })
                                    : t('community_page.write_post', { defaultValue: 'Write Post' })
                                }
                            </h2>
                            {/* Home/Close button removed as requested */}
                        </div>

                        <div className={styles.modalBody}>
                            {/* Step 15: Writing Guide */}
                            <div className={styles.writeGuideBox}>
                                <div className={styles.writeGuideText}>
                                    ✨ <b>{writeGuideTitle}</b><br />
                                    {writeGuideBody}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('community_page.form.category_label')}</label>
                                <select className={styles.formSelect} value={newType} onChange={e => setNewType(e.target.value as CommunityCategory)}>
                                    {communityCategories.map((category) => (
                                        <option key={category.id} value={category.id}>{category.label}</option>
                                    ))}
                                </select>
                                <div className={styles.formHint}>{getHint()}</div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{titleFieldLabel}</label>
                                <input
                                    className={styles.formInput}
                                    placeholder={titleFieldPlaceholder}
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                    <label className={styles.formLabel}>{t('community_page.form.region_label')}</label>
                                    <input
                                        className={styles.formInput}
                                        placeholder={t('community_page.form.region_placeholder')}
                                        value={newRegion}
                                        onChange={e => setNewRegion(e.target.value)}
                                    />
                                </div>
                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                    <label className={styles.formLabel}>{pointFieldLabel}</label>
                                    <input
                                        className={styles.formInput}
                                        placeholder={pointFieldPlaceholder}
                                        value={newPoint}
                                        onChange={e => setNewPoint(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{descFieldLabel}</label>
                                <textarea
                                    className={styles.formTextarea}
                                    placeholder={descFieldPlaceholder}
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('community_page.form.image.label')}</label>
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className={styles.imageInput}
                                    onChange={handleImageSelect}
                                />
                                <div className={styles.imageUploadBox}>
                                    <div className={styles.imageUploadCopy}>
                                        <strong>{t('community_page.form.image.title', { count: COMMUNITY_IMAGE_LIMIT })}</strong>
                                        <span>{imageUploadGuide}</span>
                                    </div>
                                    <div className={styles.imageUploadActions}>
                                        <span className={styles.imageCountBadge}>{newImages.length}/{COMMUNITY_IMAGE_LIMIT}</span>
                                        <button
                                            type="button"
                                            className={styles.imagePickerBtn}
                                            onClick={() => imageInputRef.current?.click()}
                                            disabled={isPreparingImage || isImageLimitReached}
                                        >
                                            {isPreparingImage
                                                ? t('community_page.form.image.button_loading')
                                                : isImageLimitReached
                                                    ? t('community_page.form.image.button_limit', { count: COMMUNITY_IMAGE_LIMIT })
                                                    : newImages.length > 0
                                                        ? t('community_page.form.image.button_add_more')
                                                        : t('community_page.form.image.button_select')
                                            }
                                        </button>
                                    </div>
                                </div>

                                {newImages.length > 0 && (
                                    <div className={styles.imagePreviewGrid}>
                                        {newImages.map((image, index) => (
                                            <div key={image.id} className={styles.imagePreviewCard}>
                                                <div className={styles.imagePreviewFrame}>
                                                    <Image
                                                        src={image.dataUrl}
                                                        alt={newTitle || t('community_page.form.image.preview_alt', { index: index + 1 })}
                                                        fill
                                                        unoptimized
                                                        className={styles.imagePreview}
                                                        sizes="(max-width: 768px) 50vw, 160px"
                                                    />
                                                </div>
                                                <div className={styles.imagePreviewMeta}>
                                                    <strong>{image.name || t('community_page.form.image.preview_name', { index: index + 1 })}</strong>
                                                    <span>{t('community_page.form.image.preview_desc', { index: index + 1 })}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className={styles.imageRemoveBtn}
                                                    onClick={() => handleRemoveImage(image.id)}
                                                >
                                                    {t('community_page.form.image.remove')}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('community_page.form.vibe_label')}</label>
                                <div className={styles.vibeGrid}>
                                    {tagChoices.map(tag => (
                                        <div 
                                            key={tag.id} 
                                            className={`${styles.vibeChip} ${newTags.includes(tag.id) ? styles.vibeActive : ''}`}
                                            onClick={() => {
                                                if (newTags.includes(tag.id)) {
                                                    setNewTags(newTags.filter((value) => value !== tag.id));
                                                } else {
                                                    setNewTags([...newTags, tag.id]);
                                                }
                                            }}
                                        >
                                            {tag.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{placeFieldLabel}</label>
                                <input
                                    className={styles.formInput}
                                    placeholder={placeFieldPlaceholder}
                                    value={placeName}
                                    onChange={e => setPlaceName(e.target.value)}
                                />
                                <small style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                                    {placeFieldHelp}
                                </small>
                            </div>

                            <div className={styles.toggleGroup}>
                                <div className={styles.toggleLabel}>
                                    <span className={styles.toggleTitle}>{t('community_page.form.meetup_toggle_title')}</span>
                                    <span className={styles.toggleDesc}>{t('community_page.form.meetup_toggle_desc')}</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={isOpenForMeetup} 
                                    onChange={e => setIsOpenForMeetup(e.target.checked)}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                />
                            </div>

                            <div className={styles.safetyGuideBox}>
                                <span>{t('community_page.form.safety_title')}</span>
                                <span>{t('community_page.form.safety_item_1')}</span>
                                <span>{t('community_page.form.safety_item_2')}</span>
                            </div>

                            {/* Summary Block before submitting */}
                            {(newTitle || newRegion || newPoint) && (
                                <div className={styles.summaryBlock}>
                                    <div style={{ fontWeight: 800, marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>{t('community_page.form.summary_title')}</div>
                                    <div className={styles.summaryItem}>
                                        <span className={styles.summaryLabel}>{t('community_page.form.summary_region_type')}</span>
                                        <span>{newRegion || '-'} / {summaryCategoryLabel}</span>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <span className={styles.summaryLabel}>{t('community_page.form.summary_point')}</span>
                                        <span>{newPoint || '-'}</span>
                                    </div>
                                    <div className={styles.summaryItem}>
                                        <span className={styles.summaryLabel}>{t('community_page.form.summary_meetup')}</span>
                                        <span>{isOpenForMeetup ? t('community_page.form.summary_enabled') : t('community_page.form.summary_disabled')}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                className={styles.submitBtn}
                                onClick={handleSubmit}
                                disabled={isSubmitting || isPreparingImage || !newTitle || !newDesc}
                            >
                                {isSubmitting
                                    ? t('community_page.posting', { defaultValue: 'Posting...' })
                                    : isOpenForMeetup 
                                        ? t('community_page.form.submit_with_reactions') 
                                        : isBeautyDraft
                                            ? t('community_page.form.submit_beauty')
                                            : t('community_page.form.submit_default')
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
