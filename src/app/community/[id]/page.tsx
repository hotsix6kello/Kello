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
            setIsCommentOpen(false);
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
                    </div>
                    <h2 className={styles.postTitle}>{post.title}</h2>
                    {post.imageUrl && (
                        <div className={styles.imageWrapper} style={{ marginTop: '16px', borderRadius: '12px', overflow: 'hidden' }}>
                            <Image src={post.imageUrl} alt="post target" width={800} height={800} style={{ width: '100%', height: 'auto', display: 'block' }} />
                        </div>
                    )}

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
