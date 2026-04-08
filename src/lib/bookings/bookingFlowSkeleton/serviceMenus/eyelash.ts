import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const eyelashServiceMenuConfig: BookingServiceMenuConfig = {
  category: "eyelash",
  title: "속눈썹 시술",
  description: "원하는 컬, 볼륨, 유지 관리 유형을 먼저 골라보세요.",
  sections: [
    {
      id: "eyelash-services",
      title: "대표 속눈썹 메뉴",
      items: [
        {
          id: "perm",
          title: "펌",
          description: "컬 리프트와 눈매 디자인 상담이 필요한 속눈썹 펌입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "extension",
          title: "연장",
          description: "길이, 볼륨, 스타일 방향을 정하는 속눈썹 연장입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "refill",
          title: "리필",
          description: "기존 연장 유지와 빈 부분 보완을 위한 리필 예약입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "removal",
          title: "제거",
          description: "기존 속눈썹 연장을 안전하게 제거하는 예약입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "care",
          title: "케어",
          description: "속눈썹 상태 점검과 사후 관리 안내 중심의 케어입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
