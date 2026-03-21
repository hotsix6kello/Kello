"use client";

import React, { useState, useEffect } from 'react';

interface BookingBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, times: string[]) => void;
}

export default function BookingBottomSheet({ isOpen, onClose, onConfirm }: BookingBottomSheetProps) {
  // 상태 관리: 선택된 날짜와 선택된 시간들
  const [selectedDate, setSelectedDate] = useState('2026-03-25');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);

  // 바텀 시트가 열릴 때 애니메이션 및 스크롤 방지를 위한 효과
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // 약간의 지연 후 애니메이션 시작 (부드러운 슬라이드 업)
      setTimeout(() => setIsAnimating(true), 10);
      document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    } else {
      setIsAnimating(false);
      // 애니메이션 종료 후 DOM에서 숨김 처리
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 10:00부터 19:30까지 30분 간격의 시간 슬롯 생성
  const timeSlots = [
    '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30'
  ];

  // 시간 클릭 핸들러 (다중 선택 또는 토글 로직)
  const handleTimeClick = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time)
        ? prev.filter((t) => t !== time) // 이미 선택된 경우 해제
        : [...prev, time] // 새로 선택된 경우 추가
    );
  };

  // 배경(오버레이) 클릭 시 닫기
  const handleOverlayClick = () => {
    onClose();
  };

  // 모달 내부 클릭 시 이벤트 버블링 방지
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isVisible && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex justify-center items-end bg-black/50 transition-opacity duration-300 ease-in-out ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full max-w-md bg-white rounded-t-[28px] pt-3 pb-8 px-6 transform transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={handleModalClick}
      >
        {/* 상단 드래그 핸들 (시각적 표시) */}
        <div className="flex justify-center mb-5">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
        </div>

        {/* 헤더 타이틀 */}
        <h2 className="text-[22px] font-extrabold text-[#1f2024] mb-6 tracking-tight">
          날짜 및 시간 설정
        </h2>

        {/* 1. 날짜 선택 영역 */}
        <div className="mb-7">
          <h3 className="text-[15px] font-bold text-[#1f2024] mb-3">날짜 선택</h3>
          <div className="relative">
            <select
              className="w-full appearance-none bg-[#f4f5f7] border border-transparent text-[#2c2d33] text-[15px] font-semibold rounded-xl px-4 py-3.5 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-colors cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              <option value="2026-03-25">3월 25일 (수요일)</option>
              <option value="2026-03-26">3월 26일 (목요일)</option>
              <option value="2026-03-27">3월 27일 (금요일)</option>
              {/* 추가 날짜 데이터를 매핑할 수 있습니다. */}
            </select>
            {/* 우측 커스텀 화살표 아이콘 */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. 시간 선택 영역 (4열 Grid) */}
        <div className="mb-8">
          <h3 className="text-[15px] font-bold text-[#1f2024] mb-3">시간 선택</h3>
          <div className="grid grid-cols-4 gap-2.5">
            {timeSlots.map((time) => {
              const isSelected = selectedTimes.includes(time);
              return (
                <button
                  key={time}
                  onClick={() => handleTimeClick(time)}
                  className={`py-2.5 rounded-xl text-[14.5px] font-semibold transition-all duration-200 active:scale-95 ${
                    isSelected
                      ? 'bg-[#3b82f6] text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                      : 'bg-[#f4f5f7] text-[#4a4d57] hover:bg-[#e4e6ea]'
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 최종 예약 완료 버튼 */}
        <button
          onClick={() => {
            onConfirm(selectedDate, selectedTimes);
            onClose(); // 완료 후 바텀 시트 닫기
          }}
          className="w-full bg-[#3b82f6] text-white text-[16px] font-bold rounded-xl py-4 transition-transform active:scale-[0.98] shadow-[0_8px_20px_rgba(59,130,246,0.3)] focus:outline-none"
        >
          예약 완료
        </button>
      </div>
    </div>
  );
}
