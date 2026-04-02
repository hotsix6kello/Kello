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
    likes_count: number;
    dislikes_count: number;
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



const getMetaValues = (desc: string, key: string) =>
    Array.from(desc.matchAll(new RegExp(`\\[${key}:(.*?)\\]`, 'g')))
        .map((match) => match[1]?.trim() ?? '')
        .filter(Boolean);

const getRepresentativeImages = (desc: string) => {
    if (!desc) return [];
    
    // Heuristic: Real attachments added by the system are always at the end of the string,
    // usually separated by newlines. We look for the last block of consecutive IMAGE tags.
    const lines = desc.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const images: string[] = [];
    
    // Search from the end for consecutive [IMAGE:url] tags
    for (let i = lines.length - 1; i >= 0; i--) {
        const match = lines[i].match(/^\[IMAGE:(.*?)\]$/);
        if (match) {
            images.unshift(match[1].trim());
        } else if (images.length > 0) {
            // We found consecutive images and now reached something else, stop here.
            break;
        }
    }
    
    if (images.length > 0) return images;

    // Fallback: If no tail images found, check if it's a legacy post with major metadata markers
    const metaMarkers = ['[CATEGORY:', '[REGION:', '[MEETUP_OPEN:'];
    let firstMetaIndex = -1;
    for (const marker of metaMarkers) {
        const idx = desc.indexOf(marker);
        if (idx !== -1 && (firstMetaIndex === -1 || idx < firstMetaIndex)) {
            firstMetaIndex = idx;
        }
    }
    const searchSection = firstMetaIndex !== -1 ? desc.substring(firstMetaIndex) : desc;
    return getMetaValues(searchSection, COMMUNITY_IMAGE_META_KEY);
};

const stripCommunityMetadata = (desc: string) => desc
    .replace(/\[CATEGORY:.*?\]\s*/g, '')
    .replace(/\[REGION:.*?\]\s*/g, '')
    .replace(/\[POINT:.*?\]\s*/g, '')
    .replace(/\[TAGS:.*?\]\s*/g, '')
    .replace(/\[MEETUP_OPEN:.*?\]\s*/g, '')
    .replace(/\[IMAGE:.*?\]\s*/g, '')
    .replace(/\[STATUS:.*?\]\s*/g, '')
    .replace(/\[RESULT:.*?\]\s*/g, '')
    .replace(/\[TIPS:.*?\]\s*/g, '')
    .trim();

const COMMUNITY_IMAGE_META_KEY = 'IMAGE';
const COMMUNITY_IMAGE_LIMIT = 4;




export default function CommunityDetailPage() {
    const { t } = useTranslation('common');
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [post, setPost] = useState<Post | null>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached: Post[] = JSON.parse(localStorage.getItem('kello_community_posts') || '[]');
                return cached.find((p: Post) => p.id === Number(id)) || null;
            } catch { return null; }
        }
        return null;
    });
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);
    const [loggedInUserName, setLoggedInUserName] = useState("Jessie Kim");
    const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
    const [likesCount, setLikesCount] = useState(0);
    const [dislikesCount, setDislikesCount] = useState(0);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [hiddenComments, setHiddenComments] = useState<number[]>([]);
    const [isPostMoreMenuOpen, setIsPostMoreMenuOpen] = useState(false);
    const [activeCommentMenu, setActiveCommentMenu] = useState<number | null>(null);
    const [isPostHidden, setIsPostHidden] = useState(false);

    useEffect(() => {
        if (!id) return;
        
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

    const fetchPostData = async (isInitial = true) => {
        try {
            // Priority 1: Fetch Post metadata first to show the content fast
            const { data: postData } = await supabase
                .from('community_posts')
                .select('*')
                .eq('id', id)
                .single();

            if (postData) {
                setPost(postData);
                setLikesCount(postData.likes_count || 0);
                setDislikesCount(postData.dislikes_count || 0);
            }

            // Priority 2: Parallel fetch for user context and comments in the background
            const [{ data: userData }, { data: commentsData }] = await Promise.all([
                supabase.auth.getUser(),
                supabase.from('community_comments').select('*').eq('post_id', id).order('created_at', { ascending: true })
            ]);

            if (userData?.user) {
                const { data: reactionData } = await supabase
                    .from('community_reactions')
                    .select('reaction_type')
                    .eq('post_id', id)
                    .eq('user_id', userData.user.id)
                    .single();
                setUserReaction(reactionData ? (reactionData.reaction_type as 'like' | 'dislike') : null);
            }

            if (commentsData) {
                setComments(commentsData as Comment[]);
            }
        } finally {
            if (isInitial) setIsInitialFetchDone(true);
        }
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
            // First Priority: Fast initialization from cache
            try {
                const cached: Post[] = JSON.parse(localStorage.getItem('kello_community_posts') || '[]');
                const matching = cached.find((p: Post) => p.id === Number(id));
                if (matching) {
                    setPost(matching);
                    setLikesCount(matching.likes_count || 0);
                    setDislikesCount(matching.dislikes_count || 0);
                    // No need to set isInitialFetchDone here, background fetch still runs
                }
            } catch { /* ignore cache errors */ }

            fetchPostData(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleReaction = async (type: 'like' | 'dislike') => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert(t('community_page.errors.login_required', { defaultValue: '로그인이 필요한 서비스입니다.' }));
            return;
        }

        const previousReaction = userReaction;
        const previousLikes = likesCount;
        const previousDislikes = dislikesCount;

        if (userReaction === type) {
            setUserReaction(null);
            if (type === 'like') setLikesCount(prev => Math.max(0, prev - 1));
            else setDislikesCount(prev => Math.max(0, prev - 1));

            const { error } = await supabase
                .from('community_reactions')
                .delete()
                .eq('post_id', id)
                .eq('user_id', user.id);

            if (error) {
                setUserReaction(previousReaction);
                setLikesCount(previousLikes);
                setDislikesCount(previousDislikes);
                console.error('Reaction removal error:', error);
            }
        } else {
            setUserReaction(type);
            if (type === 'like') {
                setLikesCount(prev => prev + 1);
                if (previousReaction === 'dislike') setDislikesCount(prev => Math.max(0, prev - 1));
            } else {
                setDislikesCount(prev => prev + 1);
                if (previousReaction === 'like') setLikesCount(prev => Math.max(0, prev - 1));
            }

            const { error } = await supabase
                .from('community_reactions')
                .upsert({
                    post_id: id,
                    user_id: user.id,
                    reaction_type: type
                }, { onConflict: 'post_id,user_id' });

            if (error) {
                setUserReaction(previousReaction);
                setLikesCount(previousLikes);
                setDislikesCount(previousDislikes);
                console.error('Reaction update error:', error);
                alert(t('common.error_occurred', { defaultValue: '요청을 처리하는 중 오류가 발생했습니다.' }));
            }
        }
    };

    const handleReport = () => {
        alert(t('community_page.report.success', { defaultValue: '정상적으로 신고되었습니다.' }));
        setIsReportModalOpen(false);
    };

    const handleSubmitComment = async () => {
        if (!newComment.trim() || !post || isSubmitting) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert(t('community_page.errors.login_required', { defaultValue: '로그인이 필요한 서비스입니다.' }));
            return;
        }

        setIsSubmitting(true);
        
        try {
            const finalContent = newComment;

            const { error } = await supabase.from('community_comments').insert([{
                post_id: post.id,
                author_user_id: user.id,
                author: loggedInUserName,
                content: finalContent
            }]);

            if (!error) {
                setNewComment('');
                
                // Optimistic UI Update: Update Comment Count
                setPost(prev => prev ? { ...prev, comments: (prev.comments || 0) + 1 } : null);
                
                await supabase.from('community_posts')
                    .update({ comments: (post.comments || 0) + 1 })
                    .eq('id', post.id);

                // Update List Cache for instant sync on return
                try {
                    const cached: Post[] = JSON.parse(localStorage.getItem('kello_community_posts') || '[]');
                    const idx = cached.findIndex((p: Post) => p.id === post.id);
                    if (idx !== -1) {
                        cached[idx].comments = (cached[idx].comments || 0) + 1;
                        localStorage.setItem('kello_community_posts', JSON.stringify(cached));
                    }
                } catch { /* ignore cache refresh errors */ }

                const reactedPosts = JSON.parse(localStorage.getItem('kello_reacted_posts') || '[]');
                if (!reactedPosts.includes(post.id)) {
                    localStorage.setItem('kello_reacted_posts', JSON.stringify([...reactedPosts, post.id]));
                }

                // Add the new comment locally instead of full refresh
                const tempNewComment: Comment = {
                    id: Date.now(),
                    author: loggedInUserName,
                    content: finalContent,
                    created_at: new Date().toISOString(),
                    author_user_id: user.id
                };
                setComments(prev => [...prev, tempNewComment]);
                
                // Trigger background refresh of comments ONLY (no page-level loading)
                const { data: freshComments } = await supabase
                    .from('community_comments')
                    .select('*')
                    .eq('post_id', id)
                    .order('created_at', { ascending: true });
                if (freshComments) setComments(freshComments as Comment[]);
                
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

    // Completely remove the global "Data is Loading..." message.
    // Instead, return null (blank screen) until the first fetch attempt is complete.
    if (!isInitialFetchDone && !post) return null;

    // After the initial fetch, if no post exists or it's hidden, show the appropriate error UI.
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

                    {(() => {
                        const metaImages = post.desc ? getRepresentativeImages(post.desc).slice(0, COMMUNITY_IMAGE_LIMIT) : [];
                        const allImages = [...(post.imageUrl ? [post.imageUrl] : []), ...metaImages];
                        if (allImages.length === 0) return null;

                        return (
                            <div className={styles.imageGrid}>
                                {allImages.map((src, idx) => (
                                    <div key={idx} className={styles.imageWrapper}>
                                        <Image 
                                            src={src} 
                                            alt={`post image ${idx + 1}`} 
                                            width={800} 
                                            height={800} 
                                            style={{ width: '100%', height: 'auto', maxHeight: '480px', objectFit: 'contain', display: 'block' }} 
                                            unoptimized
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                    })()}


                    <div className={styles.bodyWrapper}>
                        <p className={styles.postDescCompact}>{stripCommunityMetadata(post.desc)}</p>
                    </div>


                    <div className={styles.reactionGroup}>
                        <button 
                            className={`${styles.reactionBtn} ${userReaction === 'like' ? styles.reactionBtnActive : ''}`} 
                            onClick={() => handleReaction('like')}
                        >
                            <span className={styles.reactionEmoji}>👍</span>
                            <span className={styles.reactionLabel}>{t('community_page.detail_page.like', { defaultValue: '좋아요' })}</span>
                            <span className={styles.reactionCount}>{likesCount}</span>
                        </button>
                        <button 
                            className={`${styles.reactionBtn} ${userReaction === 'dislike' ? styles.reactionBtnActive : ''}`} 
                            onClick={() => handleReaction('dislike')}
                        >
                            <span className={styles.reactionEmoji}>👎</span>
                            <span className={styles.reactionLabel}>{t('community_page.detail_page.dislike', { defaultValue: '싫어요' })}</span>
                            <span className={styles.reactionCount}>{dislikesCount}</span>
                        </button>
                    </div>

                    <div className={styles.stats}>
                        <span>💬 {comments.length} {t('community_page.comments', { defaultValue: 'Comments' })}</span>
                    </div>
                </div>

                <div className={styles.commentSection} id="comment-input-area">
                    <h3 className={styles.commentTitle}>{t('community_page.detail_page.comments_title')}</h3>
                    
                    <div className={styles.commentInputBox} style={{ margin: '16px 0 24px' }}>
                        <div className={styles.inputControls}>
                            <input
                                id="comment-input-field"
                                className={styles.commentInput}
                                placeholder={t('community_page.detail_page.comment_input.default', { defaultValue: '댓글을 입력하세요...' })}
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
                            />
                            <button
                                className={styles.commentSubmit}
                                disabled={!newComment.trim() || isSubmitting}
                                onClick={handleSubmitComment}
                            >
                                {isSubmitting ? '...' : '➤'}
                            </button>
                        </div>
                    </div>

                    <div className={styles.commentList}>
                        {comments.length > 0 && (
                            comments.map(c => {
                                if (hiddenComments.includes(c.id)) return null;

                                return (
                                    <div key={c.id} className={styles.commentItem}>
                                        <div className={styles.commentAuthor}>
                                            <span>{c.author}</span>
                                            
                                            <div className={styles.moreMenuWrapper} style={{ marginLeft: 'auto' }}>
                                                <button className={styles.moreBtn} style={{ fontSize: '14px' }} onClick={() => setActiveCommentMenu(activeCommentMenu === c.id ? null : c.id)}>⋮</button>
                                                {activeCommentMenu === c.id && (
                                                    <div className={styles.moreMenuDropdown} style={{ right: 0, top: '24px' }}>
                                                        <button className={`${styles.moreMenuItem} ${styles.moreMenuItem_report}`} onClick={() => {
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
                                        <div className={styles.commentContent}>{c.content}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>

            </div>

            {isReportModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsReportModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalTitle}>{t('community_page.report.modal_title')}</div>
                        <div className={styles.reportReasonList}>
                            {reportReasons.map(reason => (
                                <button key={reason} className={styles.reportReasonBtn} onClick={() => handleReport()}>
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
