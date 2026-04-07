import React, { useRef, useEffect } from 'react';
import Image from 'next/image';

interface StoreCarouselProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onDetails: (id: string) => void;
    useGrid?: boolean;
}

const StoreCarousel: React.FC<StoreCarouselProps> = ({ items, selectedId, onSelect, onDetails, useGrid = false }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // selectedId가 변경될 때 해당 카드로 자동 스크롤 (캐러셀 모드에서만 작동)
    useEffect(() => {
        if (!useGrid && selectedId && cardRefs.current[selectedId] && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const element = cardRefs.current[selectedId];
            if (element && container) {
                const offset = element.offsetLeft - 16;
                container.scrollTo({ left: offset, behavior: 'smooth' });
            }
        }
    }, [selectedId, useGrid]);

    if (items.length === 0) return null;

    return (
        <div className={useGrid ? "gridContainer" : "fixedBottomList"}>
            <style>{`
                .fixedBottomList {
                    position: absolute !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    z-index: 1000 !important;
                    pointer-events: none !important;
                    display: flex !important;
                    justify-content: center !important;
                    padding: 0 !important;
                    background: transparent !important;
                }
                .gridContainer {
                    position: relative !important;
                    width: 100% !important;
                    height: auto !important;
                    z-index: 10 !important;
                    background: transparent !important;
                }
                .carouselInner {
                    pointer-events: auto !important;
                    width: 100% !important;
                    display: ${useGrid ? 'grid' : 'flex'} !important;
                    grid-template-columns: ${useGrid ? 'repeat(auto-fill, minmax(200px, 1fr))' : 'none'} !important;
                    gap: 16px !important;
                    overflow-x: ${useGrid ? 'hidden' : 'auto'} !important;
                    scroll-snap-type: ${useGrid ? 'none' : 'x mandatory'} !important;
                    scroll-behavior: smooth !important;
                    scrollbar-width: none !important;
                    padding: ${useGrid ? '16px 0' : '8px 16px 20px 16px'} !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                .cardItem {
                    flex-shrink: 0 !important;
                    width: ${useGrid ? '100%' : 'calc(50% - 22px)'} !important;
                    min-height: 240px !important;
                    background: var(--surface, #ffffff) !important;
                    border-radius: var(--radius-md, 16px) !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
                    border: 2px solid transparent !important;
                    transition: border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    cursor: pointer !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                    user-select: none !important;
                    scroll-snap-align: start !important;
                    scroll-snap-stop: always !important;
                }
                .cardItem.selected {
                    border-color: var(--primary, #f45b87) !important;
                }
                .cardImageWrapper {
                    position: relative !important;
                    width: 100% !important;
                    aspect-ratio: 16 / 9 !important;
                    background: var(--gray-100, #f9eef2) !important;
                    flex-shrink: 0 !important;
                    overflow: hidden !important;
                }
                .cardImageWrapper img {
                    object-fit: cover !important;
                }
                .cardContent {
                    padding: 10px !important;
                    flex: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    background: white !important;
                }
                .cardTitle {
                    font-size: 13px !important;
                    font-weight: 800 !important;
                    color: var(--ink-black, #4b3a42) !important;
                    margin-bottom: 2px !important;
                    display: -webkit-box !important;
                    -webkit-line-clamp: 1 !important;
                    -webkit-box-orient: vertical !important;
                    overflow: hidden !important;
                }
                .cardArea {
                    font-size: 10.5px !important;
                    color: var(--soft-ink, #8d747d) !important;
                    display: -webkit-box !important;
                    -webkit-line-clamp: 1 !important;
                    -webkit-box-orient: vertical !important;
                    overflow: hidden !important;
                    line-height: 1.2 !important;
                }
                .cardBadge {
                    display: inline-flex !important;
                    align-items: center !important;
                    padding: 2px 8px !important;
                    background: var(--primary-glow, #ffe3ec) !important;
                    color: var(--primary, #f45b87) !important;
                    border-radius: 4px !important;
                    font-size: 8.5px !important;
                    font-weight: 800 !important;
                    letter-spacing: 0.02em !important;
                }
                .cardDistance {
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    color: var(--soft-ink, #8d747d) !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 2px !important;
                    margin-top: 2px !important;
                }
                div::-webkit-scrollbar { display: none; }
            `}</style>
            
            <div 
                ref={scrollContainerRef}
                className="carouselInner"
            >
                {items.map((item, index) => {
                    const isSelected = selectedId === item.id;
                    const formattedDistance = item.distance 
                        ? (item.distance < 1 
                            ? `${Math.round(item.distance * 1000)}m` 
                            : `${item.distance.toFixed(1)}km`)
                        : null;
                    return (
                        <div 
                            key={item.id}
                            ref={el => { cardRefs.current[item.id] = el }}
                            onClick={() => {
                                onSelect(item.id);
                                onDetails(item.id);
                            }}
                            className={`cardItem ${isSelected ? 'selected' : ''}`}
                        >
                            <div className="cardImageWrapper">
                                <Image 
                                    src={item.image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80'} 
                                    alt={item.title} 
                                    fill 
                                    sizes="(max-width: 768px) 40vw, 200px"
                                    className="object-cover"
                                    priority={index === 0}
                                />
                            </div>
                            <div className="cardContent">
                                <div>
                                    <h3 className="cardTitle">{item.title}</h3>
                                    <p className="cardArea">{item.area || item.address}</p>
                                    {formattedDistance && (
                                        <p className="cardDistance">
                                            <span>📍</span> {formattedDistance}
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                                    <span className="cardBadge">
                                        BOOKABLE
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

};

export default StoreCarousel;
