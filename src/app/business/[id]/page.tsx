"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslation } from "react-i18next";

export default function BusinessDetailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation("common");

    // URL에서 전달받은 데이터 추출
    const name = searchParams.get('name') || "Standard Salon";
    const address = searchParams.get('address') || "Seoul, South Korea";
    const imageUrl = searchParams.get('image') || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80";

    const timeSlots = [
        '10:00', '11:00', '12:00', '13:00',
        '14:00', '15:00', '16:15', '17:30',
        '18:45', '20:00'
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] pb-32">
            {/* Premium Header Section */}
            <div className="relative w-full h-[40dvh] bg-[#1a1a1a] overflow-hidden">
                <Image 
                    src={imageUrl} 
                    alt={name} 
                    fill 
                    priority
                    className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#fafafa] via-transparent to-black/20" />
                
                {/* Back Button */}
                <button 
                    onClick={() => router.back()} 
                    className="absolute top-6 left-6 z-20 w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 hover:bg-white/40 transition-all"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
            </div>

            {/* Content Container */}
            <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-10">
                <div className="bg-white rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100">
                    <div className="flex flex-col gap-2 mb-6">
                        <span className="text-[10px] font-black tracking-[0.2em] text-[#f45b87] uppercase opacity-80">PREMIUM BEAUTY PARTNER</span>
                        <h1 className="text-3xl font-black tracking-tight">{name}</h1>
                        <p className="text-gray-400 text-sm flex items-center gap-1.5 font-medium">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {address}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
                        {/* Left: Info */}
                        <div className="flex flex-col gap-8">
                            <section>
                                <h2 className="text-sm font-black mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-[#f45b87] rounded-full"></span>
                                    ABOUT SERVICE
                                </h2>
                                <p className="text-[#4b3a42] text-md leading-relaxed font-medium">
                                    {t('business_page.desc1')} <br/>
                                    {t('business_page.desc2')}
                                </p>
                            </section>

                            <section>
                                <h3 className="text-sm font-black mb-4 uppercase tracking-wider text-gray-400">Available Reviews</h3>
                                <div className="flex gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-black italic">4.9</span>
                                        <span className="text-[10px] font-bold opacity-50 uppercase">Global Rating</span>
                                    </div>
                                    <div className="w-px h-10 bg-gray-100"></div>
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-black italic">1,200+</span>
                                        <span className="text-[10px] font-bold opacity-50 uppercase">Verified Reviews</span>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right: Quick Action */}
                        <div className="bg-[#fafafa] rounded-3xl p-6 border border-gray-100">
                            <h2 className="text-sm font-black mb-4 uppercase tracking-wider">Fast Booking</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {timeSlots.slice(0, 4).map(time => (
                                    <button key={time} className="py-3 bg-white border border-gray-200 rounded-xl text-xs font-black hover:border-[#f45b87] hover:text-[#f45b87] transition-all">
                                        {time}
                                    </button>
                                ))}
                            </div>
                            <button className="w-full mt-6 py-4 bg-[#1a1a1a] text-white rounded-2xl font-black text-sm shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                RESERVE FULL SESSION
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Nav Simulation */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-2xl border border-white/50 rounded-full p-4 flex items-center justify-between shadow-[0_20px_40px_rgba(0,0,0,0.15)] z-50">
                <div className="pl-4">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">Starts From</span>
                    <span className="text-lg font-black tracking-tight">₩89,000</span>
                </div>
                <button className="bg-[#f45b87] text-white px-10 py-3.5 rounded-full font-black text-sm hover:brightness-110 shadow-lg shadow-[#f45b87]/30 transition-all">
                    START BOOKING
                </button>
            </div>
        </div>
    );
}
