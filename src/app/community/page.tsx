'use client';

import Image from 'next/image';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
type CommunitySubFilter = 'all' | 'saved' | 'reacted' | 'mine' | 'recruiting' | 'active_reactions' | 'open_meetup' | 'weekend' | 'fresh';

const CATEGORY_OPTIONS: CommunityCategory[] = ['meetup', 'beauty_review', 'food_review', 'travel_review', 'help'];
const SUB_FILTER_OPTIONS: CommunitySubFilter[] = ['all', 'saved', 'reacted', 'mine', 'recruiting', 'active_reactions', 'open_meetup', 'weekend', 'fresh'];
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

const getSubFilterLabel = (t: (key: string, options?: Record<string, unknown>) => string, subFilter: CommunitySubFilter) =>
    t(`community_page.sub_filters.${subFilter}`);





export default function CommunityPage() {
    const { t } = useTranslation('common');

    

    const [mounted, setMounted] = useState(false);

    const [filter, setFilter] = useState<string>('all');
    const [posts, setPosts] = useState<Post[]>(() => {
        if (typeof window !== 'undefined') {
            try { return JSON.parse(localStorage.getItem('kello_community_posts') || '[]'); } catch { return []; }
        }
        return [];
    });
    const [loading, setLoading] = useState(posts.length === 0);

    useEffect(() => {
        setMounted(true);
        const handlePostUpdate = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail && typeof detail.id === 'number' && typeof detail.comments === 'number') {
                setPosts(prev => prev.map(p => p.id === detail.id ? { ...p, comments: detail.comments } : p));
            }
        };
        window.addEventListener('community_post_updated', handlePostUpdate);
        return () => window.removeEventListener('community_post_updated', handlePostUpdate);
    }, []);


    const [searchQuery, setSearchQuery] = useState('');
    const [subFilter] = useState('all');

    const [isWriting, setIsWriting] = useState(false);
    const [newType, setNewType] = useState<CommunityCategory | ''>('');
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newRegion, setNewRegion] = useState('');
    const [newPoint, setNewPoint] = useState('');
    const [newTags, setNewTags] = useState<string[]>([]);
    const [isOpenForMeetup, setIsOpenForMeetup] = useState(false);
    const [newImages, setNewImages] = useState<CommunityImageDraft[]>([]);
    const [isPreparingImage, setIsPreparingImage] = useState(false);
    const [savedIds, setSavedIds] = useState<number[]>([]);
    const [reactedIds, setReactedIds] = useState<number[]>([]);
    const [feedError, setFeedError] = useState<string | null>(null);

    const communityCategories = CATEGORY_OPTIONS.map((id) => ({ id, label: getCategoryLabel(t, id) }));
    const communitySubFilters = SUB_FILTER_OPTIONS.map((id) => ({ id, label: getSubFilterLabel(t, id) }));
    const getCategoryText = (category: CommunityCategory | '') => 
        category ? getCategoryLabel(t, category) : t('community_page.form.select_category');

    const getNavSummary = () => {
        const currentTab = filter === 'all' ? t('community_page.categories.all') : getCategoryText(filter as CommunityCategory);
        const currentSub = communitySubFilters.find((sub) => sub.id === subFilter)?.label || '';
        if (subFilter === 'all') return t('community_page.nav_summary.all', { tab: currentTab });
        return t('community_page.nav_summary.default', { sub: currentSub, tab: currentTab });
    };


    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPostId, setEditingPostId] = useState<number | null>(null);
    const [loggedInUserName, setLoggedInUserName] = useState("Jessie Kim");
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!tabsRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - tabsRef.current.offsetLeft);
        setScrollLeft(tabsRef.current.scrollLeft);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !tabsRef.current) return;
        e.preventDefault();
        const x = e.pageX - tabsRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed
        tabsRef.current.scrollLeft = scrollLeft - walk;
    };

    const searchParams = useSearchParams();
    useEffect(() => {
        const initialSearch = searchParams.get('search');
        if (initialSearch) setSearchQuery(initialSearch);
    }, [searchParams]);

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
        setLoading(true); setFeedError(null);
        try {
            const { data, error } = await supabase
                .from('community_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (Array.isArray(data)) {
                setPosts(data as Post[]);
                localStorage.setItem('kello_community_posts', JSON.stringify(data));
                return;
            }
            const meaningfulError = getMeaningfulFetchError(error);
            const errorLogMessage = formatMeaningfulFetchError(meaningfulError);
            if (errorLogMessage) setFeedError(t('community_page.states.fetch_failed_desc'));
        } catch {
            setFeedError(t('community_page.states.fetch_failed_desc'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                if (parsed.name) setLoggedInUserName(parsed.name);
            }
        } catch {}
        const saved = JSON.parse(localStorage.getItem('kello_saved_posts') || '[]');
        const reacted = JSON.parse(localStorage.getItem('kello_reacted_posts') || '[]');
        setSavedIds(saved);
        setReactedIds(reacted);
        fetchPosts();
    }, [fetchPosts]);

    const resetDraftForm = (category: CommunityCategory | '' = '') => {
        setEditingPostId(null); setNewType(category); setNewTitle(''); setNewDesc('');
        setNewRegion(''); setNewPoint(''); setNewTags([]); setIsOpenForMeetup(false);
        setNewImages([]); if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const openComposer = (category: CommunityCategory | '' = '') => {
        resetDraftForm(category); setIsWriting(true);
    };

    const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) return;
        const availableSlots = COMMUNITY_IMAGE_LIMIT - newImages.length;
        if (availableSlots <= 0) return;
        setIsPreparingImage(true);
        try {
            const preparedImages = await Promise.all(
                files.slice(0, availableSlots).map(async (file, index) => ({
                    id: `${Date.now()}-${index}`,
                    dataUrl: await prepareCommunityImage(file),
                    name: file.name
                }))
            );
            setNewImages(prev => [...prev, ...preparedImages]);
        } catch { alert(t('community_page.form.image.load_failed_alert')); } finally { setIsPreparingImage(false); event.target.value = ''; }
    };

    const handleRemoveImage = (imageId: string) => setNewImages(prev => prev.filter(img => img.id !== imageId));

    const handleSubmit = async () => {
        if (!newType || !newTitle.trim() || !newDesc.trim()) return;
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Login required');

            const uploadedUrls = await Promise.all(newImages.map(async (img) => {
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
            const composedDesc = `${stripCommunityMetadata(newDesc)}\n\n[CATEGORY:${newType}]\n[REGION:${newRegion}]\n[POINT:${newPoint}]\n[TAGS:${newTags.join(',')}]\n[MEETUP_OPEN:${isOpenForMeetup}]${imageMeta}`;

            const payload = {
                author_user_id: user.id, author: loggedInUserName, flag: '🌍',
                type: getDatabaseTypeForCategory(newType), title: newTitle, desc: composedDesc,
                time: t('community_page.time.just_now'), comments: 0
            };

            const { error } = editingPostId 
                ? await supabase.from('community_posts').update(payload).eq('id', editingPostId)
                : await supabase.from('community_posts').insert([payload]);

            if (error) throw error;
            setIsWriting(false); resetDraftForm(); fetchPosts(); showToast(t('community_page.toasts.submitted'));
        } catch (err) { alert(String(err)); } finally { setIsSubmitting(false); }
    };

    const filteredPosts = posts.filter(p => {
        const postCategory = getPostCategory(p);
        const matchesTab = filter === 'all' || postCategory === filter;
        const normalizedSearch = searchQuery.toLowerCase();
        const matchesSearch = p.title.toLowerCase().includes(normalizedSearch) || p.desc.toLowerCase().includes(normalizedSearch);
        if (!matchesSearch) return false;
        if (subFilter === 'saved') return savedIds.includes(p.id);
        if (subFilter === 'mine') return p.author === loggedInUserName;
        if (subFilter === 'reacted') return reactedIds.includes(p.id);
        if (subFilter === 'open_meetup') return p.desc.includes('[MEETUP_OPEN:true]');
        if (subFilter === 'active_reactions') return p.comments > 0;
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
                <header className={styles.header}>
                    <h1 className={styles.title}>{t('community_page.hero.title')}</h1>

                    <div className={styles.searchBar}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input 
                            className={styles.searchInput} 
                            placeholder={t('community_page.hero.search_placeholder')} 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                        />
                    </div>
                    <div 
                        className={styles.tabs}
                        ref={tabsRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
                    >
                        <button 
                            className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`} 
                            onClick={() => { setFilter('all'); setLoading(true); setTimeout(()=>setLoading(false),200); }}
                        >
                            {t('community_page.categories.all')}
                        </button>
                        {communityCategories.map((category) => (
                            <button 
                                key={category.id} 
                                className={`${styles.tab} ${filter === category.id ? styles.activeTab : ''}`} 
                                onClick={() => { setFilter(category.id); setLoading(true); setTimeout(() => setLoading(false), 200); }}
                            >
                                {category.label}
                            </button>
                        ))}
                    </div>
                </header>

                <div className={styles.feed} style={{ background: '#f8fafc', padding: 0 }}>
                    <div className={styles.navSummaryBox} style={{ background: '#fff' }}>
                        <div className={styles.summaryText}>{getNavSummary()}</div>
                    </div>

                    {feedError ? (
                        <div className={styles.emptyStateContainer}>{feedError}</div>
                    ) : loading ? (
                        <div className={styles.skeletonFeed}>
                            {[1, 2, 3].map(n => <div key={n} className={styles.skeletonCard} />)}
                        </div>
                    ) : filteredPosts.length === 0 ? (
                        <div className={styles.emptyStateContainer}>{t('community_page.states.no_results_title')}</div>
                    ) : (
                        filteredPosts.map(post => {
                            const postCategory = getPostCategory(post);
                            const cleanDesc = stripCommunityMetadata(post.desc);
                            const imagePreviewSrcList = getMetaValues(post.desc, COMMUNITY_IMAGE_META_KEY).slice(0, 1);
                            const region = getMetaValue(post.desc, 'REGION') || t('community_page.defaults.region');
                            const hasResult = post.desc.includes('[RESULT:') || post.desc.includes('[TIPS:');
                            const isFresh = post.comments >= 3;

                            return (
                                <div key={post.id} className={styles.card} style={{ 
                                    position:'relative', padding: '16px 16px 12px 16px', 
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
                                        <div key={src} style={{ position:'absolute', top:'16px', right:'16px', width:'84px', height:'84px', borderRadius:'8px', overflow:'hidden', border: '1px solid #f1f5f9' }}>
                                            <Image src={src} alt="" fill unoptimized style={{ objectFit:'cover' }} />
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
                        })
                    )}
                </div>
            </div>

            {/* FAB - Absolute position within container (relative) */}
            <button
                onClick={() => openComposer()}
                style={{
                    position:'absolute', bottom:'88px', right:'16px',
                    zIndex:1000, background:'#f06292', color:'#fff',
                    border:'none', borderRadius:'28px', padding:'14px 22px',
                    fontSize:'15px', fontWeight:700, cursor:'pointer',
                    boxShadow:'0 8px 24px rgba(240,98,146,0.3)',
                    display:'flex', alignItems:'center', gap:'8px',
                    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
            >
                ✏️ {t('community_page.fab.create_post')}
            </button>

            {isWriting && (
                <div className={styles.modalOverlay} onClick={() => setIsWriting(false)}>
                    <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>
                                {editingPostId ? t('community_page.form.edit_title') : t('community_page.form.write_title')}
                            </h2>
                        </div>
                        <div className={styles.modalBody} style={{ padding: '16px' }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('community_page.form.category_label')}</label>
                                <select className={styles.formSelect} value={newType} onChange={e => setNewType(e.target.value as CommunityCategory | '')}>
                                    <option value="">{t('community_page.form.select_category')}</option>
                                    {communityCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>{t('community_page.form.region_label')}</label>
                                <input 
                                    className={styles.formInput} 
                                    value={newRegion} 
                                    onChange={e => setNewRegion(e.target.value)} 
                                    placeholder={t('community_page.form.region_placeholder')} 
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>{t('community_page.form.title_label.default')}</label>
                                <input className={styles.formInput} value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t('community_page.form.title_placeholder.default')} />
                            </div>
                            


                            <div className={styles.formGroup}>
                                <label>{t('community_page.form.desc_label.default')}</label>
                                <textarea className={styles.formTextarea} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder={t('community_page.form.desc_placeholder.default')} />
                            </div>

                            {/* Image Upload/Preview Field */}
                            <div className={styles.formGroup} style={{ marginBottom: '100px' }}>
                                <label>{t('community_page.form.image_label')} {t('community_page.form.image.limit_label', { count: COMMUNITY_IMAGE_LIMIT })}</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                    {newImages.map((img) => (
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
                                    {newImages.length < COMMUNITY_IMAGE_LIMIT && (
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
                                {isPreparingImage && <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{t('community_page.form.preparing_images')}</p>}
                            </div>
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
                                onClick={() => setIsWriting(false)}
                                style={{
                                    flex: 1, padding: '15px', borderRadius: '14px', border: '1px solid #e2e8f0',
                                    background: '#fff', color: '#64748b', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                {t('community_page.form.cancel')}
                            </button>
                            <button 
                                className={styles.submitBtn} 
                                onClick={handleSubmit} 
                                disabled={isSubmitting}
                                style={{
                                    flex: 2, padding: '15px', borderRadius: '14px', border: 'none',
                                    background: '#2563eb', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                                    opacity: isSubmitting ? 0.7 : 1, boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                                }}
                            >
                                {isSubmitting ? '...' : t('community_page.form.submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
