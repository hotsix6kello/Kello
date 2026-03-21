"use client";

import React, { useState, useEffect, useMemo } from 'react';

// Props 인터페이스
interface IntegratedBookingMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  initialDate?: string | null;  // 추가
  initialTime?: string | null;  // 추가
}

// 날짜 포맷 유틸
function formatDateKR(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[date.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function IntegratedBookingMenu({ isOpen, onClose, onConfirm, initialDate, initialTime }: IntegratedBookingMenuProps) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // 애니메이션 및 초기화 제어
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 초기값 설정
      if (initialDate) {
        const d = new Date(initialDate);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          setViewMonth(d.getMonth());
          setViewYear(d.getFullYear());
        }
      } else {
        setSelectedDate(null);
      }
      
      if (initialTime) {
        setSelectedTime(initialTime);
      } else {
        setSelectedTime('');
      }

      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 캘린더 데이터 계산
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startOffset = firstDay.getDay(); // 0=일요일
    const totalDays = lastDay.getDate();

    const days: (Date | null)[] = [];
    // 앞쪽 빈칸
    for (let i = 0; i < startOffset; i++) days.push(null);
    // 실제 날짜
    for (let d = 1; d <= totalDays; d++) days.push(new Date(viewYear, viewMonth, d));
    return days;
  }, [viewYear, viewMonth]);

  const monthLabel = `${viewYear}년 ${viewMonth + 1}월`;

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  // 10:00 ~ 19:30 시간 슬롯
  const timeSlots = [
    '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30',
  ];

  if (!isVisible && !isOpen) return null;

  return (
    <div
      dir="ltr"
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ease-in-out ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className={`relative w-[92vw] max-w-[420px] max-h-[85vh] bg-white rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col transform transition-all duration-300 ease-out ${
          isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-[#1f2024] tracking-tight">날짜 및 시간 설정</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
               <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-[15px] font-bold text-[#1f2024] mb-3">날짜 선택</h3>
            <div className="flex items-center justify-between mb-3 px-1">
              <button onClick={goToPrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <span className="text-[15px] font-bold text-[#1f2024]">{monthLabel}</span>
              <button onClick={goToNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0 mb-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                <div key={d} className={`text-center text-[12px] font-semibold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0">
              {calendarDays.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
                const isPast = day < today && !isSameDay(day, today);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isToday = isSameDay(day, today);
                const dayOfWeek = day.getDay();
                return (
                  <button
                    key={toDateKey(day)}
                    type="button"
                    disabled={isPast}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square flex items-center justify-center rounded-xl text-[14px] font-medium transition-all duration-150 ${
                      isSelected ? 'bg-[#bb8a78] text-white font-bold' : isPast ? 'text-gray-200 cursor-not-allowed' : isToday ? 'bg-[#fbf6f4] text-[#bb8a78] font-bold ring-1 ring-[#bb8a78]/50' : dayOfWeek === 0 ? 'text-red-500 hover:bg-red-50' : dayOfWeek === 6 ? 'text-blue-500 hover:bg-blue-50' : 'text-[#2c2d33] hover:bg-gray-100'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            {selectedDate && (
              <div className="mt-3 text-center text-[13px] font-semibold text-[#bb8a78]">✓ {formatDateKR(selectedDate)} 선택됨</div>
            )}
          </div>

          <div className="mb-2">
            <h3 className="text-[15px] font-bold text-[#1f2024] mb-3">시간 선택</h3>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-95 ${
                      isSelected ? 'bg-[#bb8a78] text-white' : 'bg-[#f4f5f7] text-[#4a4d57] hover:bg-[#e4e6ea]'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-white">
          <button
            onClick={() => {
              if (!selectedDate || !selectedTime) return;
              onConfirm(toDateKey(selectedDate), selectedTime);
            }}
            disabled={!selectedDate || !selectedTime}
            className={`w-full text-[16px] font-bold rounded-xl py-4 transition-all ${
              selectedDate && selectedTime ? 'bg-[#bb8a78] text-white' : 'bg-gray-200 text-gray-400'
            }`}
          >
            예약 완료
          </button>
        </div>
      </div>
    </div>
  );
}
