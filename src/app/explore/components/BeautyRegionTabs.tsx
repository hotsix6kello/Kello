'use client';

type BeautyRegionTabsItem = {
  id: string;
  label: string;
};

type BeautyRegionTabsProps = {
  items: BeautyRegionTabsItem[];
  selectedRegion: string | null;
  onSelect: (regionId: string) => void;
};

export default function BeautyRegionTabs({
  items,
  selectedRegion,
  onSelect,
}: BeautyRegionTabsProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 md:gap-3">
      {items.map((item) => {
        const isActive = selectedRegion === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={[
              'rounded-full border px-4 py-2.5 text-sm font-semibold transition-all',
              'focus:outline-none focus:ring-2 focus:ring-[#bb8a78]/30',
              'whitespace-nowrap min-h-[44px] flex items-center justify-center', // Mobile accessibility and layout
              isActive
                ? 'border-[#bb8a78] bg-[#fff7f2] text-[#8b5e4f] shadow-[0_8px_20px_rgba(187,138,120,0.18)]'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
            ].join(' ')}
            aria-pressed={isActive}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
