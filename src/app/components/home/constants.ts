import type { TFunction } from 'i18next';

export type BeautyCategoryId = 'hair' | 'nail' | 'esthetic' | 'waxing' | 'makeup' | 'lash';

export type BeautyCategoryOption = {
  id: BeautyCategoryId;
  label: string;
  image: string;
};

export const BEAUTY_CATEGORY_OPTIONS: BeautyCategoryOption[] = [
  {
    id: 'hair',
    label: 'home_beauty.categories.hair.label',
    image: '/images/home/categories/hair-category.png',
  },
  {
    id: 'nail',
    label: 'home_beauty.categories.nail.label',
    image: '/images/home/categories/nail-category.png',
  },
  {
    id: 'esthetic',
    label: 'home_beauty.categories.esthetic.label',
    image: '/images/home/categories/care-category.png',
  },
  {
    id: 'waxing',
    label: 'home_beauty.categories.waxing.label',
    image: '/images/home/categories/wax-category.png',
  },
  {
    id: 'makeup',
    label: 'home_beauty.categories.makeup.label',
    image: '/images/home/categories/makeup-category.png',
  },
  {
    id: 'lash',
    label: 'home_beauty.categories.lash.label',
    image: '/images/home/categories/lash-category.png',
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

export const BEAUTY_STORE_ITEMS: BeautyStore[] = [
  {
    id: 'beauty_hair_1',
    name: '라프메종 헤어 강남',
    category: 'hair',
    region: 'gangnam',
    rating: 4.9,
    reviewCount: 218,
    priceLabel: '커트 55,000원~',
    shortDescription: '레이어드 컷과 자연스러운 컬러 상담이 강점인 프리미엄 헤어 스튜디오입니다.',
    tags: ['디자인 컷', '퍼스널 컬러', '두피 케어'],
  },
  {
    id: 'beauty_hair_2',
    name: '아틀리에 성수 헤어룸',
    category: 'hair',
    region: 'seongsu',
    rating: 4.8,
    reviewCount: 164,
    priceLabel: '볼륨 펌 120,000원~',
    shortDescription: '볼륨 펌과 스타일 체인지 상담을 차분하게 진행하는 프라이빗 헤어룸입니다.',
    tags: ['볼륨 펌', '프라이빗', '스타일 상담'],
  },
  {
    id: 'beauty_nail_1',
    name: '메종 네일 홍대',
    category: 'nail',
    region: 'hongdae',
    rating: 4.8,
    reviewCount: 137,
    priceLabel: '젤 네일 79,000원~',
    shortDescription: '트렌디한 컬러 조합과 시즌 아트가 강한 네일 전문 스튜디오입니다.',
    tags: ['이달의 아트', '젤 케어', '컬러 큐레이션'],
  },
  {
    id: 'beauty_nail_2',
    name: '베이지 네일 잠실',
    category: 'nail',
    region: 'jamsil',
    rating: 4.7,
    reviewCount: 92,
    priceLabel: '케어 45,000원~',
    shortDescription: '모던한 분위기에서 꼼꼼한 기본 케어와 웨딩 네일을 전문으로 합니다.',
    tags: ['웨딩 네일', '심플 무드', '프리미엄 케어'],
  },
];

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

export const DESIGNERS_BY_STORE: Record<string, BeautyDesigner[]> = {
  beauty_hair_1: [{ id: 'd1', name: '지아 디자이너' }],
  beauty_hair_2: [{ id: 'd2', name: '하린 디자이너' }],
};

export const PRIMARY_SERVICES_BY_CATEGORY: Record<string, BeautyServiceOption[]> = {
  hair: [{ id: 's1', name: '여성 컷', price: 55000 }],
  nail: [{ id: 's2', name: '젤 네일', price: 79000 }],
};

export const BEAUTY_AVAILABILITY_BY_STORE: Record<string, Record<number, string[]>> = {};

