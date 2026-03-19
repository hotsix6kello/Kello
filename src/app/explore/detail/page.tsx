"use client";

import { useState } from "react";
// import styles from "./detail.module.css";
// import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Inline styles for speed as creating another CSS module is verbose, but will link correctly if file existed
// Actually, let's use the module I just created.
import styles from "./detail.module.css";
import ReviewSection from "../../../components/review/ReviewSection";

export default function BookingDetail() {
    const router = useRouter();
    const [selectedService, setSelectedService] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState<"date" | "confirm" | "payment">("date");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    // Mock Shop Data (Jenny House)
    const shop = {
        name: "Jenny House Cheongdam",
        rating: 4.9,
        reviews: 1240,
        tags: ["K-Pop Style", "Celebrity", "Cheongdam"],
        location: "23, Apgujeong-ro 79-gil, Gangnam-gu, Seoul",
        services: [
            { id: 1, name: "K-Pop Idol Hair & Makeup", price: 350000, desc: "Full styling package used by actual idols." },
            { id: 2, name: "Premium Hair Cut", price: 88000, desc: "Designer cut with scalp treatment." },
            { id: 3, name: "Personal Color Analysis", price: 150000, desc: "Find your best color with draping." }
        ]
    };

    const handleBookClick = () => {
        if (selectedService === null) {
            alert("Please select a service first.");
            return;
        }
        setIsModalOpen(true);
        setStep("date");
    };

    const handlePayment = () => {
        setStep("payment");
        setTimeout(() => {
            alert("Payment Successful! (Mock)");
            setIsModalOpen(false);
            router.push("/"); // Go back home
        }, 2000);
    };

    return (
        <div className={styles.container}>
            {/* Hero Image */}
            <div className={styles.hero}>
                <div className={styles.headerOverlay}>
                    <button className={styles.backBtn} onClick={() => router.back()}>←</button>
                    <button className={styles.backBtn}>♡</button>
                </div>
                {/* Placeholder for real image */}
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #333, #666)' }}></div>
            </div>

            {/* Info Card */}
            <div className={styles.infoCard}>
                <div className={styles.badges}>
                    {shop.tags.map(tag => <span key={tag} className={styles.badge}>{tag}</span>)}
                </div>
                <h1 className={styles.title}>
                    {shop.name}
                    <span className={styles.verified} title="Verified Partner"></span>
                </h1>
                <div className={styles.rating}>
                    ★ {shop.rating} ({shop.reviews} reviews) • Top Rated
                </div>
                <div className={styles.location}>
                    📍 {shop.location}
                </div>

                {/* Services */}
                <h2 className={styles.sectionTitle}>Select Service</h2>
                {shop.services.map(service => (
                    <div
                        key={service.id}
                        className={`${styles.menuItem} ${selectedService === service.id ? styles.selected : ''}`}
                        onClick={() => setSelectedService(service.id)}
                    >
                        <div className={styles.menuInfo}>
                            <h4>{service.name}</h4>
                            <p>{service.desc}</p>
                        </div>
                        <div className={styles.price}>
                            ₩{service.price.toLocaleString()}
                        </div>
                    </div>
                ))}

                {/* Reviews Section */}
                <hr style={{ borderColor: '#222', margin: '32px 0' }} />
                <ReviewSection />
            </div>

            {/* Bottom Booking Bar */}
            <div className={styles.bottomBar}>
                <div className={styles.totalPrice}>
                    <span>Total Price</span>
                    <strong>
                        {selectedService
                            ? `₩${shop.services.find(s => s.id === selectedService)?.price.toLocaleString()}`
                            : '₩0'
                        }
                    </strong>
                </div>
                <button className={styles.bookBtn} onClick={handleBookClick}>
                    Book Now
                </button>
            </div>

            {/* Booking Modal */}
            {isModalOpen && (
                <div className={`${styles.modalOverlay} ${styles.open}`}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>{step === 'date' ? 'Select Date & Time' : step === 'confirm' ? 'Confirm Booking' : 'Processing...'}</h3>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>×</button>
                        </div>

                        {step === 'date' && (
                            <div>
                                <p style={{ marginBottom: '12px', color: '#888' }}>October 2023</p>
                                <div className={styles.dateGrid}>
                                    {['18 Wed', '19 Thu', '20 Fri', '21 Sat'].map(d => (
                                        <div key={d}
                                            className={`${styles.dateSlot} ${selectedDate === d ? styles.selected : ''}`}
                                            onClick={() => setSelectedDate(d)}
                                        >
                                            {d}
                                        </div>
                                    ))}
                                </div>
                                <p style={{ marginBottom: '12px', color: '#888' }}>Available Time</p>
                                <div className={styles.timeGrid}>
                                    {['10:00', '11:00', '14:00', '15:30', '17:00', '18:30'].map(t => (
                                        <div key={t}
                                            className={`${styles.timeSlot} ${selectedTime === t ? styles.selected : ''}`}
                                            onClick={() => setSelectedTime(t)}
                                        >
                                            {t}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    className={styles.bookBtn}
                                    style={{ width: '100%', marginTop: '24px' }}
                                    disabled={!selectedDate || !selectedTime}
                                    onClick={() => setStep('confirm')}
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        {step === 'confirm' && (
                            <div>
                                <div style={{ background: '#222', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                                    <p style={{ color: '#888', fontSize: '0.9rem' }}>Service</p>
                                    <h4>{shop.services.find(s => s.id === selectedService)?.name}</h4>
                                    <hr style={{ borderColor: '#333', margin: '12px 0' }} />
                                    <p style={{ color: '#888', fontSize: '0.9rem' }}>Date & Time</p>
                                    <h4>{selectedDate}, {selectedTime}</h4>
                                    <hr style={{ borderColor: '#333', margin: '12px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Total</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                                            ₩{shop.services.find(s => s.id === selectedService)?.price.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                    {['VISA', 'Master', 'KakaoPay'].map(p => (
                                        <div key={p} style={{ border: '1px solid #444', padding: '12px', borderRadius: '8px', flex: 1, textAlign: 'center', fontSize: '0.8rem' }}>
                                            {p}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    className={styles.bookBtn}
                                    style={{ width: '100%' }}
                                    onClick={handlePayment}
                                >
                                    Pay ₩{shop.services.find(s => s.id === selectedService)?.price.toLocaleString()}
                                </button>
                            </div>
                        )}

                        {step === 'payment' && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
                                <h3>Processing Payment...</h3>
                                <p style={{ color: '#888' }}>Please do not close this window.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
