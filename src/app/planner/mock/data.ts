import { CategoryId, CityId } from '../../explore/mock/data';

export type SlotType = 'am' | 'pm' | 'night';

export interface PlanCard {
    id: string;
    item_id: string; // ref to ServiceItem.id
    title: string;
    type: CategoryId;
    area: string;
    image_color?: string;
    duration_min?: number;
    start_time?: string; // for events
    badges: string[];
    note?: string; // user memo
}

export interface PlanSlot {
    type: SlotType;
    label: 'AM' | 'PM' | 'Night';
    icon: string;
    cards: PlanCard[];
}

export interface TripDay {
    day: number;       // 1, 2, 3...
    city_id: CityId;
    city_label: string;
    date: string;      // "2025.06.15" display
}

// --- Mock Trip Plan ---
export const MOCK_TRIP_DAYS: TripDay[] = [
    { day: 1, city_id: 'seoul', city_label: 'Seoul', date: '2025.11.01' },
    { day: 2, city_id: 'seoul', city_label: 'Seoul', date: '2025.11.02' },
    { day: 3, city_id: 'busan', city_label: 'Busan', date: '2025.11.03' },
    { day: 4, city_id: 'busan', city_label: 'Busan', date: '2025.11.04' },
    { day: 5, city_id: 'jeju', city_label: 'Jeju', date: '2025.11.05' },
];

// Initial board cards per day/slot
export const MOCK_PLAN_CARDS: Record<number, Record<SlotType, PlanCard[]>> = {
    1: {
        am: [
            {
                id: 'pc1', item_id: 'a1',
                title: 'Gyeongbokgung Palace',
                type: 'attraction',
                area: 'Jongno',
                image_color: '#ccffcc',
                badges: ['History', 'Hanbok'],
            }
        ],
        pm: [
            {
                id: 'pc2', item_id: 'b1',
                title: 'Jenny House Cheongdam',
                type: 'beauty',
                area: 'Cheongdam',
                image_color: '#ffccd5',
                duration_min: 90,
                badges: ['K-Idol Style'],
            }
        ],
        night: [
            {
                id: 'pc3', item_id: 'e1',
                title: 'PSY Water Show',
                type: 'event',
                area: 'Jamsil',
                image_color: '#00ccff',
                start_time: '18:00',
                badges: ['Must-go'],
            }
        ],
    },
    2: {
        am: [],
        pm: [
            {
                id: 'pc4', item_id: 'f1',
                title: 'Plant Cafe Seoul',
                type: 'food',
                area: 'Itaewon',
                image_color: '#aaddaa',
                badges: ['Vegan-Certified'],
            }
        ],
        night: [],
    },
    3: { am: [], pm: [], night: [] },
    4: { am: [], pm: [], night: [] },
    5: { am: [], pm: [], night: [] },
};

export const SLOTS: { type: SlotType; label: 'AM' | 'PM' | 'Night'; icon: string }[] = [
    { type: 'am', label: 'AM', icon: '🌅' },
    { type: 'pm', label: 'PM', icon: '☀️' },
    { type: 'night', label: 'Night', icon: '🌙' },
];

// Type badge color map
export const TYPE_COLORS: Record<CategoryId, { bg: string; text: string }> = {
    beauty: { bg: '#ffccd5', text: '#aa2244' },
    event: { bg: '#cceeff', text: '#005588' },
    food: { bg: '#ddffd0', text: '#226600' },
    festival: { bg: '#fff3cc', text: '#886600' },
    attraction: { bg: '#e6d9ff', text: '#440088' },
};

// Suggestion drawer mock items (Near / Before / After / Match tabs)
export const SUGGESTION_ITEMS = {
    near: [
        { id: 'sg1', title: 'Nanta Show Myeongdong', type: 'event' as CategoryId, area: 'Myeongdong', image_color: '#ffaa00', badges: ['Non-verbal'] },
        { id: 'sg2', title: 'Gyeongbokgung Night Tour', type: 'attraction' as CategoryId, area: 'Jongno', image_color: '#aaccff', badges: ['Night'] },
        { id: 'sg3', title: 'Seoul Lantern Festival', type: 'festival' as CategoryId, area: 'Gwanghwamun', image_color: '#ffffaa', badges: ['Free'] },
    ],
    before: [
        { id: 'sg4', title: 'Café Near Jamsil', type: 'food' as CategoryId, area: 'Jamsil', image_color: '#ffe8cc', badges: ['Quick'] },
        { id: 'sg5', title: 'Lotte World Tower Observation', type: 'attraction' as CategoryId, area: 'Jamsil', image_color: '#ddeeff', badges: ['City View'] },
    ],
    after: [
        { id: 'sg6', title: 'Gold Pig BBQ', type: 'food' as CategoryId, area: 'Yaksu', image_color: '#ffddaa', badges: ['Michelin'] },
        { id: 'sg7', title: 'PPEUM Clinic Gangnam', type: 'beauty' as CategoryId, area: 'Gangnam', image_color: '#e6e6fa', badges: ['Tax Refund'] },
    ],
    match: [
        { id: 'sg8', title: 'Plant Cafe Seoul', type: 'food' as CategoryId, area: 'Itaewon', image_color: '#aaddaa', badges: ['Vegan-Certified'] },
        { id: 'sg9', title: 'Temple Stay Jogyesa', type: 'attraction' as CategoryId, area: 'Jongno', image_color: '#ccee99', badges: ['English OK', 'No-meat'] },
    ],
};
