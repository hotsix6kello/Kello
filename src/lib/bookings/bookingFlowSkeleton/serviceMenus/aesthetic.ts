import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const aestheticServiceMenuConfig: BookingServiceMenuConfig = {
  category: "aesthetic",
  title: "booking_skeleton.services.aesthetic.section_title",
  description: "booking_skeleton.services.aesthetic.section_desc",
  sections: [
    {
      id: "aesthetic-services",
      title: "booking_skeleton.services.aesthetic.section_title",
      items: [
        {
          id: "basic-care",
          title: "booking_skeleton.services.aesthetic.basic_title",
          description: "booking_skeleton.services.aesthetic.basic_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "acne-care",
          title: "booking_skeleton.services.aesthetic.trouble_title",
          description: "booking_skeleton.services.aesthetic.trouble_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "calming",
          title: "booking_skeleton.services.aesthetic.calming_title",
          description: "booking_skeleton.services.aesthetic.calming_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "lifting",
          title: "booking_skeleton.services.aesthetic.lifting_title",
          description: "booking_skeleton.services.aesthetic.lifting_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "brightening",
          title: "booking_skeleton.services.aesthetic.bright_title",
          description: "booking_skeleton.services.aesthetic.bright_desc",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
