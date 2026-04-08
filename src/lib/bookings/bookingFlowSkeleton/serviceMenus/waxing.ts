import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const waxingServiceMenuConfig: BookingServiceMenuConfig = {
  category: "waxing",
  title: "왁싱 시술",
  description: "관리 부위를 먼저 선택한 뒤 다음 단계로 넘어가세요.",
  sections: [
    {
      id: "waxing-services",
      title: "대표 왁싱 메뉴",
      items: [
        {
          id: "brazilian",
          title: "브라질리언",
          description: "브라질리언 부위 중심의 집중 왁싱 예약입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "arms",
          title: "팔",
          description: "상완과 하완을 포함한 팔 왁싱 관리입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "legs",
          title: "다리",
          description: "종아리 또는 전체 다리 기준의 왁싱 예약입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "face",
          title: "페이스",
          description: "눈썹, 인중, 얼굴 부위 중심의 왁싱 관리입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "body",
          title: "바디",
          description: "등, 가슴, 원하는 바디 부위 상담형 왁싱입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
