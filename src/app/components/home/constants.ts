import type { TFunction } from 'i18next';

export type BeautyCategoryId = 'hair' | 'nail' | 'esthetic' | 'waxing' | 'makeup' | 'lash';

export type BeautyCategoryOption = {
  id: BeautyCategoryId;
  label: string;
  image: string;
  iconScale?: number;
};

export const BEAUTY_CATEGORY_OPTIONS: BeautyCategoryOption[] = [
  {
    id: 'hair',
    label: 'categories.hair.label',
    image: '/images/home/categories/hair-category.png',
    iconScale: 1.45,
  },
  {
    id: 'nail',
    label: 'categories.nail.label',
    image: '/images/home/categories/nail-category.png',
    iconScale: 1.05,
  },
  {
    id: 'esthetic',
    label: 'categories.esthetic.label',
    image: '/images/home/categories/care-category.png',
    iconScale: 1.25,
  },
  {
    id: 'waxing',
    label: 'categories.waxing.label',
    image: '/images/home/categories/wax-category.png',
    iconScale: 1.3,
  },
  {
    id: 'makeup',
    label: 'categories.makeup.label',
    image: '/images/home/categories/makeup-category.png',
    iconScale: 1.15,
  },
  {
    id: 'lash',
    label: 'categories.lash.label',
    image: '/images/home/categories/lash-category.png',
    iconScale: 1.6,
  },
];

export const MOCK_PLACES = [
  { title: 'home.places.lotte_main.title', area: 'home.places.lotte_main.area', lat: 37.5647, lng: 126.9818 },
  { title: 'home.places.lotte_tower.title', area: 'home.places.lotte_tower.area', lat: 37.5125, lng: 127.1025 },
  { title: 'home.places.lotte_world.title', area: 'home.places.lotte_world.area', lat: 37.5111, lng: 127.0982 },
  { title: 'home.places.lotte_hotel.title', area: 'home.places.lotte_hotel.area', lat: 37.5657, lng: 126.9808 },
  { title: 'home.places.namsan.title', area: 'home.places.namsan.area', lat: 37.5512, lng: 126.9882 },
  { title: 'home.places.namdaemun.title', area: 'home.places.namdaemun.area', lat: 37.5591, lng: 126.9776 },
  { title: 'home.places.gyeongbokgung.title', area: 'home.places.gyeongbokgung.area', lat: 37.5796, lng: 126.9770 },
  { title: 'home.places.myeongdong.title', area: 'home.places.myeongdong.area', lat: 37.5645, lng: 126.9845 }
];

export type BeautyRegionId = 'all' | 'jongno' | 'gangnam' | 'hongdae' | 'seongsu' | 'jamsil' | 'konkuk' | 'pangyo';

export type BeautyStore = {
  id: string;
  name: string;
  category: BeautyCategoryId;
  region: Exclude<BeautyRegionId, 'all'>;
  rating: number;
  reviewCount: number;
  priceLabel: string;
  shortDescription: string;
  tags: string[];
  imageUrl?: string;
};

export const BEAUTY_REGIONS: (t: TFunction, tBeauty: TFunction) => Array<{ id: BeautyRegionId; label: string }> = (t, tBeauty) => [
  { id: 'all', label: tBeauty('region_all', { defaultValue: '전체 지역' }) },
  { id: 'jongno', label: tBeauty('regions.jongno', { defaultValue: '종로' }) },
  { id: 'gangnam', label: tBeauty('regions.gangnam', { defaultValue: '강남' }) },
  { id: 'hongdae', label: tBeauty('regions.hongdae', { defaultValue: '홍대' }) },
  { id: 'seongsu', label: tBeauty('regions.seongsu', { defaultValue: '성수' }) },
  { id: 'jamsil', label: tBeauty('regions.jamsil', { defaultValue: '잠실' }) },
  { id: 'konkuk', label: tBeauty('regions.konkuk', { defaultValue: '건대' }) },
  { id: 'pangyo', label: tBeauty('regions.pangyo', { defaultValue: '판교' }) },
];

export const BEAUTY_STORE_ITEMS: BeautyStore[] = [];

export type BeautyDesigner = {
  id: string;
  name: string;
  specialty?: string;
  experienceLabel?: string;
  shortNote?: string;
  surcharge?: number;
};

export type BeautyServiceOption = {
  id: string;
  name: string;
  description?: string;
  price: number;
};

export const DESIGNERS_BY_STORE: Record<string, BeautyDesigner[]> = {};

export const PRIMARY_SERVICES_BY_CATEGORY: Record<string, BeautyServiceOption[]> = {};

export const BEAUTY_AVAILABILITY_BY_STORE: Record<string, Record<number, string[]>> = {};

