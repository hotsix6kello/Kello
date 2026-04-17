'use client';

import { useTranslation } from "react-i18next";
import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import type {
  BookingFlowCategory,
  BookingFlowCategoryConfig,
  BookingServiceMenuConfig,
  BookingServiceMenuItem,
  BookingServiceMenuSection,
} from "@/lib/bookings/bookingFlowSkeleton/types";

const FALLBACK_MENUS: Record<string, { sections: BookingServiceMenuSection[] }> = {
  hair: {
    sections: [{
      id: "sec-hair",
      title: "booking_skeleton.services.hair.section_title",
      items: [
        { id: "hair-1", title: "booking_skeleton.services.hair.cut_title", description: "booking_skeleton.services.hair.cut_desc", durationMinutes: null, priceLabel: null },
        { id: "hair-2", title: "booking_skeleton.services.hair.perm_title", description: "booking_skeleton.services.hair.perm_desc", durationMinutes: null, priceLabel: null },
        { id: "hair-3", title: "booking_skeleton.services.hair.color_title", description: "booking_skeleton.services.hair.color_desc", durationMinutes: null, priceLabel: null },
        { id: "hair-4", title: "booking_skeleton.services.hair.clinic_title", description: "booking_skeleton.services.hair.clinic_desc", durationMinutes: null, priceLabel: null },
        { id: "hair-5", title: "booking_skeleton.services.hair.styling_title", description: "booking_skeleton.services.hair.styling_desc", durationMinutes: null, priceLabel: null },
      ],
    }],
  },
  nail: {
    sections: [{
      id: "sec-nail",
      title: "booking_skeleton.services.nail.section_title",
      items: [
        { id: "nail-1", title: "booking_skeleton.services.nail.care_title", description: "booking_skeleton.services.nail.care_desc", durationMinutes: null, priceLabel: null },
        { id: "nail-2", title: "booking_skeleton.services.nail.gel_title", description: "booking_skeleton.services.nail.gel_desc", durationMinutes: null, priceLabel: null },
        { id: "nail-3", title: "booking_skeleton.services.nail.art_title", description: "booking_skeleton.services.nail.art_desc", durationMinutes: null, priceLabel: null },
        { id: "nail-4", title: "booking_skeleton.services.nail.ext_title", description: "booking_skeleton.services.nail.ext_desc", durationMinutes: null, priceLabel: null },
        { id: "nail-5", title: "booking_skeleton.services.nail.rem_title", description: "booking_skeleton.services.nail.rem_desc", durationMinutes: null, priceLabel: null },
      ],
    }],
  },
  aesthetic: {
    sections: [{
      id: "sec-est",
      title: "booking_skeleton.services.aesthetic.section_title",
      items: [
        { id: "est-1", title: "booking_skeleton.services.aesthetic.basic_title", description: "booking_skeleton.services.aesthetic.basic_desc", durationMinutes: null, priceLabel: null },
        { id: "est-2", title: "booking_skeleton.services.aesthetic.trouble_title", description: "booking_skeleton.services.aesthetic.trouble_desc", durationMinutes: null, priceLabel: null },
        { id: "est-3", title: "booking_skeleton.services.aesthetic.calming_title", description: "booking_skeleton.services.aesthetic.calming_desc", durationMinutes: null, priceLabel: null },
        { id: "est-4", title: "booking_skeleton.services.aesthetic.lifting_title", description: "booking_skeleton.services.aesthetic.lifting_desc", durationMinutes: null, priceLabel: null },
        { id: "est-5", title: "booking_skeleton.services.aesthetic.bright_title", description: "booking_skeleton.services.aesthetic.bright_desc", durationMinutes: null, priceLabel: null },
      ],
    }],
  },
  eyelash: {
    sections: [{
      id: "sec-eye",
      title: "booking_skeleton.services.eyelash.section_title",
      items: [
        { id: "eye-1", title: "booking_skeleton.services.eyelash.perm_title", description: "booking_skeleton.services.eyelash.perm_desc", durationMinutes: null, priceLabel: null },
        { id: "eye-2", title: "booking_skeleton.services.eyelash.ext_title", description: "booking_skeleton.services.eyelash.ext_desc", durationMinutes: null, priceLabel: null },
        { id: "eye-3", title: "booking_skeleton.services.eyelash.refill_title", description: "booking_skeleton.services.eyelash.refill_desc", durationMinutes: null, priceLabel: null },
        { id: "eye-4", title: "booking_skeleton.services.eyelash.rem_title", description: "booking_skeleton.services.eyelash.rem_desc", durationMinutes: null, priceLabel: null },
        { id: "eye-5", title: "booking_skeleton.services.eyelash.care_title", description: "booking_skeleton.services.eyelash.care_desc", durationMinutes: null, priceLabel: null },
      ],
    }],
  },
  makeup: {
    sections: [{
      id: "sec-mk",
      title: "booking_skeleton.services.makeup.section_title",
      items: [
        { id: "mk-1", title: "booking_skeleton.services.makeup.daily_title", description: "booking_skeleton.services.makeup.daily_desc", durationMinutes: null, priceLabel: null },
        { id: "mk-2", title: "booking_skeleton.services.makeup.interview_title", description: "booking_skeleton.services.makeup.interview_desc", durationMinutes: null, priceLabel: null },
        { id: "mk-3", title: "booking_skeleton.services.makeup.wedding_title", description: "booking_skeleton.services.makeup.wedding_desc", durationMinutes: null, priceLabel: null },
        { id: "mk-4", title: "booking_skeleton.services.makeup.shooting_title", description: "booking_skeleton.services.makeup.shooting_desc", durationMinutes: null, priceLabel: null },
        { id: "mk-5", title: "booking_skeleton.services.makeup.special_title", description: "booking_skeleton.services.makeup.special_desc", durationMinutes: null, priceLabel: null },
      ],
    }],
  },
  waxing: {
    sections: [{
      id: "sec-wax",
      title: "booking_skeleton.services.waxing.section_title",
      items: [
        { id: "wax-1", title: "booking_skeleton.services.waxing.brazilian_title", description: "booking_skeleton.services.waxing.brazilian_desc", durationMinutes: null, priceLabel: null },
        { id: "wax-2", title: "booking_skeleton.services.waxing.arm_title", description: "booking_skeleton.services.waxing.arm_desc", durationMinutes: null, priceLabel: null },
        { id: "wax-3", title: "booking_skeleton.services.waxing.leg_title", description: "booking_skeleton.services.waxing.leg_desc", durationMinutes: null, priceLabel: null },
        { id: "wax-4", title: "booking_skeleton.services.waxing.face_title", description: "booking_skeleton.services.waxing.face_desc", durationMinutes: null, priceLabel: null },
        { id: "wax-5", title: "booking_skeleton.services.waxing.body_title", description: "booking_skeleton.services.waxing.body_desc", durationMinutes: null, priceLabel: null },
      ],
    }],
  },
};

type ServiceSelectionStepShellProps = {
  categories: BookingFlowCategoryConfig[];
  selectedCategory: BookingFlowCategory | null;
  serviceMenu: BookingServiceMenuConfig | null;
  selectedServiceId: string | null;
  embedded?: boolean;
  onSelectCategory?: (category: BookingFlowCategory) => void;
  onSelectService?: (serviceId: string) => void;
};

export function ServiceSelectionStepShell({
  categories,
  selectedCategory,
  serviceMenu,
  selectedServiceId,
  embedded = false,
  onSelectCategory,
  onSelectService,
}: ServiceSelectionStepShellProps) {
  const { t } = useTranslation("common");

  const effectiveCategoryId = selectedCategory;
  const effectiveMenu = serviceMenu || (effectiveCategoryId ? FALLBACK_MENUS[effectiveCategoryId as string] : null);

  const content = (
    <div className="w-full">
      {!selectedCategory && (
        <div className="flex flex-wrap gap-4 pb-12">
          {categories.map((category) => {
            const isSelected = category.id === selectedCategory;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory?.(category.id)}
                className={`flex items-center justify-between p-6 rounded-[24px] border-[1.5px] transition-all duration-300 ${
                  isSelected
                    ? "bg-[#ffe3ec]/30 border-[#f45b87] shadow-[0_8px_20px_rgba(244,91,135,0.06)]"
                    : "bg-white border-[#f1dce4] text-[#4b3a42] hover:border-[#e4cbd6] shadow-[0_4px_12px_rgba(75,58,66,0.03)]"
                }`}
              >
                <span className="text-[17px] font-extrabold">{t(category.label)}</span>
              </button>
            );
          })}
        </div>
      )}

      {effectiveMenu ? (
        <div className="flex flex-col gap-5 pb-8">
          {effectiveMenu.sections.map((section: BookingServiceMenuSection) => (
            <div key={section.id} className="flex flex-col gap-4">
              {effectiveMenu.sections.length > 1 && (
                <div className="mt-2 mb-1">
                  <h3 className="text-[16px] font-black text-[#4b3a42] px-1 uppercase tracking-tight opacity-90">{t(section.title)}</h3>
                </div>
              )}

              {section.items.length === 0 ? (
                <p className="px-1 text-sm text-[#af98a1] font-medium">
                  {t("booking_skeleton.service_selection.no_menu")}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {section.items.map((item: BookingServiceMenuItem) => {
                    const isSelected = item.id === selectedServiceId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectService?.(item.id)}
                        className={`w-full text-left p-6 rounded-[24px] border-[1.5px] transition-all duration-300 ${
                          isSelected
                            ? "bg-white border-[#f45b87] shadow-[0_12px_30px_rgba(244,91,135,0.08)]"
                            : "bg-white border-[#f1dce4] hover:border-[#e4cbd6] shadow-[0_4px_12px_rgba(75,58,66,0.03)]"
                        }`}
                      >
                        <h3 className={`text-[19px] font-extrabold tracking-tight transition-colors ${isSelected ? "text-[#f45b87]" : "text-[#4b3a42]"}`}>
                          {t(item.title)}
                        </h3>
                        <p className={`text-[14px] leading-relaxed transition-colors ${isSelected ? "text-[#f45b87]/80" : "text-[#8d747d]"} font-medium`}>
                          {t(item.description)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
          <p className="text-neutral-400 font-medium">{t("booking_skeleton.service_selection.select_category_first")}</p>
        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <BookingFlowStepFrame
      eyebrow={`${t("booking_skeleton.steps.step")} 1`}
      title={t("booking_skeleton.service_selection.title")}
      description={t("booking_skeleton.service_selection.desc")}
    >
      {content}
    </BookingFlowStepFrame>
  );
}
