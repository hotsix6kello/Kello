'use client';

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DayPicker } from 'react-day-picker';
import { startOfToday } from 'date-fns';
import type { Locale } from 'date-fns';
import { ko, enUS, ja, zhCN, zhTW, arSA, es, fr, de, th, vi, id, pt, ru } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import { getBookingFlowCategoryCapabilities } from "@/lib/bookings/bookingFlowSkeleton/constants";
import type { BookingFlowCategory } from "@/lib/bookings/bookingFlowSkeleton/types";

const localeMap: Record<string, Locale> = {
  ko, en: enUS, ja, "zh-CN": zhCN, "zh-TW": zhTW, ar: arSA, es, fr, de, th, vi, id, pt, ru
};

type DateTimeSelectionStepShellProps = {
  category: BookingFlowCategory | null;
  selectedDate: string | null;
  embedded?: boolean;
  onSelectDate?: (value: string) => void;
};

export function DateTimeSelectionStepShell({
  category,
  selectedDate,
  embedded = false,
  onSelectDate,
}: DateTimeSelectionStepShellProps) {
  const { t, i18n } = useTranslation("common");
  const capabilities = getBookingFlowCategoryCapabilities(category);
  const supportsDateSelection = capabilities?.interactiveDateSelection === true;
  
  const currentLocale = localeMap[i18n.language] || enUS;
  const today = startOfToday();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Create a Date object in local time using year, month, day components
  const selectedDateObj = selectedDate 
    ? new Date(
        parseInt(selectedDate.split('-')[0]!), 
        parseInt(selectedDate.split('-')[1]!) - 1, 
        parseInt(selectedDate.split('-')[2]!)
      ) 
    : undefined;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onSelectDate?.(`${year}-${month}-${day}`);
    } else {
      onSelectDate?.("");
    }
    setIsOpen(false);
  };

  const content = supportsDateSelection ? (
    <div className="w-full">
      {/* 2. 날짜 선택 섹션 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 px-1">
          <h3 className="text-[17px] font-bold text-neutral-900">{t("booking_skeleton.date_time.title")}</h3>
          <p className="text-[13px] text-neutral-500">{t("booking_skeleton.date_time.desc")}</p>
        </div>

        <div className="relative group w-full" ref={containerRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full flex items-center justify-between min-h-[64px] rounded-2xl border-2 px-5 text-base font-medium transition-all duration-200 outline-none cursor-pointer ${selectedDate 
              ? "bg-fuchsia-50 border-fuchsia-400 text-fuchsia-900 shadow-[0_8px_20px_rgba(192,38,211,0.06)]" 
              : "bg-white border-neutral-100 text-neutral-900 hover:border-fuchsia-200"
            }`}
          >
            {selectedDate ? selectedDate : <span className="text-neutral-400">{t("booking_skeleton.date_time.placeholder")}</span>}
            <div className={`transition-colors ${selectedDate ? "text-fuchsia-600" : "text-neutral-400"}`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </button>
          
          {isOpen && (
            <div className="absolute z-[100] mt-2 top-full left-0 right-0 p-4 bg-white border border-neutral-100 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 flex justify-center origin-top">
              <DayPicker
                mode="single"
                selected={selectedDateObj}
                onSelect={handleSelect}
                locale={currentLocale}
                disabled={{ before: today }}
                dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                modifiersClassNames={{
                  selected: 'rdp-day_selected',
                  disabled: 'rdp-day_disabled'
                }}
                styles={{
                  caption: { color: '#a21caf', fontWeight: 'bold' },
                  head_cell: { color: '#737373', fontWeight: 'bold' },
                  day: { borderRadius: '12px', transition: 'all 0.2s' },
                }}
                footer={
                  <div className="flex flex-row items-center justify-between mt-4 pt-4 border-t border-neutral-100 w-full min-w-full">
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); onSelectDate?.(""); setIsOpen(false); }}
                      className="text-[14px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors px-2 py-1"
                    >
                      {t("booking_skeleton.date_time.clear")}
                    </button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); handleSelect(today); }}
                      className="text-[14px] font-bold text-fuchsia-600 hover:text-fuchsia-700 transition-colors px-2 py-1"
                    >
                      {t("booking_skeleton.date_time.today")}
                    </button>
                  </div>
                }
              />
              
              {/* Force style overrides without styled-jsx since standard CSS might not be scoped perfectly or styles jsx isn't explicitly imported */}
              <style dangerouslySetInnerHTML={{__html: `
                .rdp {
                  --rdp-cell-size: 44px;
                  --rdp-accent-color: #c026d3;
                  --rdp-background-color: #fdf4ff;
                  margin: 0;
                }
                .rdp-day_selected {
                  background-color: var(--rdp-accent-color) !important;
                  color: white !important;
                  font-weight: bold;
                }
                .rdp-day_disabled {
                  color: #e5e5e5 !important;
                  cursor: not-allowed !important;
                  opacity: 0.5;
                }
                .rdp-day:hover:not(.rdp-day_disabled) {
                  background-color: #fdf4ff;
                  color: #c026d3;
                }
              `}} />
            </div>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className="py-20 text-center bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
      <p className="text-neutral-400 font-medium whitespace-pre-line">
        {t("booking_skeleton.date_time.preparing")}
      </p>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <BookingFlowStepFrame
      eyebrow={`${t("booking_skeleton.steps.step")} 2`}
      title={t("booking_skeleton.date_time.title")}
      description={t("booking_skeleton.date_time.desc")}
    >
      {content}
    </BookingFlowStepFrame>
  );
}