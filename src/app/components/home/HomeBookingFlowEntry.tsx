'use client';

import type { TFunction } from "i18next";
import type { BeautyCategoryId } from "./constants";
import HomeBeautyBookingFlow from "./HomeBeautyBookingFlow";

type HomeBookingFlowEntryProps = {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: BeautyCategoryId | "all" | null;
  t: TFunction;
};

export default function HomeBookingFlowEntry({
  isOpen,
  onClose,
  initialCategory,
  t,
}: HomeBookingFlowEntryProps) {
  // The deprecated skeleton booking prototype is no longer used as the home booking route.
  return (
    <HomeBeautyBookingFlow
      isOpen={isOpen}
      onClose={onClose}
      initialCategory={initialCategory === "all" ? null : initialCategory}
      t={t}
    />
  );
}
