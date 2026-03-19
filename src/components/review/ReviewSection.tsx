"use client";

import styles from "./review.module.css";
// import Image from "next/image"; // Placeholder image for now

export default function ReviewSection() {
    const reviews = [
        {
            id: 1,
            user: "Mia (UK)",
            rating: 5,
            trustLevel: "Lv.5 Seoul Master",
            content: "This was absolutely worth it! The staff spoke perfect English and they really understood what 'NewJeans Style' meant. My hair feels so soft.",
            photos: ["#111", "#222"],
            tags: ["English Friendly", "Celebrity Style", "Clean"],
            helpful: 42
        },
        {
            id: 2,
            user: "Yuki (JP)",
            rating: 4,
            trustLevel: "Lv.3 Traveler",
            content: "予約も簡単でした。ただ、少し待ち時間がありました。技術は素晴らしいです！日本のサロンとは違う雰囲気で楽しかったです。",
            photos: ["#333"],
            tags: ["Waiting Time", "Good Skill"],
            helpful: 18
        }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.reviewHeader}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className={styles.reviewTitle}>Trusted Reviews</span>
                    <span className={styles.trustBadge}>AI Verified</span>
                </div>
                <span className={styles.sort}>Sort by: Trust Score</span>
            </div>

            {reviews.map(review => (
                <div key={review.id} className={styles.reviewCard}>
                    <div className={styles.userHeader}>
                        <div className={styles.avatar}></div>
                        <div className={styles.userInfo}>
                            <h4>{review.user}</h4>
                            <span className={styles.userMeta} style={{ color: review.trustLevel.includes("Master") ? "#bc13fe" : "#888" }}>
                                {review.trustLevel}
                            </span>
                        </div>
                        <div style={{ marginLeft: 'auto', color: '#ffb400' }}>
                            {'★'.repeat(review.rating)}
                        </div>
                    </div>

                    <p className={styles.reviewText}>{review.content}</p>

                    <div className={styles.photoGrid}>
                        {review.photos.map((ph, idx) => (
                            <div key={idx} className={styles.reviewPhoto} style={{ background: ph }}></div>
                        ))}
                    </div>

                    <div className={styles.tags}>
                        {review.tags.map(tag => (
                            <span key={tag} className={styles.reviewTag}>#{tag}</span>
                        ))}
                    </div>

                    <button className={styles.helpfulBtn}>
                        👍 Helpful ({review.helpful})
                    </button>
                </div>
            ))}

            <button style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#888', borderRadius: '12px', marginTop: '8px' }}>
                View all 1,240 reviews
            </button>
        </div>
    );
}
