"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function BookingDetailPage() {
    const { t } = useTranslation("common");
    const params = useParams();
    const router = useRouter();
    const id = params.id; // Service ID

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    // Mock Service Data
    const service = {
        title: t(`explore_items.${id}.title`, { defaultValue: "Jenny House Cheongdam" }),
        desc: t(`explore_items.${id}.desc`, { defaultValue: "Premium K-Pop Idol Hair & Makeup Styling" }),
        price: t(`explore_items.${id}.price`, { defaultValue: "150,000" }),
        duration: "90 min",
        imageColor: "#ffccd5"
    };

    const timeSlots = [
        '10:00', '11:00', '12:00', '13:00',
        '14:00', '15:00', '16:00', '17:00',
        '18:00', '19:00'
    ];

    const today = useMemo(() => new Date(), []);
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewYear, setViewYear] = useState(today.getFullYear());

    const calendarDays = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const lastDay = new Date(viewYear, viewMonth + 1, 0);
        const startOffset = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const days: (Date | null)[] = [];
        for (let i = 0; i < startOffset; i++) days.push(null);
        for (let d = 1; d <= totalDays; d++) days.push(new Date(viewYear, viewMonth, d));
        return days;
    }, [viewYear, viewMonth]);

    const monthLabel = useMemo(() => {
        return new Intl.DateTimeFormat(t('common.locale', { defaultValue: 'ko-KR' }), { year: 'numeric', month: 'long' }).format(new Date(viewYear, viewMonth, 1));
    }, [viewYear, viewMonth, t]);

    const goToPrevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
        else setViewMonth(viewMonth - 1);
    };
    const goToNextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
        else setViewMonth(viewMonth + 1);
    };

    function isSameDay(a: Date, b: Date): boolean {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    const handleConfirm = () => {
        router.push('/my?booked=true');
    };

    return (
        <div className="min-h-screen bg-white text-black pb-24">
            {/* Header Image */}
            <div className="relative h-64 w-full bg-gray-200">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
                <div className="absolute top-4 left-4 z-10">
                    <button onClick={() => router.back()} className="glass-btn">← {t('common.back')}</button>
                </div>
                <div className="absolute bottom-4 left-4 right-4 z-10">
                    <div className="text-xs text-purple-600 font-bold uppercase mb-1">{t('common.categories.beauty')}</div>
                    <h1 className="text-2xl font-bold">{service.title}</h1>
                    <p className="text-gray-600 text-sm mt-1">{service.desc}</p>
                </div>
            </div>

            <div className="p-6">
                {/* Step 1: Select Date */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold mb-4">{t('booking_detail.select_date', { defaultValue: '날짜 선택' })}</h2>
                    <div className="mb-4 px-1 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <button onClick={goToPrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                                <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <span className="text-[15px] font-bold text-[#1f2024]">{monthLabel}</span>
                            <button onClick={goToNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                                <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-0 mb-2">
                            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                                <div key={i} className={`text-center text-[12px] font-semibold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-purple-400' : 'text-gray-400'}`}>{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, index) => {
                                if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
                                const isPast = day < new Date(new Date().setHours(0,0,0,0));
                                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                                const isToday = isSameDay(day, today);
                                const dayOfWeek = day.getDay();
                                return (
                                    <button
                                        key={day.toISOString()}
                                        type="button"
                                        disabled={isPast}
                                        onClick={() => {
                                            setSelectedDate(day);
                                            setSelectedTime(null);
                                        }}
                                        className={`aspect-square flex items-center justify-center rounded-xl text-[14px] font-medium transition-all duration-150 ${isSelected ? 'bg-purple-600 text-white font-bold' : isPast ? 'text-gray-200 cursor-not-allowed' : isToday ? 'bg-purple-50 text-purple-600 font-bold ring-1 ring-purple-500/50' : dayOfWeek === 0 ? 'text-red-500 hover:bg-red-50' : dayOfWeek === 6 ? 'text-purple-500 hover:bg-purple-50' : 'text-[#2c2d33] hover:bg-gray-100'}`}
                                    >
                                        {day.getDate()}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Step 2: Select Time */}
                {selectedDate && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4">{t('booking_detail.select_time')}</h2>
                        <div className="grid grid-cols-3 gap-3">
                            {timeSlots.map(time => (
                                <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={`py-3 rounded-xl border text-sm font-medium transition-all ${selectedTime === time
                                        ? 'bg-purple-600 text-white border-purple-600'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                        }`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Sticky Action */}
            <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-200 p-6 flex justify-between items-center z-50">
                <div>
                    <div className="text-xs text-gray-500">{t('booking_detail.total_price')}</div>
                    <div className="text-lg font-bold text-black">₩{service.price}</div>
                </div>
                <button
                    disabled={!selectedDate || !selectedTime}
                    onClick={handleConfirm}
                    className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/30"
                >
                    {t('booking_detail.request_booking')}
                </button>
            </div>
        </div>
    );
}
