import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const hairServiceMenuConfig: BookingServiceMenuConfig = {
  category: "hair",
  title: "Hair service menu",
  description: "Preview-only starter menu for the hair flow skeleton.",
  sections: [
    {
      id: "hair-services",
      title: "Hair services",
      items: [
        {
          id: "cut",
          title: "Cut",
          description: "Basic haircut booking for shape, trim, or style refresh.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "perm",
          title: "Perm",
          description: "General perm booking for curl, wave, or volume consultation.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "color",
          title: "Color",
          description: "Hair color booking for root touch-up, full color, or tone change.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "clinic",
          title: "Clinic",
          description: "Hair clinic or treatment booking for damage care and recovery.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "styling",
          title: "Styling",
          description: "Styling booking for blow-dry, event styling, or finishing touch.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
