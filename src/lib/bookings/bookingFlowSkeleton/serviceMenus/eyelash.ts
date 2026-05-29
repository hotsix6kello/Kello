import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const eyelashServiceMenuConfig: BookingServiceMenuConfig = {
  category: "eyelash",
  title: "booking_skeleton.services.eyelash.section_title",
  description: "booking_skeleton.services.eyelash.section_desc",
  sections: [
    {
      id: "eyelash-services",
      title: "booking_skeleton.services.eyelash.section_title",
      items: [
        {
          id: "perm",
          title: "booking_skeleton.services.eyelash.perm_title",
          description: "booking_skeleton.services.eyelash.perm_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "extension",
          title: "booking_skeleton.services.eyelash.ext_title",
          description: "booking_skeleton.services.eyelash.ext_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "refill",
          title: "booking_skeleton.services.eyelash.refill_title",
          description: "booking_skeleton.services.eyelash.refill_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "removal",
          title: "booking_skeleton.services.eyelash.rem_title",
          description: "booking_skeleton.services.eyelash.rem_desc",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "care",
          title: "booking_skeleton.services.eyelash.care_title",
          description: "booking_skeleton.services.eyelash.care_desc",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
