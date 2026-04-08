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
                className={`rounded-full px-5 py-2.5 text-[15px] font-semibold transition ${isSelected
                    ? "bg-pink-50 border border-pink-500 text-pink-700"
                    : "bg-white border border-neutral-200 text-neutral-600 hover:border-pink-300 hover:text-pink-600"
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
                <div className="grid grid-cols-1 gap-2 pb-32">
                  {section.items.map((item) => {
                    const isSelected = item.id === selectedServiceId;

                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectService?.(item.id)}
                        className={`cursor-pointer w-full text-left p-5 mb-4 rounded-xl border-2 transition-all duration-200 outline-none ${
                          isSelected
                            ? "bg-pink-50 border-pink-500 border-2 shadow-md"
                            : "bg-white border-neutral-200 hover:border-pink-300"
                        }`}
                      >
                        <h3 className="text-lg font-bold text-neutral-900 mb-1">
                          {item.title}
                        </h3>
                        <p className="text-sm text-neutral-500 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
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
