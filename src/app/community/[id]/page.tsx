'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import styles from './detail.module.css';
import Image from 'next/image';

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
    imageUrl?: string;
}

interface Comment {
    id: number;
    author: string;
    content: string;
    created_at: string;
    author_user_id?: string;
}


type SignalIntent = 'interested' | 'available_this_week' | 'join_if_schedule_fits' | 'thanks' | 'question';
type SignalTime = 'this_week' | 'this_weekend' | 'next_week' | 'schedule_coordination';





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

type CommunityStatus = 'REVIEWS' | 'REACTING' | 'SURVEYING' | 'DRAFTING' | 'CLOSED';

const STATUS_KEY_MAP: Record<CommunityStatus, string> = {
    REVIEWS: 'REVIEWS',
    REACTING: 'REACTING',
    SURVEYING: 'SURVEYING',
    DRAFTING: 'DRAFTING',
    CLOSED: 'CLOSED'
};

const getStatusLabel = (t: any, status: string) => {
    return t(`community_page.detail_page.status.${status}`, { defaultValue: status });
};

const getTagLabel = (t: any, tag: string) => {
    return t(`community_page.detail_page.tags.${tag}`, { defaultValue: tag });
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
    const [isCommentOpen, setIsCommentOpen] = useState(false);
    const [loggedInUserName, setLoggedInUserName] = useState("Jessie Kim");

    // Step 14: Safety States
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingItem, setReportingItem] = useState<{ id: number; type: 'post' | 'comment' } | null>(null);
    const [hiddenComments, setHiddenComments] = useState<number[]>([]);
    const [isPostMoreMenuOpen, setIsPostMoreMenuOpen] = useState(false);
    const [activeCommentMenu, setActiveCommentMenu] = useState<number | null>(null);
    const [isPostHidden, setIsPostHidden] = useState(false);

    const [isExpanded, setIsExpanded] = useState<{ [key: string]: boolean }>({ strength: true, decision: true, safety: true });
    const [isSaved, setIsSaved] = useState(false);
    const [resultText, setResultText] = useState('');





    useEffect(() => {
        if (!id) return;
        


        // Update recently viewed
        let recentlyViewed = JSON.parse(localStorage.getItem('kello_recently_viewed') || '[]');
        recentlyViewed = [Number(id), ...recentlyViewed.filter((sid: number) => sid !== Number(id))].slice(0, 10);
        localStorage.setItem('kello_recently_viewed', JSON.stringify(recentlyViewed));
    }, [id]);



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

    const toggleExpand = (key: string) => {
        setIsExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleSave = () => {
        setIsSaved(!isSaved);
    };

    const handleUpdateStatus = async (status: CommunityStatus) => {
        if (!post) return;
        const newDesc = post.desc.includes('[STATUS:')
            ? post.desc.replace(/\[STATUS:.*?\]/, `[STATUS:${status}]`)
            : `${post.desc} [STATUS:${status}]`;

        const { error } = await supabase.from('community_posts').update({ desc: newDesc }).eq('id', post.id);
        if (!error) {
            setPost({ ...post, desc: newDesc });
        }
    };

    const handleUpdateResult = async (isVisited: boolean) => {
        if (!post || !resultText.trim()) return;
        const resultTag = isVisited ? '[RESULT:VISITED]' : '[RESULT:SAVED]';
        const newDesc = `${post.desc} ${resultTag} [TIPS:${resultText}] [STATUS:CLOSED]`;

        const { error } = await supabase.from('community_posts').update({ desc: newDesc }).eq('id', post.id);
        if (!error) {
            setPost({ ...post, desc: newDesc });
            setResultText('');
        }
    };

    const handleReport = (reason: string) => {
        alert(t('community_page.report.success', { defaultValue: '정상적으로 신고되었습니다.' }));
        setIsReportModalOpen(false);
    };

    const handleSubmitComment = async () => {
        if ((!newComment.trim() && !selectedIntent) || !post || isSubmitting) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert(t('community_page.errors.login_required', { defaultValue: '로그인이 필요한 서비스입니다.' }));
            return;
        }

        setIsSubmitting(true);
        
        try {
            let finalContent = selectedIntent 
                ? `[SIGNAL:${selectedIntent}]${selectedTime ? `[TIME:${selectedTime}]` : ''}${newComment}`
                : newComment;

            const { error } = await supabase.from('community_comments').insert([{
                post_id: post.id,
                author_user_id: user.id,
                author: loggedInUserName,
                content: finalContent
            }]);

            if (!error) {
                setNewComment('');
                setSelectedIntent(null);
                setSelectedTime(null);
                
                await supabase.from('community_posts')
                    .update({ comments: (post.comments || 0) + 1 })
                    .eq('id', post.id);

                setPost(prev => prev ? { ...prev, comments: (prev.comments || 0) + 1 } : null);

                const reactedPosts = JSON.parse(localStorage.getItem('kello_reacted_posts') || '[]');
                if (!reactedPosts.includes(post.id)) {
                    localStorage.setItem('kello_reacted_posts', JSON.stringify([...reactedPosts, post.id]));
                }

                await fetchPostData();
                
                setTimeout(() => {
                    const list = document.querySelector(`.${styles.commentList}`);
                    if (list) {
                        list.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }
                }, 100);
            } else {
                console.error('Comment insertion error:', error);
                alert(t('common.error_occurred', { defaultValue: 'An error occurred. Please try again.' }));
            }
        } catch (err) {
            console.error('Unexpected error during comment submission:', err);
        } finally {
            setIsSubmitting(false);
        }
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
                    </div>
                    <h2 className={styles.postTitle}>{post.title}</h2>

                    {post.imageUrl && (
                        <div className={styles.imageWrapper} style={{ marginTop: '16px', borderRadius: '12px', overflow: 'hidden' }}>
                            <Image src={post.imageUrl} alt="post target" width={800} height={800} style={{ width: '100%', height: 'auto', display: 'block' }} />
                        </div>
                    )}

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
                                        const el = document.getElementById('comment-input-field');
                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        setTimeout(() => el?.focus(), 500);
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


                    {/* Like / Dislike reaction feature - step 22 */}
                    <div className={styles.reactionGroup}>
                        <button className={styles.reactionBtn} onClick={() => alert(t('community_page.detail_page.like_alert', { defaultValue: '공감했습니다!' }))}>
                            👍 {t('community_page.detail_page.like', { defaultValue: '공감' })}
                        </button>
                        <button className={styles.reactionBtn} onClick={() => alert(t('community_page.detail_page.dislike_alert', { defaultValue: '비공감했습니다.' }))}>
                            👎 {t('community_page.detail_page.dislike', { defaultValue: '비공감' })}
                        </button>
                    </div>

                    <div className={styles.stats} style={{ marginTop: '16px' }}>
                        💬 {comments.length} {t('community_page.comments', { defaultValue: 'Comments' })}
                    </div>
                </div>

                <div className={styles.commentSection} id="comment-input-area">

                    <h3 className={styles.commentTitle}>{t('community_page.detail_page.comments_title')}</h3>
                    
                    {/* Integrated Comment Input - Moved for better context */}
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

                        const topTime = Object.entries(timeCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0];
                        const topIntent = Object.entries(intentCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0];
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
                                                        const el = document.getElementById('comment-input-field');
                                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        setTimeout(() => (el as HTMLInputElement)?.focus(), 500);
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
                                                            const el = document.getElementById('comment-input-field');
                                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            setTimeout(() => (el as HTMLInputElement)?.focus(), 500);
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
                                            const el = document.getElementById('comment-input-field');
                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            setTimeout(() => (el as HTMLInputElement)?.focus(), 500);
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

                    {/* 통합된 댓글 입력 영역 */}
                    <div className={styles.commentInputWrapper}>
                        {/* 댓글 쓰기 버튼: 기본 숨김, 클릭 시 입력 UI 열림 */}
                        {!isCommentOpen && (
                            <button
                                className={styles.openCommentBtn}
                                onClick={() => {
                                    console.log('✏️ [Comment] open btn clicked! Set isCommentOpen to true');
                                    setIsCommentOpen(true);
                                    
                                    // 렌더링 직후 포커스 & 스크롤 이동
                                    setTimeout(() => {
                                        const el = document.getElementById('comment-input-field');
                                        if (el) {
                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            el.focus();
                                        }
                                    }, 50);
                                }}
                            >
                                ✏️ {t('community_page.detail_page.comment_input.open_btn', { defaultValue: '댓글 쓰기' })}
                            </button>
                        )}

                        {/* 인라인 댓글 입력 UI - isCommentOpen일 때만 표시 */}
                        {isCommentOpen && (
                            <div className={styles.inlineCommentBox}>
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
                            <div className={styles.inputControls}>
                                <input
                                    id="comment-input-field"
                                    className={styles.commentInput}
                                    placeholder={selectedIntent ? t('community_page.detail_page.comment_input.optional') : t('community_page.detail_page.comment_input.default')}
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
                                    autoFocus
                                />
                                <button
                                    className={styles.commentSubmit}
                                    disabled={(!newComment.trim() && !selectedIntent) || isSubmitting}
                                    onClick={handleSubmitComment}
                                >
                                    {isSubmitting ? '...' : (selectedIntent ? t('community_page.detail_page.comment_input.send') : '➤')}
                                </button>
                            </div>
                            <button
                                className={styles.cancelCommentBtn}
                                onClick={() => { setIsCommentOpen(false); setNewComment(''); setSelectedIntent(null); setSelectedTime(null); }}
                            >
                                {t('community_page.detail_page.comment_input.cancel', { defaultValue: '취소' })}
                            </button>
                        </div>
                    )}
                    </div>
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
