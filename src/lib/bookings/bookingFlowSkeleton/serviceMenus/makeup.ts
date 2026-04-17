import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const makeupServiceMenuConfig: BookingServiceMenuConfig = {
  category: "makeup",
  title: "booking_skeleton.services.makeup.section_title",
  description: "booking_skeleton.services.makeup.section_desc",
  sections: [
    {
      id: "makeup-services",
      title: "booking_skeleton.services.makeup.section_title",
      items: [
        {
          id: "daily",
          title: "booking_skeleton.services.makeup.daily_title",
          description: "booking_skeleton.services.makeup.daily_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "interview",
          title: "booking_skeleton.services.makeup.interview_title",
          description: "booking_skeleton.services.makeup.interview_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "wedding",
          title: "booking_skeleton.services.makeup.wedding_title",
          description: "booking_skeleton.services.makeup.wedding_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "photoshoot",
          title: "booking_skeleton.services.makeup.shooting_title",
          description: "booking_skeleton.services.makeup.shooting_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "special-event",
          title: "booking_skeleton.services.makeup.special_title",
          description: "booking_skeleton.services.makeup.special_desc",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
