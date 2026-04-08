import { aestheticServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/serviceMenus/aesthetic";
import { eyelashServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/serviceMenus/eyelash";
import { hairServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/serviceMenus/hair";
import { makeupServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/serviceMenus/makeup";
import { nailServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/serviceMenus/nail";
import { waxingServiceMenuConfig } from "@/lib/bookings/bookingFlowSkeleton/serviceMenus/waxing";
import type {
  BookingFlowCategory,
  BookingServiceMenuConfig,
} from "@/lib/bookings/bookingFlowSkeleton/types";

export const BOOKING_FLOW_SERVICE_MENUS: Record<BookingFlowCategory, BookingServiceMenuConfig> = {
  hair: hairServiceMenuConfig,
  nail: nailServiceMenuConfig,
  aesthetic: aestheticServiceMenuConfig,
  eyelash: eyelashServiceMenuConfig,
  makeup: makeupServiceMenuConfig,
  waxing: waxingServiceMenuConfig,
};
