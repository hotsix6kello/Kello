'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import styles from './detail.module.css';
import ExploreMap from '@/app/explore/components/ExploreMap';

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

interface Comment {
    id: number;
    author: string;
    content: string;
    created_at: string;
}

type CommunityStatus = 'REVIEWS' | 'REACTING' | 'SURVEYING' | 'DRAFTING' | 'CLOSED';
type CommunityTag = 'solo_friendly' | 'friends_friendly' | 'photo_spot' | 'waiting' | 'foreigner_friendly';
type SignalIntent = 'interested' | 'available_this_week' | 'join_if_schedule_fits' | 'thanks' | 'question';
type SignalTime = 'this_week' | 'this_weekend' | 'next_week' | 'schedule_coordination';

const STATUS_KEY_MAP: Record<CommunityStatus, 'reviews' | 'reacting' | 'surveying' | 'drafting' | 'closed'> = {
    REVIEWS: 'reviews',
    REACTING: 'reacting',
    SURVEYING: 'surveying',
    DRAFTING: 'drafting',
    CLOSED: 'closed',
};

const TAG_OPTIONS: CommunityTag[] = ['solo_friendly', 'friends_friendly', 'photo_spot', 'waiting', 'foreigner_friendly'];
const LEGACY_TAG_MAP: Record<string, CommunityTag> = {
    '혼자 가기 좋음': 'solo_friendly',
    '친구랑 가기 좋음': 'friends_friendly',
    '사진 맛집': 'photo_spot',
    '웨이팅 있음': 'waiting',
    '외국인 편함': 'foreigner_friendly',
};

const SIGNAL_INTENTS: SignalIntent[] = ['interested', 'available_this_week', 'join_if_schedule_fits', 'thanks', 'question'];
const LEGACY_INTENT_MAP: Record<string, SignalIntent> = {
    '저도 가보고 싶어요': 'interested',
    '이번 주 가능해요': 'available_this_week',
    '날짜 맞으면 같이 가요': 'join_if_schedule_fits',
    '정보 감사합니다': 'thanks',
    '질문 있어요': 'question',
};

const SIGNAL_TIMES: SignalTime[] = ['this_week', 'this_weekend', 'next_week', 'schedule_coordination'];
const LEGACY_TIME_MAP: Record<string, SignalTime> = {
    '이번 주': 'this_week',
    '이번 주말': 'this_weekend',
    '다음 주': 'next_week',
    '날짜 조율': 'schedule_coordination',
};

const normalizeTag = (value: string): CommunityTag | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (TAG_OPTIONS.includes(trimmed as CommunityTag)) return trimmed as CommunityTag;
    return LEGACY_TAG_MAP[trimmed] ?? null;
};

const normalizeIntent = (value: string): SignalIntent | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (SIGNAL_INTENTS.includes(trimmed as SignalIntent)) return trimmed as SignalIntent;
    return LEGACY_INTENT_MAP[trimmed] ?? null;
};

const normalizeTime = (value: string): SignalTime | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (SIGNAL_TIMES.includes(trimmed as SignalTime)) return trimmed as SignalTime;
    return LEGACY_TIME_MAP[trimmed] ?? null;
};

const getStatusLabel = (t: (key: string, options?: Record<string, unknown>) => string, status: string) => {
    const key = STATUS_KEY_MAP[status as CommunityStatus];
    return key ? t(`community_page.status.${key}`) : status;
};

const getTagLabel = (t: (key: string, options?: Record<string, unknown>) => string, tag: string) => {
    const normalized = normalizeTag(tag);
    return normalized ? t(`community_page.tags.${normalized}`) : tag;
};

const getIntentLabel = (t: (key: string, options?: Record<string, unknown>) => string, intent: string) => {
    const normalized = normalizeIntent(intent);
    return normalized ? t(`community_page.detail_page.signal_intents.${normalized}`) : intent;
};

const getTimeLabel = (t: (key: string, options?: Record<string, unknown>) => string, time: string) => {
    const normalized = normalizeTime(time);
    return normalized ? t(`community_page.detail_page.signal_times.${normalized}`) : time;
};

export default function CommunityDetailPage() {
    const { t } = useTranslation('common');
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [selectedIntent, setSelectedIntent] = useState<SignalIntent | null>(null);
    const [selectedTime, setSelectedTime] = useState<SignalTime | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loggedInUserName, setLoggedInUserName] = useState("Jessie Kim");
    const [allPosts, setAllPosts] = useState<Post[]>([]);

    // Step 14: Safety States
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingItem, setReportingItem] = useState<{ id: number; type: 'post' | 'comment' } | null>(null);
    const [hiddenComments, setHiddenComments] = useState<number[]>([]);
    const [isPostMoreMenuOpen, setIsPostMoreMenuOpen] = useState(false);
    const [activeCommentMenu, setActiveCommentMenu] = useState<number | null>(null);
    const [isPostHidden, setIsPostHidden] = useState(false);

    // Step 17: Activity Tracking States
    const [isSaved, setIsSaved] = useState(false);

    // Step 21: Accordion States for Information Density
    const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({
        strength: false,
        decision: false,
        safety: false
    });

    const toggleExpand = (section: string) => {
        setIsExpanded(prev => ({ ...prev, [section]: !prev[section] }));
    };

    useEffect(() => {
        if (!id) return;
        
        // Check if saved
        const savedPosts = JSON.parse(localStorage.getItem('kello_saved_posts') || '[]');
        setIsSaved(savedPosts.includes(Number(id)));

        // Update recently viewed
        let recentlyViewed = JSON.parse(localStorage.getItem('kello_recently_viewed') || '[]');
        recentlyViewed = [Number(id), ...recentlyViewed.filter((sid: number) => sid !== Number(id))].slice(0, 10);
        localStorage.setItem('kello_recently_viewed', JSON.stringify(recentlyViewed));
    }, [id]);

    const toggleSave = () => {
        const savedPosts = JSON.parse(localStorage.getItem('kello_saved_posts') || '[]');
        let newSaved;
        if (isSaved) {
            newSaved = savedPosts.filter((sid: number) => sid !== Number(id));
        } else {
            newSaved = [...savedPosts, Number(id)];
        }
        localStorage.setItem('kello_saved_posts', JSON.stringify(newSaved));
        setIsSaved(!isSaved);
    };

    const reportReasons = [
        t('community_page.report.reasons.ad_spam'),
        t('community_page.report.reasons.offensive'),
        t('community_page.report.reasons.contact'),
        t('community_page.report.reasons.unsafe'),
        t('community_page.report.reasons.other'),
    ];

    const fetchPostData = async () => {
        setLoading(true);
        // Fetch Post
        const { data: postData } = await supabase
            .from('community_posts')
            .select('*')
            .eq('id', id)
            .single();

        if (postData) {
            setPost(postData);
        }

        // Fetch Comments
        const { data: commentsData } = await supabase
            .from('community_comments')
            .select('*')
            .eq('post_id', id)
            .order('created_at', { ascending: true });

        if (commentsData) {
            setComments(commentsData as Comment[]);
        }

        // Fetch All Posts for Related Section - Step 19
        const { data: allData } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false });
        if (allData) setAllPosts(allData as Post[]);

        setLoading(false);
    };

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                if (parsed.name) setLoggedInUserName(parsed.name);
            }
        } catch {
            // ignore
        }

        if (id) {
            fetchPostData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const [resultText, setResultText] = useState('');

    const handleUpdateStatus = async (newStatus: string) => {
        if (!post) return;
        
        let newDesc = post.desc;
        if (newDesc.includes('[STATUS:')) {
            newDesc = newDesc.replace(/\[STATUS:.*?\]/, `[STATUS:${newStatus}]`);
        } else {
            newDesc = `${newDesc} [STATUS:${newStatus}]`;
        }

        const { error } = await supabase
            .from('community_posts')
            .update({ desc: newDesc })
            .eq('id', post.id);

        if (!error) {
            setPost({ ...post, desc: newDesc });
            fetchPostData();
        }
    };

    const handleUpdateResult = async (visited: boolean) => {
        if (!post || !resultText.trim()) return;

        let newDesc = post.desc;
        const resultTag = `[RESULT:${resultText}]`;
        const visitTag = `[VISITED:${visited}]`;
        const tipsTag = `[TIPS:${visited
            ? t('community_page.detail_page.result.tips_visited')
            : t('community_page.detail_page.result.tips_retry')}]`;

        // Replace or Append
        if (newDesc.includes('[RESULT:')) newDesc = newDesc.replace(/\[RESULT:.*?\]/, resultTag);
        else newDesc = `${newDesc} ${resultTag}`;

        if (newDesc.includes('[VISITED:')) newDesc = newDesc.replace(/\[VISITED:.*?\]/, visitTag);
        else newDesc = `${newDesc} ${visitTag}`;

        if (newDesc.includes('[TIPS:')) newDesc = newDesc.replace(/\[TIPS:.*?\]/, tipsTag);
        else newDesc = `${newDesc} ${tipsTag}`;

        const { error } = await supabase
            .from('community_posts')
            .update({ desc: newDesc })
            .eq('id', post.id);

        if (!error) {
            setResultText('');
            fetchPostData();
            alert(t('community_page.detail_page.result.saved_alert'));
        }
    };

    const handleSubmitComment = async () => {
        if ((!newComment.trim() && !selectedIntent) || !post) return;
        setIsSubmitting(true);
        
        let finalContent = newComment;
        if (selectedIntent) {
            finalContent = `[SIGNAL:${selectedIntent}]${selectedTime ? `[TIME:${selectedTime}]` : ''}${newComment}`;
        }

        const { error } = await supabase.from('community_comments').insert([{
            post_id: post.id,
            author: loggedInUserName,
            content: finalContent
        }]);

        if (!error) {
            setNewComment('');
            setSelectedIntent(null);
            setSelectedTime(null);
            // Update comments count lightly
            await supabase.from('community_posts').update({ comments: post.comments + 1 }).eq('id', post.id);

            // Step 17: Track Reacted Post
            const reactedPosts = JSON.parse(localStorage.getItem('kello_reacted_posts') || '[]');
            if (!reactedPosts.includes(post.id)) {
                localStorage.setItem('kello_reacted_posts', JSON.stringify([...reactedPosts, post.id]));
            }

            fetchPostData();
        }
        setIsSubmitting(false);
    };

    const handleReport = (reason: string) => {
        const itemLabel = reportingItem?.type === 'post'
            ? t('community_page.report.item_post')
            : t('community_page.report.item_comment');
        alert(t('community_page.report.submitted_alert', { item: itemLabel, reason }));
        setIsReportModalOpen(false);
        setReportingItem(null);
    };

    if (loading) return <div className={styles.loading}>{t('community_page.detail_page.loading')}</div>;
    if (!post || isPostHidden) return (
        <div className={styles.loading}>
            {isPostHidden ? t('community_page.detail_page.hidden_post') : t('community_page.detail_page.not_found')}
            {isPostHidden && <button onClick={() => setIsPostHidden(false)} style={{ display: 'block', margin: '10px auto', padding: '8px 16px', background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none' }}>{t('community_page.detail_page.show_hidden')}</button>}
        </div>
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>←</button>
                <h1 className={styles.headerTitle}>{t('community_page.detail', { defaultValue: 'Post Detail' })}</h1>
            </header>

            <div className={styles.content}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.avatar}>{post.flag}</div>
                        <div className={styles.authorInfo}>
                            <div className={styles.authorName}>{post.author}</div>
                            <div className={styles.postTime}>{post.time}</div>
                        </div>
                        <div className={styles.moreMenuWrapper}>
                            <button className={styles.moreBtn} onClick={() => setIsPostMoreMenuOpen(!isPostMoreMenuOpen)}>⋮</button>
                            {isPostMoreMenuOpen && (
                                <div className={styles.moreMenuDropdown}>
                                    <button className={`${styles.moreMenuItem} ${styles.moreMenuItem_report}`} onClick={() => {
                                        setReportingItem({ id: post.id, type: 'post' });
                                        setIsReportModalOpen(true);
                                        setIsPostMoreMenuOpen(false);
                                    }}>{t('community_page.report.report_action')}</button>
                                    <button className={styles.moreMenuItem} onClick={() => {
                                        setIsPostHidden(true);
                                        setIsPostMoreMenuOpen(false);
                                    }}>{t('community_page.detail_page.hide_post')}</button>
                                </div>
                            )}
                        </div>
                        <button 
                            className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`} 
                            onClick={toggleSave}
                            aria-label={t('community_page.detail_page.save_post_aria')}
                        >
                            {isSaved ? '⭐' : '☆'}
                        </button>
                    </div>
                    <h2 className={styles.postTitle}>{post.title}</h2>

                    {/* Step 20: Freshness Summary Bar */}
                    {(() => {
                        const hasResult = post.desc.includes('[RESULT:') || post.desc.includes('[TIPS:');
                        const commentsCount = comments.length || 0;
                        let freshText = "";
                        
                        if (commentsCount >= 5) freshText = t('community_page.detail_page.freshness.realtime');
                        else if (hasResult) freshText = t('community_page.detail_page.freshness.updated');
                        else if (commentsCount >= 1) freshText = t('community_page.detail_page.freshness.active');
                        else freshText = t('community_page.detail_page.freshness.calm');

                        return (
                            <div className={styles.freshnessSummaryBar}>
                                ⏱️ {freshText}
                            </div>
                        );
                    })()}

                    {/* Step 16 & 21: Post Strength Summary - Accordion */}
                    {(() => {
                        const strengths = [];
                        const cleanDescText = post.desc.replace(/\[.*?\]/g, '').trim();
                        const hasPoint = post.desc.includes('[POINT:');
                        const hasTags = post.desc.includes('[TAGS:');
                        const hasResult = post.desc.includes('[RESULT:') || post.desc.includes('[TIPS:');
                        const commentsCount = comments.length || 0;

                        if (post.type === 'review' && cleanDescText.length > 80 && hasPoint && hasTags) {
                            strengths.push(t('community_page.detail_page.strengths.organized'));
                        }
                        if (commentsCount >= 5) {
                            strengths.push(t('community_page.detail_page.strengths.active'));
                        }
                        if (hasResult) {
                            strengths.push(t('community_page.detail_page.strengths.visited_tip'));
                        }
                        if (strengths.length === 0) strengths.push(t('community_page.detail_page.strengths.new'));

                        return (
                            <div className={styles.strengthAccordion}>
                                <div className={styles.accordionHeader} onClick={() => toggleExpand('strength')}>
                                    <span className={styles.accordionTitle}>{t('community_page.detail_page.strengths.title')}</span>
                                    <span className={styles.accordionIcon}>{isExpanded.strength ? '▲' : '▼'}</span>
                                </div>
                                {isExpanded.strength && (
                                    <div className={styles.accordionContent}>
                                        <div className={styles.strengthList}>
                                            {strengths.map((str, idx) => (
                                                <span key={idx} className={styles.strengthItem}>{str}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    
                    {/* Decision Support UI - Step 10 & 21 (Accordion) */}
                    {(() => {
                        const regionMatch = post.desc.match(/\[REGION:(.*?)\]/);
                        const statusMatch = post.desc.match(/\[STATUS:(.*?)\]/);
                        const pointMatch = post.desc.match(/\[POINT:(.*?)\]/);
                        const tagsMatch = post.desc.match(/\[TAGS:(.*?)\]/);
                        const meetupOpenMatch = post.desc.match(/\[MEETUP_OPEN:(.*?)\]/);

                        const currentStatus = statusMatch ? statusMatch[1] : (post.type === 'review' ? 'REVIEWS' : 'REACTING');
                        const displayRegion = regionMatch ? regionMatch[1] : (post.place_name?.split(' ')[0] || '');
                        const displayPoint = pointMatch ? pointMatch[1] : '';
                        const displayTags = tagsMatch
                            ? tagsMatch[1]
                                .split(',')
                                .map((tag) => getTagLabel(t, tag))
                                .filter(Boolean)
                            : [];
                        const isMeetupOpen = meetupOpenMatch ? meetupOpenMatch[1] === 'true' : false;

                        return (
                            <>
                                {/* 1. Basic Meta Info - Always Visible */}
                                <div className={styles.compactMetaRow}>
                                    <span className={`${styles.statusBadge} ${styles['status_' + currentStatus]}`}>
                                        {getStatusLabel(t, currentStatus)}
                                    </span>
                                    <span className={styles.regionValue}>{displayRegion || t('community_page.categories.all')}</span>
                                    {isMeetupOpen && <span className={styles.miniSignalTag}>{t('community_page.detail_page.mini_signal_tag')}</span>}
                                </div>

                                {/* 2. Action Headers - Always Visible */}
                                <div className={styles.actionRowCompact}>
                                    <button className={styles.primaryActionCompact} onClick={() => {
                                        const el = document.getElementById('comment-input-area');
                                        el?.scrollIntoView({ behavior: 'smooth' });
                                    }}>
                                        {currentStatus === 'REVIEWS' ? t('community_page.detail_page.primary_action.review') : t('community_page.detail_page.primary_action.join')}
                                    </button>
                                    <button className={styles.secondaryActionCompact} onClick={toggleSave}>
                                        {isSaved ? t('community_page.detail_page.save.saved') : t('community_page.detail_page.save.default')}
                                    </button>
                                </div>

                                {/* 3. Decision & Guide Accordion - Step 21 */}
                                <div className={styles.decisionAccordion}>
                                    <div className={styles.accordionHeader} onClick={() => toggleExpand('decision')}>
                                        <span className={styles.accordionTitle}>{t('community_page.detail_page.checklist.title')}</span>
                                        <span className={styles.accordionIcon}>{isExpanded.decision ? '▲' : '▼'}</span>
                                    </div>
                                    {isExpanded.decision && (
                                        <div className={styles.accordionContent}>
                                            <div className={styles.decisionGridCompact}>
                                                <div className={styles.decisionBlockCompact}>
                                                    <div className={styles.decisionSubTitle}>{t('community_page.detail_page.checklist.recommended')}</div>
                                                    <div className={styles.decisionListCompact}>
                                                        {displayTags.slice(0, 2).map((tag, idx) => (
                                                            <div key={idx} className={styles.decisionItemCompact}>• {tag}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className={styles.decisionBlockCompact}>
                                                    <div className={styles.decisionSubTitle}>{t('community_page.detail_page.checklist.required')}</div>
                                                    <div className={styles.decisionListCompact}>
                                                        <div className={styles.decisionItemCompact}>• {isMeetupOpen ? t('community_page.detail_page.checklist.comment_check') : t('community_page.detail_page.checklist.read_details')}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            {displayPoint && <div className={styles.pointBoxCompact}>🎯 {displayPoint}</div>}
                                        </div>
                                    )}
                                </div>

                                {/* 4. Safety Guide Accordion - Step 21 */}
                                {isMeetupOpen && (
                                    <div className={styles.safetyAccordion}>
                                        <div className={styles.accordionHeader} onClick={() => toggleExpand('safety')}>
                                            <span className={styles.accordionTitle}>{t('community_page.detail_page.meetup_safety.title')}</span>
                                            <span className={styles.accordionIcon}>{isExpanded.safety ? '▲' : '▼'}</span>
                                        </div>
                                        {isExpanded.safety && (
                                            <div className={styles.accordionContent}>
                                                <div className={styles.safetyListCompact}>
                                                    <div className={styles.safetyItemCompact}>• {t('community_page.detail_page.meetup_safety.item_1')}</div>
                                                    <div className={styles.safetyItemCompact}>• {t('community_page.detail_page.meetup_safety.item_2')}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        );
                    })()}

                    {/* 6. Content Body Content */}
                    <div className={styles.bodyWrapper}>
                        <h3 className={styles.bodyTitle}>{t('community_page.detail_page.body_title')}</h3>
                        <p className={styles.postDescCompact}>{post.desc.replace(/\[.*?\]/g, '').trim()}</p>
                    </div>


                    {(post.start_time || post.place_name) && (
                        <div style={{ marginTop: '20px', background: 'var(--gray-50)', padding: '16px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--foreground)' }}>
                                {t('community_page.meetup_info', { defaultValue: 'Meetup Details' })}
                            </h3>
                            {post.start_time && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--gray-700)' }}>
                                    <span>🕒</span>
                                    <span>{post.start_time} {post.end_time ? ` ~ ${post.end_time}` : ''}</span>
                                </div>
                            )}
                            {post.place_name && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--gray-700)' }}>
                                    <span>📍</span>
                                    <span style={{ fontWeight: 500 }}>{post.place_name}</span>
                                </div>
                            )}
                            {post.place_lat && post.place_lng && (
                                <div style={{ height: '300px', borderRadius: '8px', overflow: 'hidden' }}>
                                    <ExploreMap
                                        items={[]}
                                        center={{ lat: post.place_lat, lng: post.place_lng, name: post.place_name }}
                                        zoom={15}
                                        onItemClick={() => { }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles.stats} style={{ marginTop: '16px' }}>
                        💬 {comments.length} {t('community_page.comments', { defaultValue: 'Comments' })}
                    </div>
                </div>

                <div className={styles.commentSection} id="comment-input-area">
                    {/* Related Posts & Bundle Section - Step 19 */}
                    {(() => {
                        const regionMatch = post.desc.match(/\[REGION:(.*?)\]/);
                        const currentRegion = regionMatch ? regionMatch[1] : (post.place_name?.split(' ')[0] || '');
                        
                        const related = allPosts.filter(p => {
                            if (p.id === post.id) return false;
                            const pRegion = p.desc.match(/\[REGION:(.*?)\]/)?.[1] || (p.place_name?.split(' ')[0] || '');
                            const isSameRegion = currentRegion && pRegion === currentRegion;
                            const isSameType = p.type === post.type;
                            return isSameRegion || isSameType;
                        }).slice(0, 3);

                        return (
                            <div className={styles.relatedSection}>
                                <div className={styles.bundleInfo}>
                                    <h3 className={styles.bundleTitle}>{t('community_page.detail_page.related.bundle_title', { region: currentRegion || t('community_page.detail_page.related.this_region') })}</h3>
                                    <button 
                                        className={styles.moreInRegionBtn}
                                        onClick={() => router.push(`/community?filter=all&subFilter=all&search=${currentRegion}`)}
                                    >
                                        {t('community_page.detail_page.related.more', { region: currentRegion })}
                                    </button>
                                </div>

                                <div className={styles.relatedTitle}>{t('community_page.detail_page.related.title')}</div>
                                {related.length > 0 ? (
                                    <div className={styles.relatedGrid}>
                                        {related.map(rp => (
                                            <div key={rp.id} className={styles.relatedCard} onClick={() => router.push(`/community/${rp.id}`)}>
                                                <div className={styles.relatedEmoji}>{rp.flag}</div>
                                                <div className={styles.relatedInfo}>
                                                    <div className={styles.relatedPostTitle}>{rp.title}</div>
                                                    <div className={styles.relatedMeta}>{rp.author} · {rp.type === 'review' ? t('community_page.detail_page.related.meta.review') : t('community_page.detail_page.related.meta.gathering')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyRelated}>
                                        {t('community_page.detail_page.related.empty_line_1')} <br/>
                                        {t('community_page.detail_page.related.empty_line_2')}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <h3 className={styles.commentTitle}>{t('community_page.detail_page.comments_title')}</h3>

                    {/* Author Response Panel - Step 11 */}
                    {post.author === loggedInUserName && (post.type === 'review' || post.type === 'travel' || post.type === 'meetup') && (() => {
                        const signalComments = comments.filter(c => c.content.includes('[SIGNAL:'));
                        const totalSignals = signalComments.length;
                        
                        if (totalSignals === 0) return null;

                        const intentCounts: Record<string, number> = {};
                        const timeCounts: Record<string, number> = {};
                        signalComments.forEach(c => {
                            const intent = c.content.match(/\[SIGNAL:([^\]]+)\]/)?.[1];
                            const time = c.content.match(/\[TIME:([^\]]+)\]/)?.[1];
                            const normalizedIntent = intent ? (normalizeIntent(intent) ?? intent) : null;
                            const normalizedTime = time ? (normalizeTime(time) ?? time) : null;
                            if (normalizedIntent) intentCounts[normalizedIntent] = (intentCounts[normalizedIntent] || 0) + 1;
                            if (normalizedTime) timeCounts[normalizedTime] = (timeCounts[normalizedTime] || 0) + 1;
                        });

                        const topTime = Object.entries(timeCounts).sort((a,b) => b[1] - a[1])[0]?.[0];
                        const topIntent = Object.entries(intentCounts).sort((a,b) => b[1] - a[1])[0]?.[0];
                        const latestSignals = signalComments.slice(-2).length;

                        // Guide Logic
                        let guideText = "";
                        let actionLabel = "";
                        let actionDraft = "";

                        if (topTime === 'this_weekend') {
                            guideText = t('community_page.detail_page.author_panel.guide.weekend');
                            actionLabel = t('community_page.detail_page.author_panel.action.weekend');
                            actionDraft = t('community_page.detail_page.author_panel.draft.weekend');
                        } else if (Object.keys(timeCounts).length > 1) {
                            guideText = t('community_page.detail_page.author_panel.guide.vote');
                            actionLabel = t('community_page.detail_page.author_panel.action.vote');
                            actionDraft = t('community_page.detail_page.author_panel.draft.vote');
                        } else {
                            guideText = t('community_page.detail_page.author_panel.guide.share');
                            actionLabel = t('community_page.detail_page.author_panel.action.share');
                            actionDraft = t('community_page.detail_page.author_panel.draft.share');
                        }
                        const statusMatch = post.desc.match(/\[STATUS:(.*?)\]/);
                        const currentStatus = statusMatch ? statusMatch[1] : (post.type === 'review' ? 'REVIEWS' : 'REACTING');

                        return (
                            <div className={styles.authorDashboard}>
                                <div className={styles.dashboardHeader}>
                                    <div className={styles.dashboardTitle}>
                                        <span>{t('community_page.detail_page.author_panel.title')}</span>
                                        <span className={`${styles.statusBadge} ${styles['status_' + currentStatus]}`} style={{ marginLeft: '10px' }}>
                                            {getStatusLabel(t, currentStatus)}
                                        </span>
                                    </div>
                                    <div className={styles.authorStatusBadge}>{t('community_page.detail_page.author_panel.badge')}</div>
                                </div>

                                <div className={styles.statsGrid}>
                                    <div className={styles.statItem}>
                                        <div className={styles.statLabel}>{t('community_page.detail_page.author_panel.stats.total')}</div>
                                        <div className={styles.statValue}>{t('community_page.detail_page.author_panel.stats.total_value', { count: totalSignals })}</div>
                                    </div>
                                    <div className={styles.statItem}>
                                        <div className={styles.statLabel}>{t('community_page.detail_page.author_panel.stats.time')}</div>
                                        <div className={styles.statValue}>{topTime ? getTimeLabel(t, topTime) : t('community_page.detail_page.author_panel.stats.time_pending')}</div>
                                    </div>
                                    <div className={styles.statItem}>
                                        <div className={styles.statLabel}>{t('community_page.detail_page.author_panel.stats.intent')}</div>
                                        <div className={styles.statValue} style={{ fontSize: '11px' }}>{topIntent ? getIntentLabel(t, topIntent) : '-'}</div>
                                    </div>
                                    <div className={styles.statItem}>
                                        <div className={styles.statLabel}>{t('community_page.detail_page.author_panel.stats.recent')}</div>
                                        <div className={styles.statValue}>{t('community_page.detail_page.author_panel.stats.recent_value', { count: latestSignals })}</div>
                                    </div>
                                </div>

                                <div className={styles.guideBox}>
                                    <div className={styles.guideText}>💡 {guideText}</div>
                                </div>

                                <div className={styles.quickActionGroup}>
                                    <button className={styles.quickActionBtn} onClick={() => {
                                        setNewComment(actionDraft);
                                        const el = document.getElementById('comment-input-field');
                                        el?.scrollIntoView({ behavior: 'smooth' });
                                        (el as HTMLInputElement)?.focus();
                                    }}>
                                        {actionLabel}
                                    </button>
                                    <button className={styles.quickActionBtn} style={{ color: '#475569', borderColor: '#e2e8f0' }} onClick={() => {
                                        setNewComment(t('community_page.detail_page.author_panel.final_draft'));
                                        const el = document.getElementById('comment-input-field');
                                        el?.scrollIntoView({ behavior: 'smooth' });
                                        (el as HTMLInputElement)?.focus();
                                    }}>
                                        {t('community_page.detail_page.author_panel.final_action')}
                                    </button>
                                </div>

                                {/* Status Control Section - Step 12 */}
                                <div className={styles.statusControlBox}>
                                    <div className={styles.statusControlTitle}>{t('community_page.detail_page.status_controls.title')}</div>
                                    <div className={styles.statusBtnGroup}>
                                        {(Object.keys(STATUS_KEY_MAP) as CommunityStatus[]).map((key) => (
                                            <button
                                                key={key}
                                                className={`${styles.statusBtn} ${currentStatus === key ? (key === 'CLOSED' ? styles.statusBtnActive_CLOSED : styles.statusBtnActive) : ''} ${key === 'CLOSED' ? styles.statusBtn_CLOSED : ''}`}
                                                onClick={() => handleUpdateStatus(key)}
                                            >
                                                {getStatusLabel(t, key)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Result Entry Section - Step 13 */}
                                {(currentStatus === 'CLOSED' || currentStatus === 'DRAFTING') && (
                                    <div className={styles.resultInputArea}>
                                        <div className={styles.statusControlTitle} style={{ color: '#0f172a' }}>{t('community_page.detail_page.result.title')}</div>
                                        <div className={styles.guideBox} style={{ marginTop: 0, marginBottom: '8px', background: '#fff' }}>
                                            <div className={styles.guideText} style={{ fontSize: '11px' }}>
                                                {t('community_page.detail_page.result.help')}
                                            </div>
                                        </div>
                                        <textarea 
                                            className={styles.resultTextarea}
                                            placeholder={t('community_page.detail_page.result.placeholder')}
                                            value={resultText}
                                            onChange={(e) => setResultText(e.target.value)}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className={styles.resultSubmitBtn} style={{ background: '#2563eb' }} onClick={() => handleUpdateResult(true)}>{t('community_page.detail_page.result.save_visited')}</button>
                                            <button className={styles.resultSubmitBtn} onClick={() => handleUpdateResult(false)}>{t('community_page.detail_page.result.save_only')}</button>
                                        </div>
                                    </div>
                                )}

                                {/* Safety Guide for Author - Step 14 */}
                                <div className={styles.safetyGuideBox} style={{ marginTop: '16px', background: '#f8fafc', borderColor: '#e2e8f0' }}>
                                    <div className={styles.safetyGuideTitle} style={{ color: '#475569' }}>{t('community_page.detail_page.author_safety.title')}</div>
                                    <div className={styles.safetyGuideList}>
                                        <div className={styles.safetyGuideItem} style={{ color: '#64748b' }}>• {t('community_page.detail_page.author_safety.item_1')}</div>
                                        <div className={styles.safetyGuideItem} style={{ color: '#64748b' }}>• {t('community_page.detail_page.author_safety.item_2')}</div>
                                        <div className={styles.safetyGuideItem} style={{ color: '#64748b' }}>• {t('community_page.detail_page.author_safety.item_3')}</div>
                                    </div>
                                </div>

                                <div className={styles.dashboardFooter}>
                                    {t('community_page.detail_page.author_panel.footer')}
                                </div>
                            </div>
                        );
                    })()}
                    
                    {/* Interim Meetup Draft Card Section */}
                    {(post.type === 'review' || post.type === 'travel' || post.type === 'meetup') && comments.some(c => c.content.includes('[SIGNAL:')) && (() => {
                        const signalComments = comments.filter(c => c.content.includes('[SIGNAL:'));
                        const totalSignals = signalComments.length;
                        
                        const intentCounts: Record<string, number> = {};
                        const timeCounts: Record<string, number> = {};
                        signalComments.forEach(c => {
                            const intent = c.content.match(/\[SIGNAL:([^\]]+)\]/)?.[1];
                            const time = c.content.match(/\[TIME:([^\]]+)\]/)?.[1];
                            const normalizedIntent = intent ? (normalizeIntent(intent) ?? intent) : null;
                            const normalizedTime = time ? (normalizeTime(time) ?? time) : null;
                            if (normalizedIntent) intentCounts[normalizedIntent] = (intentCounts[normalizedIntent] || 0) + 1;
                            if (normalizedTime) timeCounts[normalizedTime] = (timeCounts[normalizedTime] || 0) + 1;
                        });
                        
                        // Top time logic with tie handling
                        const sortedTimes = Object.entries(timeCounts).sort((a,b) => b[1] - a[1]);
                        const topTimeVal = sortedTimes[0]?.[1];
                        const topTimes = sortedTimes.filter(t => t[1] === topTimeVal).map(t => t[0]);
                        
                        let timeSummary = "";
                        if (topTimes.length > 1) {
                            timeSummary = t('community_page.detail_page.signal_summary.time_split');
                        } else if (topTimes.length === 1) {
                            timeSummary = t('community_page.detail_page.signal_summary.time_focus', { time: getTimeLabel(t, topTimes[0]) });
                        } else {
                            timeSummary = t('community_page.detail_page.signal_summary.time_flexible');
                        }

                        const status = totalSignals >= 4 ? 'active' : (totalSignals >= 2 ? 'forming' : 'preparing');
                        const statusLabel = status === 'active'
                            ? t('community_page.detail_page.signal_summary.status.active')
                            : status === 'forming'
                                ? t('community_page.detail_page.signal_summary.status.forming')
                                : t('community_page.detail_page.signal_summary.status.preparing');
                        const statusClass = status === 'active' ? styles.badgeActive : (status === 'forming' ? styles.badgeForming : styles.badgePreparing);

                        return (
                            <div className={`${styles.signalSummary} ${status === 'active' ? styles.activeSummary : ''}`}>
                                <div className={styles.summaryHeader}>
                                    <div className={styles.summaryTitle}>
                                        <span>{t('community_page.detail_page.signal_summary.title')}</span>
                                    </div>
                                    <span className={`${styles.draftBadge} ${statusClass}`}>{statusLabel}</span>
                                </div>
                                
                                <div className={styles.candidateCard}>
                                    <div className={styles.draftMainInfo}>
                                        📍 {post.place_name || post.title}
                                    </div>
                                    
                                    <div className={styles.draftSummaryText}>
                                        {timeSummary}
                                        <br />
                                        {t('community_page.detail_page.signal_summary.desc', {
                                            topic: post.type === 'review'
                                                ? t('community_page.detail_page.signal_summary.topic_review')
                                                : t('community_page.detail_page.signal_summary.topic_outing'),
                                            count: totalSignals
                                        })}
                                    </div>

                                    <div className={styles.scheduleSuggestion}>
                                        <div className={styles.suggestionTitle}>{t('community_page.detail_page.signal_summary.schedule_title')}</div>
                                        <div className={styles.suggestionGrid}>
                                            {SIGNAL_TIMES.map(time => (
                                                <button 
                                                    key={time} 
                                                    className={`${styles.suggestionChip} ${selectedTime === time ? styles.suggestionChipActive : ''}`}
                                                    onClick={() => {
                                                        setSelectedTime(time);
                                                        setSelectedIntent(selectedIntent || 'interested');
                                                        document.querySelector(`.${styles.commentInput}`)?.parentElement?.scrollIntoView({ behavior: 'smooth' });
                                                        (document.querySelector(`.${styles.commentInput}`) as HTMLInputElement)?.focus();
                                                    }}
                                                >
                                                    <span className={styles.chipLabel}>{getTimeLabel(t, time)}</span>
                                                    <span className={styles.chipCount}>{timeCounts[time] || 0}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 참여 의사 미리보기 섹션 */}
                                    <div className={styles.previewSection}>
                                        <div className={styles.previewTitle}>{t('community_page.detail_page.signal_summary.preview_title')}</div>
                                        {SIGNAL_TIMES.filter(time => timeCounts[time] > 0).map(time => {
                                            const groupSignals = signalComments
                                                .filter((c) => {
                                                    const rawTime = c.content.match(/\[TIME:([^\]]+)\]/)?.[1];
                                                    return rawTime ? normalizeTime(rawTime) === time || rawTime === time : false;
                                                })
                                                .sort((a, b) => b.id - a.id)
                                                .slice(0, 2);

                                            return (
                                                <div key={time} className={styles.scheduleGroup}>
                                                    <div className={styles.groupHeader}>
                                                        <span className={styles.groupName}>{getTimeLabel(t, time)}</span>
                                                        <span className={styles.groupCount}>{t('community_page.detail_page.signal_summary.group_count', { count: timeCounts[time] })}</span>
                                                    </div>
                                                    <div className={styles.reactionList}>
                                                        {groupSignals.map((sig, idx) => (
                                                            <div key={idx} className={styles.reactionItem}>
                                                                <span className={styles.reactionAuthor}>{sig.author}</span>
                                                                <span className={styles.reactionText}>
                                                                    {sig.content.replace(/\[SIGNAL:[^\]]+\]/, '').replace(/\[TIME:[^\]]+\]/, '').trim() || t('community_page.detail_page.signal_summary.reaction_fallback')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button 
                                                        className={styles.inlineCta}
                                                        onClick={() => {
                                                            setSelectedTime(time);
                                                            setSelectedIntent(selectedIntent || 'interested');
                                                            document.querySelector(`.${styles.commentInput}`)?.parentElement?.scrollIntoView({ behavior: 'smooth' });
                                                            (document.querySelector(`.${styles.commentInput}`) as HTMLInputElement)?.focus();
                                                        }}
                                                    >
                                                        {t('community_page.detail_page.signal_summary.join_time', { time: getTimeLabel(t, time) })}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className={styles.safetyNotice}>
                                        <div className={styles.safetyItem}>{t('community_page.detail_page.signal_summary.notice_1')}</div>
                                        <div className={styles.safetyItem}>{t('community_page.detail_page.signal_summary.notice_2')}</div>
                                    </div>

                                    <button 
                                        className={styles.ctaLink}
                                        onClick={() => {
                                            document.querySelector(`.${styles.commentInput}`)?.parentElement?.scrollIntoView({ behavior: 'smooth' });
                                            (document.querySelector(`.${styles.commentInput}`) as HTMLInputElement)?.focus();
                                        }}
                                    >
                                        {t('community_page.detail_page.signal_summary.join_cta')}
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    <div className={styles.commentList}>
                        {comments.length === 0 ? (
                            <div className={styles.emptyComments}>{t('community_page.detail_page.empty_comments')}</div>
                        ) : (
                            comments.map(c => {
                                if (hiddenComments.includes(c.id)) return null;

                                const signalMatch = c.content.match(/\[SIGNAL:([^\]]+)\]/);
                                const timeMatch = c.content.match(/\[TIME:([^\]]+)\]/);
                                const isSignal = !!signalMatch;
                                const contentText = c.content.replace(/\[SIGNAL:[^\]]+\]/, '').replace(/\[TIME:[^\]]+\]/, '');
                                
                                return (
                                    <div key={c.id} className={`${styles.commentItem} ${isSignal ? styles.signalComment : ''}`}>
                                        <div className={styles.commentAuthor}>
                                            <span>{c.author}</span>
                                            {isSignal && <span className={styles.signalTag}>{t('community_page.detail_page.signal_tag')}</span>}
                                            
                                            <div className={styles.moreMenuWrapper} style={{ marginLeft: 'auto' }}>
                                                <button className={styles.moreBtn} style={{ fontSize: '14px' }} onClick={() => setActiveCommentMenu(activeCommentMenu === c.id ? null : c.id)}>⋮</button>
                                                {activeCommentMenu === c.id && (
                                                    <div className={styles.moreMenuDropdown} style={{ right: 0, top: '24px' }}>
                                                        <button className={`${styles.moreMenuItem} ${styles.moreMenuItem_report}`} onClick={() => {
                                                            setReportingItem({ id: c.id, type: 'comment' });
                                                            setIsReportModalOpen(true);
                                                            setActiveCommentMenu(null);
                                                        }}>{t('community_page.report.report_action')}</button>
                                                        <button className={styles.moreMenuItem} onClick={() => {
                                                            setHiddenComments([...hiddenComments, c.id]);
                                                            setActiveCommentMenu(null);
                                                        }}>{t('community_page.detail_page.hide_comment')}</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isSignal && (
                                            <div className={styles.signalLabel}>
                                                {getIntentLabel(t, signalMatch[1])}
                                                {timeMatch && <span className={styles.timeLabel}>{getTimeLabel(t, timeMatch[1])}</span>}
                                            </div>
                                        )}
                                        <div className={styles.commentContent}>{contentText || (isSignal ? t('community_page.detail_page.signal_content_default') : '')}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Integrated Safety Guide - Step 14 */}
                    <div className={styles.safetyGuideBox}>
                        <div className={styles.safetyGuideTitle}>{t('community_page.detail_page.bottom_safety.title')}</div>
                        <div className={styles.safetyGuideList}>
                            <div className={styles.safetyGuideItem}>• {t('community_page.detail_page.bottom_safety.item_1')}</div>
                            <div className={styles.safetyGuideItem}>• {t('community_page.detail_page.bottom_safety.item_2')}</div>
                            <div className={styles.safetyGuideItem}>• {t('community_page.detail_page.bottom_safety.item_3')}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.commentInputBox}>
                {(post.type === 'review' || post.type === 'travel' || post.type === 'meetup') && (
                    <>
                        <div className={styles.intentChips}>
                            {SIGNAL_INTENTS.map(intent => (
                                <button 
                                    key={intent} 
                                    className={`${styles.intentChip} ${selectedIntent === intent ? styles.intentChipActive : ''}`}
                                    onClick={() => setSelectedIntent(selectedIntent === intent ? null : intent)}
                                >
                                    {getIntentLabel(t, intent)}
                                </button>
                            ))}
                        </div>
                        {selectedIntent && (
                            <div className={styles.timeChips}>
                                {SIGNAL_TIMES.map(time => (
                                    <span 
                                        key={time} 
                                        className={`${styles.timeChip} ${selectedTime === time ? styles.timeChipActive : ''}`}
                                        onClick={() => setSelectedTime(selectedTime === time ? null : time)}
                                    >
                                        {getTimeLabel(t, time)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </>
                )}
                <div className={styles.inputControls}>
                    <input
                        id="comment-input-field"
                        className={styles.commentInput}
                        placeholder={selectedIntent ? t('community_page.detail_page.comment_input.optional') : t('community_page.detail_page.comment_input.default')}
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
                    />
                    <button
                        className={styles.commentSubmit}
                        disabled={(!newComment.trim() && !selectedIntent) || isSubmitting}
                        onClick={handleSubmitComment}
                    >
                        {isSubmitting ? '...' : (selectedIntent ? t('community_page.detail_page.comment_input.send') : '➤')}
                    </button>
                </div>
            </div>

            {/* Report Modal - Step 14 */}
            {isReportModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsReportModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalTitle}>{t('community_page.report.modal_title')}</div>
                        <div className={styles.reportReasonList}>
                            {reportReasons.map(reason => (
                                <button key={reason} className={styles.reportReasonBtn} onClick={() => handleReport(reason)}>
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <button className={styles.modalCloseBtn} onClick={() => setIsReportModalOpen(false)}>{t('community_page.report.cancel')}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
