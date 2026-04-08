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
                className={`rounded-full px-5 py-2.5 text-[15px] font-semibold transition ${
                  isSelected
                    ? "bg-fuchsia-50 border border-fuchsia-500 text-fuchsia-700"
                    : "bg-white border border-neutral-200 text-neutral-600 hover:border-fuchsia-300 hover:text-fuchsia-600"
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
                        className={`w-full rounded-xl border px-5 py-4 text-left transition ${
                          isSelected
                            ? "border-fuchsia-500 bg-fuchsia-50"
                            : "border-neutral-100 bg-white hover:border-fuchsia-200"
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
