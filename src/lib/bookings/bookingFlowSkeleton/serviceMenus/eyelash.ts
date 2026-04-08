import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const eyelashServiceMenuConfig: BookingServiceMenuConfig = {
  category: "eyelash",
  title: "Eyelash service menu",
  description: "Preview-only starter menu for the eyelash flow skeleton.",
  sections: [
    {
      id: "eyelash-services",
      title: "Eyelash services",
      items: [
        {
          id: "perm",
          title: "Perm",
          description: "Lash perm booking for curl lift and shape consultation.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "extension",
          title: "Extension",
          description: "Lash extension booking for length, volume, and style planning.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "refill",
          title: "Refill",
          description: "Refill booking to maintain extension density and balance.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "removal",
          title: "Removal",
          description: "Safe removal booking for existing lash extensions.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "care",
          title: "Care",
          description: "Lash care booking for condition check and aftercare guidance.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
