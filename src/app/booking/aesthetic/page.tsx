'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface AestheticItem {
  id: string;
  label: string;
}

export default function AestheticCategoryDetailPage() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 시안과 100% 동일한 8개 스킨케어 항목 정의
  const items: AestheticItem[] = [
    { id: 'soothing', label: '피부 진정' },
    { id: 'hydration', label: '수분 관리' },
    { id: 'acne', label: '여드름 케어' },
    { id: 'pore', label: '모공 관리' },
    { id: 'whitening', label: '톤업/미백' },
    { id: 'lifting', label: '리프팅' },
    { id: 'contour', label: '윤곽 관리' },
    { id: 'not_sure', label: '잘 모르겠어요' }
  ];

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      // 1. "잘 모르겠어요" 선택 시 다른 모든 항목 해제
      if (id === 'not_sure') {
        if (prev.includes('not_sure')) {
          return [];
        }
        return ['not_sure'];
      }

      // 2. 다른 일반 항목 선택 시 "잘 모르겠어요" 자동 해제
      const newSelection = prev.filter((item) => item !== 'not_sure');

      if (newSelection.includes(id)) {
        return newSelection.filter((item) => item !== id);
      }

      // 최대 3개 선택 제한
      if (newSelection.length >= 3) {
        alert('복수 선택은 최대 3개까지 가능합니다.');
        return prev;
      }

      return [...newSelection, id];
    });
  };

  const handleNextStep = () => {
    if (selectedIds.length === 0) return;
    alert(`선택 목적: [${selectedIds.map(id => items.find(item => item.id === id)?.label).join(', ')}]\nKELLO가 맞춤 뷰티숍 리스트를 추천합니다!`);
    router.push('/');
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <span className={styles.stepIndicator}>STEP 1</span>
          <span className={styles.logo}>KELLO</span>
          <span></span> {/* 우측 균형을 위한 빈 공간 */}
        </header>

        {/* Scrollable Main Section */}
        <div className={styles.scrollArea}>
          {/* Question Text */}
          <div className={styles.questionSection}>
            <h2 className={styles.questionTitle}>
              어떤 목적의<br />
              서비스를 찾고 있나요?
            </h2>
            <p className={styles.subTitle}>복수선택 가능 · 최대 3개</p>
          </div>

          {/* 2-Column Grid */}
          <section className={styles.grid}>
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`${styles.bubbleCard} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleSelect(item.id)}
                >
                  <span className={styles.label}>{item.label}</span>
                </div>
              );
            })}
          </section>
        </div>

        {/* Bottom Fixed CTA Button */}
        <div className={styles.ctaContainer}>
          <button
            className={styles.nextButton}
            onClick={handleNextStep}
            disabled={selectedIds.length === 0}
          >
            다음 단계로
          </button>
        </div>
      </div>
    </div>
  );
}
