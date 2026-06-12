'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import styles from './page.module.css';

interface ServiceOption {
  id: string;
  name: string;
  desc: string;
}

export default function BookingProcessPage() {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const services: ServiceOption[] = [
    { id: 'basic', name: '베이직 풀케어', desc: '클렌징과 수분 공급 중심의 기본 스킨 케어입니다.' },
    { id: 'trouble', name: '트러블 케어', desc: '피부 트러블과 모공 집중 케어입니다.' },
    { id: 'calming', name: '진정 케어', desc: '민감하고 붉어진 피부를 위한 진정 케어입니다.' },
    { id: 'lifting', name: '리프팅', desc: '탄력 및 윤곽을 위한 리프팅 케어입니다.' },
    { id: 'brightening', name: '브라이트닝', desc: '칙칙한 피부 톤을 위한 브라이트닝 케어입니다.' },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* 헤더 */}
        <header className={styles.header}>
          <button className={styles.backButton} onClick={() => router.back()} aria-label="뒤로가기">
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
          <h1 className={styles.headerTitle}>서비스 선택</h1>
          <div className={styles.placeholder} />
        </header>

        {/* 메인 스크롤 영역 */}
        <div className={styles.scrollArea}>
          {/* 프로세스 박스 */}
          <div className={styles.processBox}>
            {/* 단계 표시 바 */}
            <div className={styles.stepContainer}>
              <div className={`${styles.stepItem} ${styles.active}`}>
                <span className={styles.stepLabel}>단계 1</span>
                <span className={styles.stepTitle}>서비스 선택</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepLabel}>단계 2</span>
                <span className={styles.stepTitle}>날짜 및 정보</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepLabel}>단계 3</span>
                <span className={styles.stepTitle}>최종 확인</span>
              </div>
            </div>

            {/* 서비스 목록 */}
            <div className={styles.serviceList}>
              {services.map(svc => (
                <div 
                  key={svc.id} 
                  className={`${styles.serviceCard} ${selectedService === svc.id ? styles.selected : ''}`}
                  onClick={() => setSelectedService(svc.id)}
                >
                  <h3 className={styles.serviceName}>{svc.name}</h3>
                  <p className={styles.serviceDesc}>{svc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 고정 버튼 영역 */}
        <div className={styles.bottomArea}>
          <button 
            className={styles.nextButton} 
            disabled={!selectedService}
            onClick={() => {
              if (selectedService) {
                // 다음 단계 처리 라우팅 등
                alert('다음 단계로 이동합니다.');
              }
            }}
          >
            다음 단계로
          </button>
        </div>
      </div>
    </div>
  );
}
