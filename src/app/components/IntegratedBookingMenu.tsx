"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { supabase } from '@/lib/supabaseClient';

// Props 인터페이스
interface IntegratedBookingMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  initialDate?: string | null;  // 추가
  initialTime?: string | null;  // 추가
  // Kello Partner 제휴 매장 연동: storeSource가 'partner'이면 storeId/durationMin으로
  // 실제 예약 가능 시간을 조회한다. google/concierge 매장은 기존 고정 시간을 사용한다.
  storeId?: string | null;
  storeSource?: 'google' | 'partner' | null;
  durationMin?: number | null;
}

const DEFAULT_TIME_SLOTS = [
  '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00'
];

// 날짜 포맷 유틸
function formatDateLocalized(date: Date, lang: string, t: TFunction): string {
  const formatted = new Intl.DateTimeFormat(lang, { 
    month: 'short', 
    day: 'numeric', 
    weekday: 'short' 
  }).format(date);
  return t('selected_confirmation', { date: formatted });
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

export default function IntegratedBookingMenu({ isOpen, onClose, onConfirm, initialDate, initialTime, storeId, storeSource, durationMin }: IntegratedBookingMenuProps) {
  const { t, i18n } = useTranslation('beauty_explore');
  const lang = i18n.language || 'ko';
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [partnerSlots, setPartnerSlots] = useState<string[] | null>(null);
  const [isLoadingPartnerSlots, setIsLoadingPartnerSlots] = useState(false);

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

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long' }).format(new Date(viewYear, viewMonth, 1));
  }, [viewYear, viewMonth, lang]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  // Kello Partner 제휴 매장: 선택한 날짜의 실제 예약 가능 시간을 조회한다.
  useEffect(() => {
    if (storeSource !== 'partner' || !storeId || !durationMin || !selectedDate) {
      setPartnerSlots(null);
      return;
    }

    let isMounted = true;
    setIsLoadingPartnerSlots(true);

    const loadSlots = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (isMounted) setPartnerSlots([]);
          return;
        }

        const response = await fetch(
          `/api/partner-stores/${encodeURIComponent(storeId)}/slots?date=${toDateKey(selectedDate)}&duration_min=${durationMin}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );

        if (!response.ok) {
          if (isMounted) setPartnerSlots([]);
          return;
        }

        const data = await response.json();
        if (isMounted) {
          setPartnerSlots(data?.ok && Array.isArray(data.slots) ? data.slots : []);
        }
      } catch (error) {
        console.error('[IntegratedBookingMenu] Failed to load partner slots', error);
        if (isMounted) setPartnerSlots([]);
      } finally {
        if (isMounted) setIsLoadingPartnerSlots(false);
      }
    };

    void loadSlots();

    return () => {
      isMounted = false;
    };
  }, [storeSource, storeId, durationMin, selectedDate]);

  // 제휴 매장이면 실제 예약 가능 시간을, 그 외(구글/컨시어지)에는 기존 고정 시간을 사용한다.
  const timeSlots = useMemo(
    () => (storeSource === 'partner' ? (partnerSlots ?? []) : DEFAULT_TIME_SLOTS),
    [storeSource, partnerSlots],
  );

  // 선택된 시간이 더 이상 유효하지 않으면(슬롯 목록 변경 등) 초기화한다.
  useEffect(() => {
    if (selectedTime && !timeSlots.includes(selectedTime)) {
      setSelectedTime('');
    }
  }, [timeSlots, selectedTime]);

  if (!isVisible && !isOpen) return null;

  return (
    <div
      dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ease-in-out ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className={`relative w-[92vw] max-w-[420px] max-h-[85vh] bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col transform transition-all duration-300 ease-out ${
          isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
        } ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-[var(--ink-black)] tracking-tight">{t('booking_panel_title')}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--hanji-ivory)] text-[var(--soft-ink)] border border-[var(--warm-sand)]">
               <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-[15px] font-bold text-[var(--ink-black)] mb-3">{t('select_date')}</h3>
            <div className="flex items-center justify-between mb-3 px-1">
              <button onClick={goToPrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--hanji-ivory)] transition-colors">
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <span className="text-[15px] font-bold text-[var(--ink-black)]">{monthLabel}</span>
              <button onClick={goToNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--hanji-ivory)] transition-colors">
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0 mb-1">
              {[
                t('weekdays.sun'), 
                t('weekdays.mon'), 
                t('weekdays.tue'), 
                t('weekdays.wed'), 
                t('weekdays.thu'), 
                t('weekdays.fri'), 
                t('weekdays.sat')
              ].map((d, i) => (
                <div key={i} className={`text-center text-[12px] font-semibold py-1 ${i === 0 ? 'text-[var(--korean-red)]' : i === 6 ? 'text-[var(--secondary)]/70' : 'text-[var(--soft-ink)]'}`}>{d}</div>
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
                    onClick={() => {
                      setSelectedDate(day);
                      // Reset time when date changes
                      setSelectedTime('');
                    }}
                    className={`aspect-square flex items-center justify-center rounded-[var(--radius-sm)] text-[14px] font-medium transition-all duration-150 ${
                      isSelected ? 'bg-[var(--primary)] text-white font-bold' : isPast ? 'text-[var(--warm-sand)] cursor-not-allowed' : isToday ? 'bg-[var(--primary-glow)] text-[var(--primary)] font-bold ring-1 ring-[var(--primary)]/20' : dayOfWeek === 0 ? 'text-[var(--korean-red)] hover:bg-[var(--korean-red)]/5' : dayOfWeek === 6 ? 'text-[var(--secondary)]/80 hover:bg-[var(--secondary)]/5' : 'text-[var(--ink-black)] hover:bg-[var(--hanji-ivory)]'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            {selectedDate && (
              <div className="mt-3 text-center text-[13px] font-semibold text-[var(--secondary)]">{formatDateLocalized(selectedDate, lang, t)}</div>
            )}
          </div>

          {selectedDate && (
            <div className="mb-2 animate-[fadeIn_0.3s_ease-out]">
              <h3 className="text-[15px] font-bold text-[var(--ink-black)] mb-3">{t('select_time')}</h3>
              {storeSource === 'partner' && isLoadingPartnerSlots ? (
                <div className="py-4 text-center text-[13px] text-[var(--soft-ink)]">{t('loading')}</div>
              ) : timeSlots.length === 0 ? (
                <div className="py-4 text-center text-[13px] text-[var(--soft-ink)]">{t('no_available_times')}</div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2.5 rounded-[var(--radius-sm)] text-[14px] font-semibold transition-all duration-150 active:scale-95 border ${
                          isSelected ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--hanji-ivory)] text-[var(--ink-black)] hover:bg-[var(--warm-sand)]/30 border-[var(--warm-sand)]'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-[var(--warm-sand)] bg-[var(--surface)]">
          <button
            onClick={() => {
              if (!selectedDate || !selectedTime) return;
              onConfirm(toDateKey(selectedDate), selectedTime);
            }}
            disabled={!selectedDate || !selectedTime}
            className={`w-full text-[16px] font-bold rounded-[var(--radius-md)] py-4 transition-all ${
              selectedDate && selectedTime ? 'bg-[var(--primary)] text-white shadow-[var(--shadow-md)]' : 'bg-[var(--warm-sand)]/50 text-[var(--soft-ink)]'
            }`}
          >
            {t('btn_complete')}
          </button>
        </div>
      </div>
    </div>
  );
}
