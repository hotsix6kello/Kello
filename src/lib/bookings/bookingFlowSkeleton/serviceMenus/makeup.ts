import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const makeupServiceMenuConfig: BookingServiceMenuConfig = {
  category: "makeup",
  title: "메이크업 시술",
  description: "방문 목적에 맞는 메이크업 스타일을 먼저 선택해 주세요.",
  sections: [
    {
      id: "makeup-services",
      title: "대표 메이크업 메뉴",
      items: [
        {
          id: "daily",
          title: "데일리",
          description: "가볍고 자연스러운 표현 중심의 데일리 메이크업입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "interview",
          title: "면접",
          description: "단정하고 또렷한 인상을 위한 면접 메이크업입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "wedding",
          title: "웨딩",
          description: "본식과 촬영을 고려한 지속력 중심의 웨딩 메이크업입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "photoshoot",
          title: "촬영",
          description: "스튜디오와 야외 촬영 조명에 맞춘 촬영 메이크업입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "special-event",
          title: "스페셜 이벤트",
          description: "행사, 파티, 무대 일정에 맞춘 포인트 메이크업입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
