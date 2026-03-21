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
    label: '헤어',
    english: 'Hair',
    note: '커트, 펌, 염색, 드라이',
    summary: '스타일 체인지부터 가벼운 손질까지 가장 빠르게 예약을 시작할 수 있어요.',
  },
  {
    id: 'nail',
    code: 'NAIL',
    label: '네일',
    english: 'Nail',
    note: '젤네일, 케어, 연장',
    summary: '원하는 무드와 디자인을 정하고 가볍게 예약 단계로 넘어갈 수 있어요.',
  },
  {
    id: 'esthetic',
    code: 'CARE',
    label: '에스테틱',
    english: 'Esthetic',
    note: '피부관리, 윤곽, 진정 케어',
    summary: '피부 상태와 원하는 관리 목적에 맞춰 매장을 비교하고 예약할 수 있어요.',
  },
  {
    id: 'waxing',
    code: 'WAX',
    label: '왁싱',
    english: 'Waxing',
    note: '페이스, 바디, 브라질리언',
    summary: '부위와 일정에 맞는 매장을 빠르게 찾고 예약 흐름으로 이어집니다.',
  },
  {
    id: 'makeup',
    code: 'MAKE',
    label: '메이크업',
    english: 'Makeup',
    note: '데일리, 촬영, 웨딩',
    summary: '행사 일정에 맞는 메이크업 서비스를 선택하고 바로 예약을 시작할 수 있어요.',
  },
  {
    id: 'lash',
    code: 'LASH',
    label: '속눈썹',
    english: 'Lash',
    note: '연장, 펌, 언더래쉬',
    summary: '자연스러운 연장부터 볼륨 스타일링까지 원하는 메뉴로 바로 연결됩니다.',
  },
];

export const MOCK_PLACES = [
  { title: '롯데백화점 본점', area: '서울특별시 중구 남대문로 81', lat: 37.5647, lng: 126.9818 },
  { title: '롯데월드타워', area: '서울특별시 송파구 올림픽로 300', lat: 37.5125, lng: 127.1025 },
  { title: '롯데월드 어드벤처', area: '서울특별시 송파구 올림픽로 240', lat: 37.5111, lng: 127.0982 },
  { title: '롯데호텔 서울', area: '서울특별시 중구 을지로 30', lat: 37.5657, lng: 126.9808 },
  { title: '남산타워 (N서울타워)', area: '서울특별시 용산구 남산공원길 105', lat: 37.5512, lng: 126.9882 },
  { title: '남대문 시장', area: '서울특별시 중구 남대문시장4길 21', lat: 37.5591, lng: 126.9776 },
  { title: '경복궁', area: '서울특별시 종로구 사직로 161', lat: 37.5796, lng: 126.9770 },
  { title: '명동 예술극장', area: '서울특별시 중구 명동길 35', lat: 37.5645, lng: 126.9845 }
];

