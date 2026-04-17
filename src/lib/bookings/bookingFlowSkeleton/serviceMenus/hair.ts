import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const hairServiceMenuConfig: BookingServiceMenuConfig = {
  category: "hair",
  title: "booking_skeleton.services.hair.section_title",
  description: "booking_skeleton.services.hair.section_desc",
  sections: [
    {
      id: "hair-services",
      title: "booking_skeleton.services.hair.section_title",
      items: [
        {
          id: "cut",
          title: "booking_skeleton.services.hair.cut_title",
          description: "booking_skeleton.services.hair.cut_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "perm",
          title: "booking_skeleton.services.hair.perm_title",
          description: "booking_skeleton.services.hair.perm_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "color",
          title: "booking_skeleton.services.hair.color_title",
          description: "booking_skeleton.services.hair.color_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "clinic",
          title: "booking_skeleton.services.hair.clinic_title",
          description: "booking_skeleton.services.hair.clinic_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "styling",
          title: "booking_skeleton.services.hair.styling_title",
          description: "booking_skeleton.services.hair.styling_desc",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
