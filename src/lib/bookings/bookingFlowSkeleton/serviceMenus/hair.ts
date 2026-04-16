import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const hairServiceMenuConfig: BookingServiceMenuConfig = {
  category: "hair",
  title: "헤어 시술",
  description: "컷, 펌, 염색, 클리닉처럼 원하는 헤어 서비스를 먼저 골라보세요.",
  sections: [
    {
      id: "hair-services",
      title: "대표 헤어 메뉴",
      items: [
        {
          id: "cut",
          title: "컷",
          description: "기장 정리, 디자인 컷, 스타일 리프레시를 위한 기본 커트입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "perm",
          title: "펌",
          description: "웨이브, 볼륨, 컬 스타일 상담이 필요한 펌 시술입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "color",
          title: "염색",
          description: "뿌리 염색, 전체 컬러, 톤 체인지 상담이 포함된 컬러 시술입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "clinic",
          title: "클리닉",
          description: "손상 케어와 모발 컨디션 회복을 위한 트리트먼트 시술입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "styling",
          title: "스타일링",
          description: "드라이, 행사 스타일링, 마무리 손질이 필요한 예약입니다.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
