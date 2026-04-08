import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import type {
  BookingFlowCategory,
  BookingFlowCategoryConfig,
  BookingServiceMenuConfig,
} from "@/lib/bookings/bookingFlowSkeleton/types";

type ServiceSelectionStepShellProps = {
  categories: BookingFlowCategoryConfig[];
  selectedCategory: BookingFlowCategory | null;
  serviceMenu: BookingServiceMenuConfig | null;
  selectedServiceId: string | null;
  onSelectCategory?: (category: BookingFlowCategory) => void;
  onSelectService?: (serviceId: string) => void;
};

export function ServiceSelectionStepShell({
  categories,
  selectedCategory,
  serviceMenu,
  selectedServiceId,
  onSelectCategory,
  onSelectService,
}: ServiceSelectionStepShellProps) {
  return (
    <BookingFlowStepFrame
      eyebrow="Step 1"
      title="Service selection"
      description="This skeleton starts from category and service menu selection. Store selection stays out of the new step order."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isSelected = category.id === selectedCategory;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory?.(category.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isSelected
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-neutral-700"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        {serviceMenu ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
              <p className="text-sm font-medium text-neutral-800">{serviceMenu.title}</p>
              <p className="mt-1 text-sm text-neutral-600">{serviceMenu.description}</p>
              {serviceMenu.sections.some((section) => section.items.length > 0) ? (
                <p className="mt-2 text-sm text-neutral-500">
                  Select one service to enable the next step.
                </p>
              ) : null}
            </div>

            {serviceMenu.sections.map((section) => (
              <section key={section.id} className="rounded-2xl border border-neutral-200 p-4">
                <h3 className="text-sm font-semibold text-neutral-800">{section.title}</h3>
                {section.items.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-500">
                    Menu items are intentionally empty in this turn. Category-specific data will be filled later.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2">
                    {section.items.map((item) => {
                      const isSelected = item.id === selectedServiceId;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectService?.(item.id)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-200 bg-white text-neutral-800"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{item.title}</div>
                              <div className="mt-1 text-sm opacity-80">{item.description}</div>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                isSelected
                                  ? "bg-white/15 text-white"
                                  : "bg-neutral-100 text-neutral-500"
                              }`}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
            Select a category to load the matching service menu config skeleton.
          </div>
        )}
      </div>
    </BookingFlowStepFrame>
  );
}
