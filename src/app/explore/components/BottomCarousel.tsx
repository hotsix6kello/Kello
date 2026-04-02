import Image from 'next/image';
import StoreCarousel from './StoreCarousel';

interface BottomCarouselProps {
    items: any[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onDetails: (id: string) => void;
    styles: any;
    useGrid?: boolean;
}

export default function BottomCarousel({
    items,
    selectedId,
    onSelect,
    onDetails,
    styles,
    useGrid = false
}: BottomCarouselProps) {
    if (items.length === 0) return null;

    // Grid 모드일 때는 별도 래퍼 없이 StoreCarousel이 자체 스타일 제어
    if (useGrid) {
        return (
            <StoreCarousel
                items={items}
                selectedId={selectedId}
                onSelect={onSelect}
                onDetails={onDetails}
                useGrid={true}
            />
        );
    }

    return (
        <div className={styles.fixedBottomList}>
            <div className={styles.carouselInner}>
                <StoreCarousel
                    items={items}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onDetails={onDetails}
                />
            </div>
        </div>
    );
}
