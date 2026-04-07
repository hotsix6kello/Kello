export type CityId = 'seoul' | 'busan' | 'jeju' | 'gyeongju';
export type CategoryId = 'beauty' | 'event' | 'food' | 'festival' | 'attraction';

export interface ServiceItem {
    id: string;
    city_id: CityId;
    type: CategoryId;
    title: string;
    area: string;
    price: string | number;
    price_level: 1 | 2 | 3; // 1: ₩, 2: ₩₩, 3: ₩₩₩
    badges: string[]; // "English-friendly", "Vegan", etc.
    image_url?: string;
    image_color?: string; // fallback color
    lat?: number;
    lng?: number;
    rating?: number;
    reviews?: number;
    is_premium?: boolean; // Highlighted or priority sorting
    description?: string; // Short or full description for search
    distance?: number; // Distance in kilometers

    // Type Specific
    // Food
    diet_tags?: string[]; // Vegan, No Pork, Halal
    ingredients?: string[]; // Beef, Pork, Chicken, Seafood, Dairy, Egg
    vegan_option?: 'all_vegan' | 'option_available' | 'unknown'; // displayed badge

    // Event
    start_time?: string; // "19:00"
    end_time?: string;
    venue_area?: string; // "Gangnam Arena"

    // Beauty
    duration_min?: number;
    price_from?: number; // integer for "Start from"

    // Festival
    date_range?: string; // "2024.05.01 - 05.05"
    indoor_outdoor?: 'indoor' | 'outdoor' | 'both';

    // Attraction
    time_needed?: string; // "1h", "2-3h", "Half-day"
    theme?: string; // "History", "Nature"
}
export const MOCK_ITEMS: ServiceItem[] = [];

export const CITIES = [
    { id: 'seoul', label: 'Seoul' },
    { id: 'busan', label: 'Busan' },
    { id: 'jeju', label: 'Jeju' },
    { id: 'gyeongju', label: 'Gyeongju' }
];

export const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'beauty', label: 'Beauty' }
];
