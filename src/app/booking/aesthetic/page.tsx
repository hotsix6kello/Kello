'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Sparkles, 
  Leaf, 
  Droplets, 
  ShieldAlert, 
  Grid, 
  Sun, 
  TrendingUp, 
  CircleDot, 
  History, 
  Shield, 
  HelpCircle, 
  GlassWater, 
  Layers, 
  Lightbulb, 
  Minimize2,
  Check,
  ChevronRight
} from 'lucide-react';
import styles from './page.module.css';

interface BeautyItem {
  id: string;
  labelKo: string;
  labelEn: string;
  description: string;
  icon: React.ReactNode;
  isPopularAddon?: boolean;
}

export default function AestheticCategoryDetailPage() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 에스테틱 기본 세부 카테고리 목록
  const aestheticCategories: BeautyItem[] = [
    {
      id: 'basic',
      labelKo: '기본 스킨케어',
      labelEn: 'Basic Skincare',
      description: '클렌징과 수분 공급 중심의 기본 피부 관리',
      icon: <Sparkles size={20} />
    },
    {
      id: 'soothing',
      labelKo: '피부 진정 케어',
      labelEn: 'Skin Soothing Care',
      description: '민감하고 붉어진 피부를 위한 진정 관리',
      icon: <Leaf size={20} />
    },
    {
      id: 'hydration',
      labelKo: '수분 관리',
      labelEn: 'Hydration Care',
      description: '건조한 피부에 수분과 보습을 채우는 관리',
      icon: <Droplets size={20} />
    },
    {
      id: 'trouble',
      labelKo: '트러블 케어',
      labelEn: 'Trouble Care',
      description: '여드름과 피부 고민 집중 관리',
      icon: <ShieldAlert size={20} />
    },
    {
      id: 'pore',
      labelKo: '모공 관리',
      labelEn: 'Pore Care',
      description: '넓어진 모공과 피부결 개선 관리',
      icon: <Grid size={20} />
    },
    {
      id: 'whitening',
      labelKo: '톤업·브라이트닝',
      labelEn: 'Tone-up & Brightening',
      description: '칙칙한 피부톤 개선과 맑은 피부 표현',
      icon: <Sun size={20} />
    },
    {
      id: 'lifting',
      labelKo: '리프팅',
      labelEn: 'Lifting',
      description: '탄력과 얼굴 윤곽을 위한 관리',
      icon: <TrendingUp size={20} />
    },
    {
      id: 'contour',
      labelKo: '윤곽 관리',
      labelEn: 'Facial Contour Care',
      description: '얼굴 라인과 붓기 개선 관리',
      icon: <CircleDot size={20} />
    },
    {
      id: 'antiaging',
      labelKo: '안티에이징',
      labelEn: 'Anti-Aging',
      description: '주름과 탄력 개선 중심 관리',
      icon: <History size={20} />
    },
    {
      id: 'sensitive',
      labelKo: '민감 피부 케어',
      labelEn: 'Sensitive Skin Care',
      description: '예민한 피부를 위한 저자극 관리',
      icon: <Shield size={20} />
    },
    {
      id: 'not_sure',
      labelKo: '잘 모르겠어요',
      labelEn: 'Not Sure / Consultation',
      description: '전문가 추천으로 맞춤 관리 찾기',
      icon: <HelpCircle size={20} />
    }
  ];

  // 추가 인기 한국 뷰티 서비스 목록
  const addonServices: BeautyItem[] = [
    {
      id: 'waterglow',
      labelKo: '물광 관리',
      labelEn: 'Water Glow Care',
      description: '윤기 있고 촉촉한 피부 표현',
      icon: <GlassWater size={20} />,
      isPopularAddon: true
    },
    {
      id: 'collagen',
      labelKo: '콜라겐 관리',
      labelEn: 'Collagen Care',
      description: '피부 탄력과 볼륨 케어',
      icon: <Layers size={20} />,
      isPopularAddon: true
    },
    {
      id: 'led',
      labelKo: 'LED 관리',
      labelEn: 'LED Light Therapy',
      description: '피부 컨디션 개선 관리',
      icon: <Lightbulb size={20} />,
      isPopularAddon: true
    },
    {
      id: 'smallface',
      labelKo: '작은 얼굴 관리',
      labelEn: 'V-Line Facial Sculpting',
      description: '붓기와 얼굴 라인 집중 케어',
      icon: <Minimize2 size={20} />,
      isPopularAddon: true
    }
  ];

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      // 1. "잘 모르겠어요"를 선택하는 경우
      if (id === 'not_sure') {
        if (prev.includes('not_sure')) {
          return [];
        }
        return ['not_sure'];
      }

      // 2. 다른 카테고리를 고르고 있는데 기존에 "잘 모르겠어요"가 켜져 있으면 제거 후 추가
      const newSelection = prev.filter((item) => item !== 'not_sure');

      if (newSelection.includes(id)) {
        return newSelection.filter((item) => item !== id);
      }

      // 복수 선택 최대 3개 제한 적용
      if (newSelection.length >= 3) {
        alert('최대 3개까지 선택할 수 있습니다.');
        return prev;
      }

      return [...newSelection, id];
    });
  };

  const handleNextStep = () => {
    if (selectedIds.length === 0) return;
    // 다음 단계로 라우팅 (데모용 홈으로 임시 이동 또는 상세 뷰티숍 리스트 페이지로 이동)
    alert(`선택한 스킨케어 고민 ID: [${selectedIds.join(', ')}]\nKELLO가 맞춤 뷰티숍 리스트를 추천합니다!`);
    router.push('/');
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <button className={styles.backButton} onClick={() => router.back()} aria-label="Go Back">
            <ArrowLeft size={20} />
          </button>
          <span className={styles.logo}>Kello</span>
          <span className={styles.stepIndicator}>Step 2 of 4</span>
        </header>

        {/* Scrollable Content */}
        <div className={styles.scrollArea}>
          {/* Question Title */}
          <div className={styles.questionSection}>
            <h2 className={styles.questionTitle}>어떤 피부 관리를<br />원하시나요?</h2>
            <p className={styles.subTitle}>복수 선택 가능 · 최대 3개</p>
          </div>

          {/* 에스테틱 상세 고민 세부 리스트 */}
          <section className={styles.grid}>
            {aestheticCategories.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div 
                  key={item.id} 
                  className={`${styles.bubbleCard} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleSelect(item.id)}
                >
                  <div className={styles.iconContainer}>
                    {item.icon}
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.labelRow}>
                      <span className={styles.labelKo}>{item.labelKo}</span>
                      <span className={styles.labelEn}>{item.labelEn}</span>
                    </div>
                    <span className={styles.description}>{item.description}</span>
                  </div>
                  <div className={styles.checkIndicator}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </section>

          {/* 추가 인기 한국 뷰티 서비스 헤더 */}
          <h3 className={styles.sectionTitle}>인기 K-뷰티 스페셜 케어</h3>

          {/* 추가 서비스 리스트 */}
          <section className={styles.grid}>
            {addonServices.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div 
                  key={item.id} 
                  className={`${styles.bubbleCard} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleSelect(item.id)}
                >
                  <div className={styles.iconContainer}>
                    {item.icon}
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.labelRow}>
                      <span className={styles.labelKo}>{item.labelKo}</span>
                      <span className={styles.labelEn}>{item.labelEn}</span>
                    </div>
                    <span className={styles.description}>{item.description}</span>
                  </div>
                  <div className={styles.checkIndicator}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Bottom CTA Button */}
        <div className={styles.ctaContainer}>
          <button 
            className={styles.nextButton}
            onClick={handleNextStep}
            disabled={selectedIds.length === 0}
          >
            <span>다음 단계로</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
