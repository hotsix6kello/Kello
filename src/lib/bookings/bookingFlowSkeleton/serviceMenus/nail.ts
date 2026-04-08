import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const nailServiceMenuConfig: BookingServiceMenuConfig = {
  category: "nail",
  title: "네일 시술",
  description: "원하는 네일 스타일과 관리 유형을 먼저 선택해 주세요.",
  sections: [
    {
      id: "nail-services",
      title: "대표 네일 메뉴",
      items: [
        {
          id: "care",
          title: "케어",
          description: "쉐입 정리, 큐티클 관리, 깔끔한 마무리 중심의 기본 케어입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "gel",
          title: "젤",
          description: "원컬러와 유지력 중심의 젤 네일 시술입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "art",
          title: "아트",
          description: "심플 아트부터 디테일 아트까지 디자인 상담이 필요한 시술입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "extension",
          title: "연장",
          description: "길이와 쉐입 보정을 위한 네일 연장 시술입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "removal",
          title: "제거",
          description: "기존 젤, 아트, 연장 네일 제거가 필요한 예약입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
