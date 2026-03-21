export type BeautyCategoryId = 'hair' | 'nail' | 'esthetic' | 'waxing' | 'makeup' | 'lash';

export type BeautyCategoryOption = {
  id: BeautyCategoryId;
  code: string;
  label: string;
  english: string;
  note: string;
  summary: string;
};

export const BEAUTY_CATEGORY_OPTIONS: BeautyCategoryOption[] = [
  {
    id: 'hair',
    code: 'HAIR',
    label: 'home_beauty.categories.hair.label',
    english: 'Hair',
    note: 'home_beauty.categories.hair.note',
    summary: 'home_beauty.categories.hair.summary',
  },
  {
    id: 'nail',
    code: 'NAIL',
    label: 'home_beauty.categories.nail.label',
    english: 'Nail',
    note: 'home_beauty.categories.nail.note',
    summary: 'home_beauty.categories.nail.summary',
  },
  {
    id: 'esthetic',
    code: 'CARE',
    label: 'home_beauty.categories.esthetic.label',
    english: 'Esthetic',
    note: 'home_beauty.categories.esthetic.note',
    summary: 'home_beauty.categories.esthetic.summary',
  },
  {
    id: 'waxing',
    code: 'WAX',
    label: 'home_beauty.categories.waxing.label',
    english: 'Waxing',
    note: 'home_beauty.categories.waxing.note',
    summary: 'home_beauty.categories.waxing.summary',
  },
  {
    id: 'makeup',
    code: 'MAKE',
    label: 'home_beauty.categories.makeup.label',
    english: 'Makeup',
    note: 'home_beauty.categories.makeup.note',
    summary: 'home_beauty.categories.makeup.summary',
  },
  {
    id: 'lash',
    code: 'LASH',
    label: 'home_beauty.categories.lash.label',
    english: 'Lash',
    note: 'home_beauty.categories.lash.note',
    summary: 'home_beauty.categories.lash.summary',
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

