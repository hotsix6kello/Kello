import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const nailServiceMenuConfig: BookingServiceMenuConfig = {
  category: "nail",
  title: "booking_skeleton.services.nail.section_title",
  description: "booking_skeleton.services.nail.section_desc",
  sections: [
    {
      id: "nail-services",
      title: "booking_skeleton.services.nail.section_title",
      items: [
        {
          id: "care",
          title: "booking_skeleton.services.nail.care_title",
          description: "booking_skeleton.services.nail.care_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "gel",
          title: "booking_skeleton.services.nail.gel_title",
          description: "booking_skeleton.services.nail.gel_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "art",
          title: "booking_skeleton.services.nail.art_title",
          description: "booking_skeleton.services.nail.art_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "extension",
          title: "booking_skeleton.services.nail.ext_title",
          description: "booking_skeleton.services.nail.ext_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "removal",
          title: "booking_skeleton.services.nail.rem_title",
          description: "booking_skeleton.services.nail.rem_desc",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
