import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const aestheticServiceMenuConfig: BookingServiceMenuConfig = {
  category: "aesthetic",
  title: "Aesthetic service menu",
  description: "Preview-only starter menu for the aesthetic flow skeleton.",
  sections: [
    {
      id: "aesthetic-services",
      title: "Aesthetic services",
      items: [
        {
          id: "basic-care",
          title: "Basic care",
          description: "General skin care booking for cleansing, hydration, and maintenance.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "acne-care",
          title: "Acne care",
          description: "Targeted care booking for acne-prone skin and pore concerns.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "calming",
          title: "Calming",
          description: "Soothing care booking for sensitive skin and redness relief.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "lifting",
          title: "Lifting",
          description: "Firming care booking for elasticity and contour-focused treatment.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "brightening",
          title: "Brightening",
          description: "Tone care booking for dullness and uneven skin tone concerns.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
