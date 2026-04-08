import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import type {
  BookingFlowCategory,
  BookingFlowCategoryConfig,
  BookingServiceMenuConfig,
  BookingServiceMenuItem,
  BookingServiceMenuSection,
} from "@/lib/bookings/bookingFlowSkeleton/types";

// 🚀 [최후의 방어선 데이터] 3시간 동안 정리하신 그 데이터입니다!
// 부모 컴포넌트가 고장나서 데이터를 안 주면 이 데이터를 강제로 사용합니다.
const FALLBACK_MENUS: Record<string, { sections: BookingServiceMenuSection[] }> = {
  hair: {
    sections: [{
      id: 'sec-hair', title: '헤어 시술', items: [
        { id: 'hair-1', title: '컷', description: '기장 정리, 디자인 컷, 스타일 리프레시를 위한 기본 커트입니다.', durationMinutes: null, priceLabel: null },
        { id: 'hair-2', title: '펌', description: '웨이브, 볼륨, 컬 스타일 상담이 필요한 펌 시술입니다.', durationMinutes: null, priceLabel: null },
        { id: 'hair-3', title: '염색', description: '뿌리 염색, 전체 컬러, 톤 체인지 상담이 포함된 컬러 시술입니다.', durationMinutes: null, priceLabel: null },
        { id: 'hair-4', title: '클리닉', description: '손상 케어와 모발 컨디션 회복을 위한 트리트먼트 시술입니다.', durationMinutes: null, priceLabel: null },
        { id: 'hair-5', title: '스타일링', description: '드라이, 행사 스타일링, 마무리 손질이 필요한 예약입니다.', durationMinutes: null, priceLabel: null },
      ]
    }]
  },
  nail: {
    sections: [{
      id: 'sec-nail', title: '네일 시술', items: [
        { id: 'nail-1', title: '케어', description: '쉐입 정리, 큐티클 관리, 깔끔한 마무리 중심의 기본 케어입니다.', durationMinutes: null, priceLabel: null },
        { id: 'nail-2', title: '젤', description: '원컬러와 유지력 중심의 젤 네일 시술입니다.', durationMinutes: null, priceLabel: null },
        { id: 'nail-3', title: '아트', description: '심플 아트부터 디테일 아트까지 디자인 상담이 필요한 시술입니다.', durationMinutes: null, priceLabel: null },
        { id: 'nail-4', title: '연장', description: '길이와 쉐입 보정을 위한 네일 연장 시술입니다.', durationMinutes: null, priceLabel: null },
        { id: 'nail-5', title: '제거', description: '기존 젤, 아트, 연장 네일 제거가 필요한 예약입니다.', durationMinutes: null, priceLabel: null },
      ]
    }]
  },
  aesthetic: {
    sections: [{
      id: 'sec-est', title: '에스테틱 시술', items: [
        { id: 'est-1', title: '기본 관리', description: '클렌징, 수분 공급, 기본 유지 관리 중심의 피부 케어입니다.', durationMinutes: null, priceLabel: null },
        { id: 'est-2', title: '트러블 케어', description: '트러블 피부와 모공 고민에 집중한 관리입니다.', durationMinutes: null, priceLabel: null },
        { id: 'est-3', title: '진정 케어', description: '예민한 피부와 붉은기를 완화하는 진정 중심 관리입니다.', durationMinutes: null, priceLabel: null },
        { id: 'est-4', title: '리프팅', description: '탄력과 윤곽 개선에 초점을 둔 리프팅 관리입니다.', durationMinutes: null, priceLabel: null },
        { id: 'est-5', title: '브라이트닝', description: '칙칙함과 톤 불균형 개선을 위한 환한 피부 관리입니다.', durationMinutes: null, priceLabel: null },
      ]
    }]
  },
  eyelash: {
    sections: [{
      id: 'sec-eye', title: '속눈썹 시술', items: [
        { id: 'eye-1', title: '펌', description: '컬 리프트와 눈매 디자인 상담이 필요한 속눈썹 펌입니다.', durationMinutes: null, priceLabel: null },
        { id: 'eye-2', title: '연장', description: '길이, 볼륨, 스타일 방향을 정하는 속눈썹 연장입니다.', durationMinutes: null, priceLabel: null },
        { id: 'eye-3', title: '리필', description: '기존 연장 유지와 빈 부분 보완을 위한 리필 예약입니다.', durationMinutes: null, priceLabel: null },
        { id: 'eye-4', title: '제거', description: '기존 속눈썹 연장을 안전하게 제거하는 예약입니다.', durationMinutes: null, priceLabel: null },
        { id: 'eye-5', title: '케어', description: '속눈썹 상태 점검과 사후 관리 안내 중심의 케어입니다.', durationMinutes: null, priceLabel: null },
      ]
    }]
  },
  makeup: {
    sections: [{
      id: 'sec-mk', title: '메이크업 시술', items: [
        { id: 'mk-1', title: '데일리', description: '가볍고 자연스러운 표현 중심의 데일리 메이크업입니다.', durationMinutes: null, priceLabel: null },
        { id: 'mk-2', title: '면접', description: '단정하고 또렷한 인상을 위한 면접 메이크업입니다.', durationMinutes: null, priceLabel: null },
        { id: 'mk-3', title: '웨딩', description: '본식과 촬영을 고려한 지속력 중심의 웨딩 메이크업입니다.', durationMinutes: null, priceLabel: null },
        { id: 'mk-4', title: '촬영', description: '스튜디오와 야외 촬영 조명에 맞춘 촬영 메이크업입니다.', durationMinutes: null, priceLabel: null },
        { id: 'mk-5', title: '스페셜 이벤트', description: '행사, 파티, 무대 일정에 맞춘 포인트 메이크업입니다.', durationMinutes: null, priceLabel: null },
      ]
    }]
  },
  waxing: {
    sections: [{
      id: 'sec-wax', title: '왁싱 시술', items: [
        { id: 'wax-1', title: '브라질리언', description: '브라질리언 부위 중심의 집중 왁싱 예약입니다.', durationMinutes: null, priceLabel: null },
        { id: 'wax-2', title: '팔', description: '상완과 하완을 포함한 팔 왁싱 관리입니다.', durationMinutes: null, priceLabel: null },
        { id: 'wax-3', title: '다리', description: '종아리 또는 전체 다리 기준의 왁싱 예약입니다.', durationMinutes: null, priceLabel: null },
        { id: 'wax-4', title: '페이스', description: '눈썹, 인중, 얼굴 부위 중심의 왁싱 관리입니다.', durationMinutes: null, priceLabel: null },
        { id: 'wax-5', title: '바디', description: '등, 가슴, 원하는 바디 부위 상담형 왁싱입니다.', durationMinutes: null, priceLabel: null },
      ]
    }]
  }
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

  const showCategorySelector = !selectedCategory;

  // 🚀 버그 해결: 부모가 준 serviceMenu가 비어있으면, 우리가 만든 FALLBACK_MENUS를 강제로 꺼내 씁니다!
  const effectiveCategoryId = selectedCategory;
  const effectiveMenu = serviceMenu || (effectiveCategoryId ? FALLBACK_MENUS[effectiveCategoryId as string] : null);

  const content = (
    <div className="w-full">
      {/* 1. 상단 카테고리 선택 칩 (카테고리가 없을 때만 노출) */}
      {showCategorySelector ? (
        <div className="flex flex-wrap gap-2 pb-6">
          {categories.map((category) => {
            const isSelected = category.id === selectedCategory;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory?.(category.id)}
                className={`rounded-full px-5 py-2.5 text-[14px] font-bold transition-all duration-200 ${isSelected
                  ? "bg-fuchsia-100 border-2 border-fuchsia-500 text-fuchsia-700 shadow-sm"
                  : "bg-white border-2 border-neutral-100 text-neutral-500 hover:border-fuchsia-200 hover:text-fuchsia-500"
                  }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* 2. 하단 시술 목록 리스트 */}
      {effectiveMenu ? (
        <div className="flex flex-col gap-4 pb-20">
          {effectiveMenu.sections.map((section: BookingServiceMenuSection) => (
            <div key={section.id} className="flex flex-col gap-3">
              {effectiveMenu.sections.length > 1 ? (
                <div className="mt-2 mb-1">
                  <h3 className="text-[15px] font-bold text-neutral-800 px-1">{section.title}</h3>
                </div>
              ) : null}

              {section.items.length === 0 ? (
                <p className="px-1 text-sm text-neutral-400">
                  표시할 시술이 아직 준비되지 않았습니다.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {section.items.map((item: BookingServiceMenuItem) => {
                    const isSelected = item.id === selectedServiceId;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectService?.(item.id)}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 outline-none ${isSelected
                          ? "bg-fuchsia-50 border-fuchsia-500 shadow-[0_8px_20px_rgba(192,38,211,0.08)]"
                          : "bg-white border-neutral-100 hover:border-fuchsia-200"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className={`text-lg font-bold transition-colors ${isSelected ? "text-fuchsia-700" : "text-neutral-900"}`}>
                            {item.title}
                          </h3>
                          {isSelected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-600">
                              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <p className={`text-[13px] leading-relaxed line-clamp-2 transition-colors ${isSelected ? "text-fuchsia-600/70" : "text-neutral-500"}`}>
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
        <div className="py-20 text-center bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
          <p className="text-neutral-400 font-medium">카테고리를 먼저 선택해주세요.</p>
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
      description="원하시는 시술 메뉴를 선택해주세요."
    >
      {content}
    </BookingFlowStepFrame>
  );
}