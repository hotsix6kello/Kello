import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const aestheticServiceMenuConfig: BookingServiceMenuConfig = {
  category: "aesthetic",
  title: "에스테틱 시술",
  description: "피부 고민에 맞는 관리 유형을 먼저 선택해 주세요.",
  sections: [
    {
      id: "aesthetic-services",
      title: "대표 에스테틱 메뉴",
      items: [
        {
          id: "basic-care",
          title: "기본 관리",
          description: "클렌징, 수분 공급, 기본 유지 관리 중심의 피부 케어입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "acne-care",
          title: "트러블 케어",
          description: "트러블 피부와 모공 고민에 집중한 관리입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "calming",
          title: "진정 케어",
          description: "예민한 피부와 붉은기를 완화하는 진정 중심 관리입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "lifting",
          title: "리프팅",
          description: "탄력과 윤곽 개선에 초점을 둔 리프팅 관리입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "brightening",
          title: "브라이트닝",
          description: "칙칙함과 톤 불균형 개선을 위한 환한 피부 관리입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
