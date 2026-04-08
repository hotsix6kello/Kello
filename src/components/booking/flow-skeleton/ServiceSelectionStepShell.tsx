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
  isCategoryLocked?: boolean;
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
  const showCategorySelector = !selectedCategory;

  const content = (
    <div className="bg-white">
      {showCategorySelector ? (
        <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
          {categories.map((category) => {
            const isSelected = category.id === selectedCategory;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory?.(category.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isSelected
                    ? "bg-fuchsia-600 text-white shadow-[0_10px_24px_rgba(192,38,211,0.18)]"
                    : "bg-neutral-100 text-neutral-700 hover:bg-fuchsia-50 hover:text-fuchsia-700"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {serviceMenu ? (
        <div className="py-3">
          {serviceMenu.sections.map((section) => (
            <div key={section.id} className="pb-3 last:pb-0">
              {serviceMenu.sections.length > 1 ? (
                <div className="mb-2 px-1">
                  <h3 className="text-sm font-semibold text-neutral-900">{section.title}</h3>
                </div>
              ) : null}

              {section.items.length === 0 ? (
                <p className="px-1 text-sm text-neutral-500">
                  표시할 시술이 아직 준비되지 않았습니다.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {section.items.map((item) => {
                    const isSelected = item.id === selectedServiceId;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectService?.(item.id)}
                        aria-pressed={isSelected}
                        className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
                          isSelected
                            ? "border-fuchsia-500 bg-fuchsia-50 shadow-[0_10px_24px_rgba(192,38,211,0.08)]"
                            : "border-neutral-200 bg-white hover:border-fuchsia-300 hover:bg-fuchsia-50/40"
                        }`}
                      >
                        <p
                          className={`text-[15px] font-semibold leading-6 ${
                            isSelected ? "text-fuchsia-700" : "text-neutral-950"
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-neutral-600">
                          {item.description}
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
        <div className="py-5 text-sm text-neutral-500">
          카테고리를 선택하면 시술 목록이 바로 나타납니다.
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <BookingFlowStepFrame
      eyebrow="STEP 1"
      title="서비스 선택"
      description="원하는 시술을 먼저 고른 뒤 다음 단계에서 예약 정보를 입력하세요."
    >
      {content}
    </BookingFlowStepFrame>
  );
}
