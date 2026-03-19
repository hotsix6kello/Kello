'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TravelPlanTemplates.module.css';
import { getTravelPlanTemplatesByLanguage } from './travelPlanData';

export default function TravelPlanTemplates() {
    const { i18n } = useTranslation('common');

    // Use current language or fallback to 'ko'
    const currentLang = i18n.language || 'ko';
    const templates = getTravelPlanTemplatesByLanguage(currentLang);

    // Initialize selected tab and handle updates tracking language changes
    const [activeTab, setActiveTab] = useState(templates[0].id);
    const [isExpanded, setIsExpanded] = useState(false);

    // Reset expanded state and ensure active tab is synced when language or templates change
    useEffect(() => {
        setActiveTab(templates[0].id);
        setIsExpanded(false);
    }, [currentLang, templates]);

    const activePlan = templates.find(p => p.id === activeTab) || templates[0];

    const handleTabSwitch = (id: string) => {
        setActiveTab(id);
        setIsExpanded(false);
    };

    return (
        <section className={styles.templatesSection}>
            <h2 className={styles.sectionTitle}>
                {currentLang.startsWith('ko') ? '인기 추천 플랜' : currentLang.startsWith('th') ? 'แพ็กเกจยอดนิยม' : 'Popular Recommended Plans'}
            </h2>

            <div className={styles.tabContainer}>
                {templates.map((plan) => (
                    <button
                        key={plan.id}
                        className={`${styles.tabBtn} ${activeTab === plan.id ? styles.tabBtnActive : ''}`}
                        onClick={() => handleTabSwitch(plan.id)}
                    >
                        {plan.tabLabel}
                    </button>
                ))}
            </div>

            <div className={styles.planCardContainer}>
                <h3 className={styles.planTitle}>{activePlan.title}</h3>
                <p className={styles.planIntro}>{activePlan.shortIntro}</p>

                <div className={styles.keywords}>
                    {activePlan.keywords.map((kw, idx) => (
                        <span key={idx} className={styles.keywordChip}>{kw}</span>
                    ))}
                </div>

                <button
                    className={styles.actionBtn}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? activePlan.closeFull : activePlan.viewFull}
                </button>

                <div className={`${styles.collapsibleContent} ${isExpanded ? styles.expanded : ''}`}>
                    <div className={styles.itineraryTitle}>📅Schedule</div>
                    <div className={styles.itineraryList}>
                        {activePlan.itinerary.map((item, idx) => (
                            <div key={idx} className={styles.itineraryItem}>
                                <div className={styles.dayLabel}>{item.label}</div>
                                <div className={styles.dayDesc}>{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
