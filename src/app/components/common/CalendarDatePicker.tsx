'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isBefore, startOfToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

interface CalendarDatePickerProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  label?: string;
}

export default function CalendarDatePicker({
  selectedDate,
  onDateChange,
  label = '예약 날짜 선택'
}: CalendarDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const today = startOfToday();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDaySelect = (date: Date | undefined) => {
    onDateChange(date);
    if (date) setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm font-bold text-[#3d2f28] mb-2">
        {label}
      </label>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-[#fffcf9] border border-[#6d533f]/10 rounded-2xl shadow-sm hover:border-[#7f4f46]/30 transition-all text-left"
      >
        <span className={selectedDate ? 'text-[#231d19] font-bold' : 'text-[#6e6259]'}>
          {selectedDate ? format(selectedDate, 'yyyy년 MM월 dd일', { locale: ko }) : '날짜를 선택해주세요'}
        </span>
        <svg 
          className={`w-5 h-5 text-[#7f4f46] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute z-[100] mt-2 p-4 bg-white border border-[#6d533f]/10 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 origin-top-left">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDaySelect}
            locale={ko}
            disabled={{ before: today }}
            modifiersClassNames={{
              selected: 'rdp-day_selected',
              disabled: 'rdp-day_disabled'
            }}
            styles={{
              caption: { color: '#7f4f46', fontWeight: 'bold' },
              head_cell: { color: '#6e6259', fontWeight: 'bold' },
              day: { borderRadius: '12px', transition: 'all 0.2s' },
            }}
          />
          
          <style jsx global>{`
            .rdp {
              --rdp-cell-size: 40px;
              --rdp-accent-color: #7f4f46;
              --rdp-background-color: #fcece4;
              margin: 0;
            }
            .rdp-day_selected {
              background-color: var(--rdp-accent-color) !important;
              color: white !important;
              font-weight: bold;
            }
            .rdp-day_disabled {
              color: #d1d5db !important; /* text-gray-300 */
              cursor: not-allowed !important;
              opacity: 0.5;
            }
            .rdp-day:hover:not(.rdp-day_disabled) {
              background-color: #fcece4;
              color: #7f4f46;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
