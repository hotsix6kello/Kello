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

export const MOCK_ITEMS: ServiceItem[] = [
    // --- Food ---
    {
        id: 'f1',
        city_id: 'seoul',
        type: 'food',
        title: 'Plant Cafe Seoul',
        area: 'Itaewon',
        price: '15,000',
        price_level: 2,
        badges: ['English-friendly', 'Vegan-Certified'],
        image_color: '#aaddaa',
        diet_tags: ['Vegan', 'Gluten-free'],
        ingredients: ['Vegetables', 'Soy'],
        vegan_option: 'all_vegan',
        lat: 37.5340,
        lng: 126.9940,
        is_premium: true
    },
    {
        id: 'f2',
        city_id: 'seoul',
        type: 'food',
        title: 'Gold Pig BBQ',
        area: 'Yaksu',
        price: '20,000',
        price_level: 2,
        badges: ['Michelin', 'Wait-free'],
        image_color: '#ffddaa',
        diet_tags: ['Meat-lover'],
        ingredients: ['Pork', 'Kimchi'],
        vegan_option: 'unknown',
        lat: 37.5540,
        lng: 127.0140
    },
    {
        id: 'f3',
        city_id: 'busan',
        type: 'food',
        title: 'Jagalchi Fish Market Feast',
        area: 'Nampo',
        price: '40,000',
        price_level: 3,
        badges: ['Local Experience'],
        image_color: '#aaddff',
        diet_tags: ['Pescatarian'],
        ingredients: ['Seafood'],
        vegan_option: 'unknown'
    },

    // --- Beauty ---
    {
        id: 'b1',
        city_id: 'seoul',
        type: 'beauty',
        title: 'Jenny House Cheongdam',
        area: 'Cheongdam',
        price: '150,000',
        price_level: 3,
        badges: ['K-Idol Style', 'English-friendly'],
        image_color: '#ffccd5',
        duration_min: 90,
        price_from: 150000,
        lat: 37.5240,
        lng: 127.0440,
        is_premium: true
    },
    {
        id: 'b2',
        city_id: 'seoul',
        type: 'beauty',
        title: 'PPEUM Clinic Gangnam',
        area: 'Gangnam',
        price: '50,000',
        price_level: 1,
        badges: ['Tax Refund', 'English-friendly'],
        image_color: '#e6e6fa',
        duration_min: 60,
        price_from: 49000
    },

    // --- Event ---
    {
        id: 'e1',
        city_id: 'seoul',
        type: 'event',
        title: 'PSY Water Show 2024',
        area: 'Jamsil Stadium',
        price: '140,000',
        price_level: 3,
        badges: ['Summer Must-go'],
        image_color: '#00ccff',
        start_time: '18:00',
        venue_area: 'Jamsil'
    },
    {
        id: 'e2',
        city_id: 'seoul',
        type: 'event',
        title: 'Nanta Show Myeongdong',
        area: 'Myeongdong',
        price: '40,000',
        price_level: 2,
        badges: ['Non-verbal', 'Family'],
        image_color: '#ffaa00',
        start_time: '17:00',
        venue_area: 'Myeongdong Theater'
    },

    // --- Festival ---
    {
        id: 'fs1',
        city_id: 'seoul',
        type: 'festival',
        title: 'Seoul Lantern Festival',
        area: 'Gwanghwamun',
        price: 'Free',
        price_level: 1,
        badges: ['Night view', 'Photo spot'],
        image_color: '#ffffaa',
        date_range: '2024.11.01 - 11.15',
        indoor_outdoor: 'outdoor'
    },
    {
        id: 'fs2',
        city_id: 'busan',
        type: 'festival',
        title: 'Busan International Film Festival',
        area: 'Centum City',
        price: '10,000',
        price_level: 1,
        badges: ['Global'],
        image_color: '#ff0000',
        date_range: '2024.10.02 - 10.11',
        indoor_outdoor: 'indoor'
    },

    // --- Attraction ---
    {
        id: 'a1',
        city_id: 'seoul',
        type: 'attraction',
        title: 'Gyeongbokgung Palace',
        area: 'Jongno',
        price: '3,000',
        price_level: 1,
        badges: ['Hanbok Free Entry', 'History'],
        image_color: '#ccffcc',
        time_needed: '2-3h',
        theme: 'History'
    },
    {
        id: 'a2',
        city_id: 'seoul',
        type: 'attraction',
        title: 'Lotte World Tower',
        area: 'Jamsil',
        price: '27,000',
        price_level: 2,
        badges: ['City View', 'Night View'],
        image_color: '#ddeeff',
        time_needed: '1h',
        theme: 'City View'
    }
];

export const CITIES = [
    { id: 'seoul', label: 'Seoul' },
    { id: 'busan', label: 'Busan' },
    { id: 'jeju', label: 'Jeju' },
    { id: 'gyeongju', label: 'Gyeongju' }
];

export const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'food', label: 'Food' },
    { id: 'beauty', label: 'Beauty' },
    { id: 'event', label: 'Events' },
    { id: 'festival', label: 'Festivals' },
    { id: 'attraction', label: 'Attractions' }
];
