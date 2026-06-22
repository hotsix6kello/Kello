'use client';

import Image from 'next/image';
import { ChangeEvent, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './community.module.css';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { Users, Search, HelpCircle, Sparkles, Home, Calendar, Utensils, Grid, PenSquare } from 'lucide-react';
import NotificationCenter from '@/app/components/home/NotificationCenter';

interface Post {
    id: number;
    author: string;
    flag: string;
    type: string;
    title: string;
    desc: string;
    time: string;
    comments: number;
    likes_count: number;
    dislikes_count: number;
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

type CommunityCategory = 'beauty_review' | 'food_review' | 'travel_review' | 'meetup' | 'meetup_recruitment' | 'help';

const CATEGORY_OPTIONS: CommunityCategory[] = ['meetup', 'beauty_review', 'food_review', 'travel_review', 'help'];
const COMMUNITY_IMAGE_META_KEY = 'IMAGE';
const COMMUNITY_IMAGE_MAX_SIDE = 1280;
const COMMUNITY_IMAGE_LIMIT = 4;

const isCommunityCategory = (value: string): value is CommunityCategory =>
    CATEGORY_OPTIONS.includes(value as CommunityCategory);

const getDatabaseTypeForCategory = (category: CommunityCategory) => {
    if (category === 'beauty_review' || category === 'food_review') return 'review';
    if (category === 'travel_review') return 'travel';
    if (category === 'meetup_recruitment') return 'meetup';
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

// ─── Group A: Feed Reducer ────────────────────────────────────────────────────

type FeedState = { posts: Post[]; loading: boolean; error: string | null };

type FeedAction =
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: Post[] }
    | { type: 'FETCH_ERROR'; payload: string }
    | { type: 'UPDATE_COMMENTS'; payload: { id: number; comments: number } };

function feedReducer(state: FeedState, action: FeedAction): FeedState {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, posts: action.payload, error: null };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.payload };
        case 'UPDATE_COMMENTS':
            return {
                ...state,
                posts: state.posts.map(p =>
                    p.id === action.payload.id ? { ...p, comments: action.payload.comments } : p
                ),
            };
        default:
            return state;
    }
}

// ─── Group B: Draft Reducer ───────────────────────────────────────────────────

type DraftField = {
    type: CommunityCategory | '';
    title: string;
    desc: string;
    region: string;
    point: string;
    tags: string[];
    isOpenForMeetup: boolean;
    images: CommunityImageDraft[];
};

type DraftState = DraftField & {
    open: boolean;
    editingPostId: number | null;
    isPreparingImage: boolean;
    isSubmitting: boolean;
};

const DRAFT_EMPTY: DraftField = {
    type: '',
    title: '',
    desc: '',
    region: '',
    point: '',
    tags: [],
    isOpenForMeetup: false,
    images: [],
};

const DRAFT_INITIAL_STATE: DraftState = {
    ...DRAFT_EMPTY,
    open: false,
    editingPostId: null,
    isPreparingImage: false,
    isSubmitting: false,
};

type DraftAction =
    | { type: 'OPEN'; payload?: CommunityCategory }
    | { type: 'CLOSE' }
    | { type: 'RESET'; payload?: CommunityCategory }
    | { type: 'SET_FIELD'; payload: Partial<DraftField> }
    | { type: 'IMAGES_PREPARING' }
    | { type: 'IMAGES_READY'; payload: CommunityImageDraft[] }
    | { type: 'SUBMIT_START' }
    | { type: 'SUBMIT_END' };

function draftReducer(state: DraftState, action: DraftAction): DraftState {
    switch (action.type) {
        case 'OPEN':
            return { ...DRAFT_EMPTY, open: true, editingPostId: null, isPreparingImage: false, isSubmitting: false, type: action.payload ?? '' };
        case 'CLOSE':
            return { ...state, open: false };
        case 'RESET':
            return { ...state, ...DRAFT_EMPTY, editingPostId: null, type: action.payload ?? '' };
        case 'SET_FIELD':
            return { ...state, ...action.payload };
        case 'IMAGES_PREPARING':
            return { ...state, isPreparingImage: true };
        case 'IMAGES_READY':
            return { ...state, isPreparingImage: false, images: [...state.images, ...action.payload] };
        case 'SUBMIT_START':
            return { ...state, isSubmitting: true };
        case 'SUBMIT_END':
            return { ...state, isSubmitting: false };
        default:
            return state;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommunityPage() {
    const { t } = useTranslation('common');

    // Group E (유지)
    const [mounted, setMounted] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [savedIds, setSavedIds] = useState<number[]>([]);
    const [loggedInUserName, setLoggedInUserName] = useState("");
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);


    // Group A: feed 상태 (posts + loading + error → feedReducer)
    const [feedState, feedDispatch] = useReducer(feedReducer, undefined, (): FeedState => {
        const posts: Post[] = (() => {
            if (typeof window !== 'undefined') {
                try { return JSON.parse(localStorage.getItem('kello_community_posts') || '[]'); } catch { return []; }
            }
            return [];
        })();
        return { posts, loading: posts.length === 0, error: null };
    });

    // Group B: 컴포저/드래프트 상태 (12개 → draftReducer)
    const [draft, draftDispatch] = useReducer(draftReducer, DRAFT_INITIAL_STATE);

    const imageInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setMounted(true);
        const handlePostUpdate = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail && typeof detail.id === 'number' && typeof detail.comments === 'number') {
                feedDispatch({ type: 'UPDATE_COMMENTS', payload: { id: detail.id, comments: detail.comments } });
            }
        };
        window.addEventListener('community_post_updated', handlePostUpdate);
        return () => window.removeEventListener('community_post_updated', handlePostUpdate);
    }, []);

    const communityCategories = CATEGORY_OPTIONS.map((id) => ({ id, label: getCategoryLabel(t, id) }));



    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        let isMounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isMounted) setIsAuthenticated(!!session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) setIsAuthenticated(!!session);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const initialSearch = searchParams.get('search');
        if (initialSearch) setSearchQuery(initialSearch);
    }, [searchParams]);

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
        feedDispatch({ type: 'FETCH_START' });
        try {
            const { data, error } = await supabase
                .from('community_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (Array.isArray(data)) {
                localStorage.setItem('kello_community_posts', JSON.stringify(data));
                feedDispatch({ type: 'FETCH_SUCCESS', payload: data as Post[] });
                return;
            }
            const meaningfulError = getMeaningfulFetchError(error);
            const errorLogMessage = formatMeaningfulFetchError(meaningfulError);
            if (errorLogMessage) {
                feedDispatch({ type: 'FETCH_ERROR', payload: t('community_page.states.fetch_failed_desc') });
            } else {
                feedDispatch({ type: 'FETCH_SUCCESS', payload: [] });
            }
        } catch {
            feedDispatch({ type: 'FETCH_ERROR', payload: t('community_page.states.fetch_failed_desc') });
        }
    }, [t]);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                if (parsed.name) setLoggedInUserName(parsed.name);
                else setLoggedInUserName(t('my_page.settings.account.default_name'));
            } else {
                setLoggedInUserName(t('my_page.settings.account.default_name'));
            }
        } catch {
            setLoggedInUserName(t('my_page.settings.account.default_name'));
        }
        const saved = JSON.parse(localStorage.getItem('kello_saved_posts') || '[]');
        setSavedIds(saved);
        fetchPosts();
    }, [fetchPosts, t]);

    const openComposer = (category: CommunityCategory | '' = '') => {
        draftDispatch({ type: 'OPEN', payload: category || undefined });
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) return;
        const availableSlots = COMMUNITY_IMAGE_LIMIT - draft.images.length;
        if (availableSlots <= 0) return;
        draftDispatch({ type: 'IMAGES_PREPARING' });
        try {
            const preparedImages = await Promise.all(
                files.slice(0, availableSlots).map(async (file, index) => ({
                    id: `${Date.now()}-${index}`,
                    dataUrl: await prepareCommunityImage(file),
                    name: file.name
                }))
            );
            draftDispatch({ type: 'IMAGES_READY', payload: preparedImages });
        } catch {
            alert(t('community_page.form.image.load_failed_alert'));
            draftDispatch({ type: 'IMAGES_READY', payload: [] });
        } finally {
            event.target.value = '';
        }
    };

    const handleRemoveImage = (imageId: string) =>
        draftDispatch({ type: 'SET_FIELD', payload: { images: draft.images.filter(img => img.id !== imageId) } });

    const handleSubmit = async () => {
        if (!draft.type || !draft.title.trim() || !draft.desc.trim()) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // UI prevents reaching this state when logged out; bail out quietly without an alert.
            return;
        }
        draftDispatch({ type: 'SUBMIT_START' });
        try {
            const uploadedUrls = await Promise.all(draft.images.map(async (img) => {
                if (img.dataUrl.startsWith('http')) return img.dataUrl;
                const res = await fetch(img.dataUrl); const blob = await res.blob();
                const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const filePath = `${user.id}/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('community').upload(filePath, blob);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('community').getPublicUrl(filePath);
                return data.publicUrl;
            }));

            const imageMeta = uploadedUrls.map(url => `\n[${COMMUNITY_IMAGE_META_KEY}:${url}]`).join('');
            const composedDesc = `${stripCommunityMetadata(draft.desc)}\n\n[CATEGORY:${draft.type}]\n[REGION:${draft.region}]\n[POINT:${draft.point}]\n[TAGS:${draft.tags.join(',')}]\n[MEETUP_OPEN:${draft.isOpenForMeetup}]${imageMeta}`;

            const payload = {
                author_user_id: user.id, author: loggedInUserName, flag: '🌍',
                type: getDatabaseTypeForCategory(draft.type as CommunityCategory), title: draft.title, desc: composedDesc,
                time: t('community_page.time.just_now'), comments: 0
            };

            const { error } = draft.editingPostId
                ? await supabase.from('community_posts').update(payload).eq('id', draft.editingPostId)
                : await supabase.from('community_posts').insert([payload]);

            if (error) throw error;
            draftDispatch({ type: 'CLOSE' });
            if (imageInputRef.current) imageInputRef.current.value = '';
            fetchPosts();
            showToast(t('community_page.toasts.submitted'));
        } catch (err) { alert(String(err)); } finally { draftDispatch({ type: 'SUBMIT_END' }); }
    };

    const filteredPosts = feedState.posts.filter(p => {
        const postCategory = getPostCategory(p);
        const matchesTab = filter === 'all' || (filter === 'tips' ? postCategory === 'help' : postCategory === filter);
        const normalizedSearch = searchQuery.toLowerCase();
        const matchesSearch = p.title.toLowerCase().includes(normalizedSearch) || p.desc.toLowerCase().includes(normalizedSearch);
        if (!matchesSearch) return false;
        return matchesTab;
    });

    if (!mounted) return null;

    return (
        <div className={styles.container}>
            {toast && (
                <div className={`${styles.toast} ${styles['toast_' + toast.type]}`}>
                    {toast.message}
                </div>
            )}

            <div className={styles.scrollableContent}>
                {/* 1. KelloTalk & MyPage Style Header with Title, Notification and Divider Line */}
                <header style={{
                    background: '#FFFFFF',
                    padding: '12px 16px',
                    height: '60px',
                    borderBottom: '1px solid #FFE4E6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={24} color="#000000" strokeWidth={2.5} />
                        <h1 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#2A2624', margin: 0 }}>
                            커뮤니티
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <NotificationCenter />
                    </div>
                </header>

                {/* 2. Search Bar and Category Tabs Area placed below the header divider */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    width: '100%',
                    background: '#FFFFFF',
                    padding: '12px 16px 20px',
                    boxSizing: 'border-box',
                }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <input
                            type="text"
                            placeholder={t('community_page.hero.search_placeholder')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 50px 12px 16px',
                                borderRadius: '24px',
                                border: '1px solid #FFE4E6',
                                background: '#FFFFFF',
                                fontSize: '14px',
                                outline: 'none',
                                boxShadow: '0 4px 12px rgba(255, 77, 130, 0.04)',
                                transition: 'all 0.2s',
                                color: '#2A2624'
                            }}
                        />
                        <button
                            type="button"
                            style={{
                                position: 'absolute',
                                right: '4px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: '#FFFFFF',
                                border: '1.5px solid #FF4D82',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(255, 77, 130, 0.1)'
                             }}
                        >
                            <Search size={18} color="#FF4D82" strokeWidth={2.5} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        {/* 1st Row: 전체, 질문, 뷰티후기, 샵추천 */}
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                            {[
                                { id: 'all', label: '전체', icon: Grid },
                                { id: 'help', label: '질문', icon: HelpCircle },
                                { id: 'beauty_review', label: '뷰티후기', icon: Sparkles },
                                { id: 'travel_review', label: '샵추천', icon: Home }
                            ].map((tab) => {
                                const IconComp = tab.icon;
                                const isActive = filter === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setFilter(tab.id); feedDispatch({ type: 'FETCH_START' }); setTimeout(() => feedDispatch({ type: 'FETCH_SUCCESS', payload: feedState.posts }), 200); }}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            padding: '8px 4px',
                                            borderRadius: '20px',
                                            border: `1px solid ${isActive ? '#FF4D82' : '#FFE4E6'}`,
                                            background: isActive ? '#FFF0F3' : '#FFFFFF',
                                            color: isActive ? '#FF4D82' : '#64748B',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <IconComp size={12} color={isActive ? '#FF4D82' : '#94A3B8'} strokeWidth={2.5} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                        {/* 2nd Row: 예약팁, 모임, 맛집추천 */}
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', width: '100%' }}>
                            {[
                                { id: 'tips', label: '예약팁', icon: Calendar },
                                { id: 'meetup', label: '모임', icon: Users },
                                { id: 'food_review', label: '맛집추천', icon: Utensils }
                            ].map((tab) => {
                                const IconComp = tab.icon;
                                const isActive = filter === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setFilter(tab.id); feedDispatch({ type: 'FETCH_START' }); setTimeout(() => feedDispatch({ type: 'FETCH_SUCCESS', payload: feedState.posts }), 200); }}
                                        style={{
                                            width: '31%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            padding: '8px 4px',
                                            borderRadius: '20px',
                                            border: `1px solid ${isActive ? '#FF4D82' : '#FFE4E6'}`,
                                            background: isActive ? '#FFF0F3' : '#FFFFFF',
                                            color: isActive ? '#FF4D82' : '#64748B',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <IconComp size={12} color={isActive ? '#FF4D82' : '#94A3B8'} strokeWidth={2.5} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className={styles.feed} style={{ background: '#FAFAFC', padding: '16px 16px 0' }}>
                    {feedState.error ? (
                        <div className={styles.emptyStateContainer}>{feedState.error}</div>
                    ) : feedState.loading ? (
                        <div className={styles.skeletonFeed}>
                            {[1, 2, 3].map(n => <div key={n} className={styles.skeletonCard} />)}
                        </div>
                    ) : filteredPosts.length === 0 ? (
                        <div style={{
                            background: '#FFFFFF',
                            border: '1.5px solid #FFE4E6',
                            borderRadius: '24px',
                            padding: '16px 16px 36px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            boxShadow: '0 8px 24px rgba(255, 77, 130, 0.02)',
                            marginBottom: '16px'
                        }}>
                            {/* 게시글 작성 버튼 우측 상단 정렬 */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                                <button
                                    onClick={() => openComposer()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        border: '1.5px solid #FF4D82',
                                        background: '#FFFFFF',
                                        color: '#FF4D82',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 8px rgba(255, 77, 130, 0.05)'
                                    }}
                                >
                                    <PenSquare size={13} color="#FF4D82" strokeWidth={2.5} />
                                    {t('community_page.write_post')}
                                </button>
                            </div>

                            {/* 아직 게시글이 없어요 컨텐츠 */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                marginTop: '10px'
                            }}>
                                <div style={{
                                    fontSize: '54px',
                                    marginBottom: '20px',
                                    filter: 'drop-shadow(0 8px 12px rgba(255, 77, 130, 0.15))'
                                }}>
                                    ✍️
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#2A2624', margin: '0 0 8px' }}>
                                    {searchQuery ? t('community_page.states.no_results_title') : t('community_page.states.empty_title')}
                                </h3>
                                <p style={{ fontSize: '13px', color: '#8A847F', margin: '0' }}>
                                    {searchQuery
                                        ? t('community_page.states.no_results_desc')
                                        : t('community_page.states.empty_desc')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 게시글이 존재할 때: 상단 글 작성 단독 바 */}
                            <div style={{
                                background: '#FFFFFF',
                                border: '1.5px solid #FFE4E6',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                boxShadow: '0 4px 14px rgba(255, 77, 130, 0.02)',
                                marginBottom: '8px'
                            }}>
                                <button
                                    onClick={() => openComposer()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        border: '1.5px solid #FF4D82',
                                        background: '#FFFFFF',
                                        color: '#FF4D82',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 8px rgba(255, 77, 130, 0.05)'
                                    }}
                                >
                                    <PenSquare size={13} color="#FF4D82" strokeWidth={2.5} />
                                    {t('community_page.write_post')}
                                </button>
                            </div>
                            {filteredPosts.map(post => {
                            const postCategory = getPostCategory(post);
                            const cleanDesc = stripCommunityMetadata(post.desc);
                            const imagePreviewSrcList = getMetaValues(post.desc, COMMUNITY_IMAGE_META_KEY).slice(0, 1);
                            const region = getMetaValue(post.desc, 'REGION') || t('community_page.defaults.region');
                            const hasResult = post.desc.includes('[RESULT:') || post.desc.includes('[TIPS:');
                            const isFresh = post.comments >= 3;

                            return (
                                <div key={post.id} className={styles.card} style={{
                                    position: 'relative', padding: '16px 16px 12px 16px',
                                    paddingRight: imagePreviewSrcList.length > 0 ? '112px' : '16px',
                                    borderRadius: 0, border: 'none', borderBottom: '8px solid #f8fafc',
                                    background: '#fff', display: 'flex', flexDirection: 'column', gap: '2px'
                                }}>
                                    <div className={styles.cardHeader} style={{ padding: 0, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div className={styles.authorInfo} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                                            <span style={{ fontWeight: 600, color: '#64748b' }}>{post.author}</span>
                                            <span>•</span>
                                            <span>{post.time}</span>
                                            <span>•</span>
                                            <span>{region}</span>
                                        </div>
                                        <div className={`${styles.badge} ${styles['badge_' + post.type]}`} style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>
                                            {getCategoryLabel(t, postCategory)}
                                        </div>
                                    </div>

                                    {(isFresh || hasResult) && (
                                        <div className={styles.freshnessBadgeRow} style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                                            {isFresh && <span className={styles.freshBadge_comment} style={{ fontSize: '10px', background: '#eef2ff', color: '#4f46e5', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>{t('community_page.card.fresh_badges.comment')}</span>}
                                            {hasResult && <span className={styles.freshBadge_update} style={{ fontSize: '10px', background: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>{t('community_page.card.fresh_badges.update')}</span>}
                                        </div>
                                    )}

                                    <h2 style={{ margin: '2px 0 4px 0', fontSize: '15px', fontWeight: 600, lineHeight: 1.4 }}>
                                        <Link href={`/community/${post.id}`} style={{ color: '#111827', textDecoration: 'none' }}>{post.title}</Link>
                                    </h2>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.45 }}>
                                        {cleanDesc}
                                    </p>
                                    {imagePreviewSrcList.map(src => (
                                        <div key={src} style={{ position: 'absolute', top: '16px', right: '16px', width: '84px', height: '84px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                                            <Image src={src} alt="" fill unoptimized style={{ objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                    <div className={styles.cardFooter} style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '6px', padding: 0, border: 'none', background: 'transparent' }}>
                                        <div className={styles.statsGroup} style={{ gap: '8px' }}>
                                            <span>💬 {post.comments}</span>
                                            <span>👍 {post.likes_count || 0}</span>
                                        </div>
                                        <button onClick={(e) => handleToggleSaveInFeed(e, post.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: 0, fontSize: '14px' }}>
                                            {savedIds.includes(post.id) ? '⭐' : '🔖'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        </>
                    )}
                </div>
            </div>

            {draft.open && (
                <div className={styles.modalOverlay} onClick={() => draftDispatch({ type: 'CLOSE' })}>
                    <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>
                                {draft.editingPostId ? t('community_page.form.edit_title') : t('community_page.form.write_title')}
                            </h2>
                        </div>
                        <div className={styles.modalBody} style={{ padding: '16px' }}>
                            {isAuthenticated !== true ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px 20px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', height: '56px', width: '56px', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', background: '#fdf2f8' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ height: '28px', width: '28px', color: '#db2777' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{t('community_page.login_required.title')}</h3>
                                        <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#64748b', margin: 0 }}>{t('community_page.login_required.description')}</p>
                                    </div>
                                </div>
                            ) : (
                            <>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('community_page.form.category_label')}</label>
                                <select className={styles.formSelect} value={draft.type} onChange={e => draftDispatch({ type: 'SET_FIELD', payload: { type: e.target.value as CommunityCategory | '' } })}>
                                    <option value="">{t('community_page.form.select_category')}</option>
                                    {communityCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('community_page.form.region_label')}</label>
                                <select
                                    className={styles.formSelect}
                                    value={draft.region}
                                    onChange={e => draftDispatch({ type: 'SET_FIELD', payload: { region: e.target.value } })}
                                >
                                    <option value=""></option>
                                    <option value="서울">서울</option>
                                    <option value="경기">경기</option>
                                    <option value="인천">인천</option>
                                    <option value="부산">부산</option>
                                    <option value="대구">대구</option>
                                    <option value="대전">대전</option>
                                    <option value="광주">광주</option>
                                    <option value="울산">울산</option>
                                    <option value="세종">세종</option>
                                    <option value="강원">강원</option>
                                    <option value="충북">충북</option>
                                    <option value="충남">충남</option>
                                    <option value="전북">전북</option>
                                    <option value="전남">전남</option>
                                    <option value="경북">경북</option>
                                    <option value="경남">경남</option>
                                    <option value="제주">제주</option>
                                    <option value="기타">기타</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>{t('community_page.form.title_label.default')}</label>
                                <input className={styles.formInput} value={draft.title} onChange={e => draftDispatch({ type: 'SET_FIELD', payload: { title: e.target.value } })} />
                            </div>

                            <div className={styles.formGroup}>
                                <label>{t('community_page.form.desc_label.default')}</label>
                                <textarea className={styles.formTextarea} value={draft.desc} onChange={e => draftDispatch({ type: 'SET_FIELD', payload: { desc: e.target.value } })} />
                            </div>

                            {/* Image Upload/Preview Field */}
                            <div className={styles.formGroup} style={{ marginBottom: '100px' }}>
                                <label>{t('community_page.form.image_label')} {t('community_page.form.image.limit_label', { count: COMMUNITY_IMAGE_LIMIT })}</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                    {draft.images.map((img) => (
                                        <div key={img.id} style={{ position: 'relative', width: '80px', height: '80px' }}>
                                            <Image
                                                src={img.dataUrl}
                                                alt=""
                                                fill
                                                style={{ objectFit: 'cover', borderRadius: '8px' }}
                                                unoptimized
                                            />
                                            <button
                                                onClick={() => handleRemoveImage(img.id)}
                                                style={{
                                                    position: 'absolute', top: '-6px', right: '-6px',
                                                    background: '#ef4444', color: '#fff', border: 'none',
                                                    borderRadius: '50%', width: '22px', height: '22px',
                                                    cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {draft.images.length < COMMUNITY_IMAGE_LIMIT && (
                                        <button
                                            onClick={() => imageInputRef.current?.click()}
                                            style={{
                                                width: '80px', height: '80px', border: '1px solid #e2e8f0',
                                                borderRadius: '12px', cursor: 'pointer', background: '#f8fafc',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                justifyContent: 'center', color: '#64748b', transition: 'all 0.2s',
                                                gap: '4px'
                                            }}
                                        >
                                            <span style={{ fontSize: '24px', color: '#94a3b8' }}>+</span>
                                            <span style={{ fontSize: '12px', fontWeight: 500 }}>{t('community_page.form.add_photo')}</span>
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={imageInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleImageSelect}
                                    multiple
                                    accept="image/*"
                                />
                                {draft.isPreparingImage && <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{t('community_page.form.preparing_images')}</p>}
                            </div>
                            </>
                            )}
                        </div>
                        <div className={styles.modalFooter} style={{
                            display: 'flex', gap: '8px', padding: '16px 20px 30px',
                            borderTop: '1px solid #f1f5f9', background: '#fff',
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px',
                            zIndex: 100
                        }}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => draftDispatch({ type: 'CLOSE' })}
                                style={{
                                    flex: 1, padding: '15px', borderRadius: '14px', border: '1px solid #e2e8f0',
                                    background: '#fff', color: '#64748b', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                {t('community_page.form.cancel')}
                            </button>
                            {isAuthenticated !== true ? (
                                <button
                                    className={styles.submitBtn}
                                    onClick={() => {
                                        draftDispatch({ type: 'CLOSE' });
                                        router.push('/auth/login');
                                    }}
                                    style={{
                                        flex: 2, padding: '15px', borderRadius: '14px', border: 'none',
                                        background: '#FF4D82', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(255,77,130,0.2)'
                                    }}
                                >
                                    {t('community_page.login_required.cta')}
                                </button>
                            ) : (
                                <button
                                    className={styles.submitBtn}
                                    onClick={handleSubmit}
                                    disabled={draft.isSubmitting}
                                    style={{
                                        flex: 2, padding: '15px', borderRadius: '14px', border: 'none',
                                        background: '#FF4D82', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                                        opacity: draft.isSubmitting ? 0.7 : 1, boxShadow: '0 4px 12px rgba(255,77,130,0.2)'
                                    }}
                                >
                                    {draft.isSubmitting ? '...' : t('community_page.form.submit')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
