import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const waxingServiceMenuConfig: BookingServiceMenuConfig = {
  category: "waxing",
  title: "booking_skeleton.services.waxing.section_title",
  description: "booking_skeleton.services.waxing.section_desc",
  sections: [
    {
      id: "waxing-services",
      title: "booking_skeleton.services.waxing.section_title",
      items: [
        {
          id: "brazilian",
          title: "booking_skeleton.services.waxing.brazilian_title",
          description: "booking_skeleton.services.waxing.brazilian_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "arms",
          title: "booking_skeleton.services.waxing.arm_title",
          description: "booking_skeleton.services.waxing.arm_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "legs",
          title: "booking_skeleton.services.waxing.leg_title",
          description: "booking_skeleton.services.waxing.leg_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "face",
          title: "booking_skeleton.services.waxing.face_title",
          description: "booking_skeleton.services.waxing.face_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "body",
          title: "booking_skeleton.services.waxing.body_title",
          description: "booking_skeleton.services.waxing.body_desc",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
