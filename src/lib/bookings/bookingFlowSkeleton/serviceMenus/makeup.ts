import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const makeupServiceMenuConfig: BookingServiceMenuConfig = {
  category: "makeup",
  title: "Makeup service menu",
  description: "Preview-only starter menu for the makeup flow skeleton.",
  sections: [
    {
      id: "makeup-services",
      title: "Makeup services",
      items: [
        {
          id: "daily",
          title: "Daily",
          description: "Natural daily makeup booking for light coverage and clean finish.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "interview",
          title: "Interview",
          description: "Interview makeup booking for neat, camera-safe presentation.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "wedding",
          title: "Wedding",
          description: "Wedding makeup booking for ceremony and long-wear styling.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "photoshoot",
          title: "Photoshoot",
          description: "Photoshoot makeup booking optimized for studio or outdoor lighting.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "special-event",
          title: "Special event",
          description: "Event makeup booking for parties, stage, or formal gatherings.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
