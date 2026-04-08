import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const nailServiceMenuConfig: BookingServiceMenuConfig = {
  category: "nail",
  title: "Nail service menu",
  description: "Preview-only starter menu for the nail flow skeleton.",
  sections: [
    {
      id: "nail-services",
      title: "Nail services",
      items: [
        {
          id: "care",
          title: "Care",
          description: "Basic nail care for shaping, cuticle care, and clean finish.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "gel",
          title: "Gel",
          description: "Gel nail booking for one-color coverage and lasting finish.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "art",
          title: "Art",
          description: "Nail art booking for simple to detailed design consultation.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "extension",
          title: "Extension",
          description: "Nail extension booking for length and shape customization.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "removal",
          title: "Removal",
          description: "Removal booking for gel, art, or extension cleanup.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
