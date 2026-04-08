import type { BookingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/types";

export const waxingServiceMenuConfig: BookingServiceMenuConfig = {
  category: "waxing",
  title: "Waxing service menu",
  description: "Preview-only starter menu for the waxing flow skeleton.",
  sections: [
    {
      id: "waxing-services",
      title: "Waxing services",
      items: [
        {
          id: "brazilian",
          title: "Brazilian",
          description: "Brazilian waxing booking for full intimate area care.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "arms",
          title: "Arms",
          description: "Arm waxing booking for smooth upper and lower arm care.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "legs",
          title: "Legs",
          description: "Leg waxing booking for half-leg or full-leg coverage.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "face",
          title: "Face",
          description: "Facial waxing booking for brow, lip, or full-face areas.",
          durationMinutes: null,
          priceLabel: null,
        },
        {
          id: "body",
          title: "Body",
          description: "Body waxing booking for back, chest, or custom areas.",
          durationMinutes: null,
          priceLabel: null,
        },
      ],
    },
  ],
};
