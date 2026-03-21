'use client';

import { useTranslation } from 'react-i18next';

type BeautyRegionTabsItem = {
  id: string;
  labelKey: string;
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
  const { t } = useTranslation('beauty_explore');

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
              isActive
                ? 'border-[#bb8a78] bg-[#fff7f2] text-[#8b5e4f] shadow-[0_8px_20px_rgba(187,138,120,0.18)]'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
            ].join(' ')}
            aria-pressed={isActive}
            data-label-key={item.labelKey}
            onClick={() => onSelect(item.id)}
          >
            {t(item.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
