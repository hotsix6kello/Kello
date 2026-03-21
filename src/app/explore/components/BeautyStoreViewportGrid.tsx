'use client';

type BeautyStoreViewportGridItem = {
  id: string;
  name: string;
  categoryLabel: string;
  regionLabel: string;
  rating: number;
  reviewCount: number;
  shortDescription: string;
  priceLabel: string;
  categoryKey: 'hair' | 'nail' | 'esthetic' | 'waxing' | 'makeup' | 'lash';
};

type BeautyStoreViewportGridProps = {
  stores: BeautyStoreViewportGridItem[];
  selectedStoreId: string | null;
  reviewLabel: string;
  selectLabel: string;
  reselectLabel: string;
  onSelectStore: (store: BeautyStoreViewportGridItem) => void;
};

const CATEGORY_THEME: Record<BeautyStoreViewportGridItem['categoryKey'], { bg: string; badge: string }> = {
  hair: { bg: 'from-stone-100 via-white to-rose-50', badge: 'bg-stone-900 text-white' },
  nail: { bg: 'from-pink-100 via-white to-rose-50', badge: 'bg-pink-600 text-white' },
  esthetic: { bg: 'from-amber-50 via-white to-orange-50', badge: 'bg-amber-700 text-white' },
  waxing: { bg: 'from-neutral-100 via-white to-lime-50', badge: 'bg-neutral-800 text-white' },
  makeup: { bg: 'from-rose-100 via-white to-fuchsia-50', badge: 'bg-rose-700 text-white' },
  lash: { bg: 'from-slate-100 via-white to-violet-50', badge: 'bg-slate-800 text-white' },
};

function getShortMark(name: string): string {
  return name
    .split(' ')
    .map((word) => word.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function BeautyStoreViewportGrid({
  stores,
  selectedStoreId,
  reviewLabel,
  selectLabel,
  reselectLabel,
  onSelectStore,
}: BeautyStoreViewportGridProps) {
  return (
    <section className="mt-4 overflow-y-auto pt-2 md:mt-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
        {stores.map((store) => {
          const isSelected = selectedStoreId === store.id;
          const theme = CATEGORY_THEME[store.categoryKey];

          return (
            <article
              key={store.id}
              className={[
                'min-h-0 rounded-[1.6rem] border border-gray-100 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.06)] transition-all',
                'h-[calc((100dvh-13.5rem)/2)] md:h-[calc((100dvh-16rem)/3)] xl:h-[calc((100dvh-18rem)/4)]',
                isSelected ? 'border-[#bb8a78]/40 ring-2 ring-[#bb8a78]/40' : '',
              ].join(' ')}
            >
              <button
                type="button"
                className="flex h-full w-full min-h-0 flex-col gap-3 p-3 text-left"
                aria-pressed={isSelected}
                aria-label={`${store.name} ${isSelected ? reselectLabel : selectLabel}`}
                onClick={() => onSelectStore(store)}
              >
                <div className={`relative aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br ${theme.bg}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_45%)]" />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.badge}`}>
                      {store.categoryLabel}
                    </span>
                  </div>
                  <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-lg font-black text-neutral-900 backdrop-blur">
                      {getShortMark(store.name)}
                    </div>
                    <div className="rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 backdrop-blur">
                      {store.regionLabel}
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="truncate text-[0.98rem] font-extrabold tracking-[-0.03em] text-neutral-950 md:text-[1.04rem]">
                      {store.name}
                    </h3>
                    <p className="text-[0.76rem] font-semibold text-neutral-700 md:text-[0.82rem]">
                      <span aria-hidden="true">★</span> {store.rating.toFixed(1)} / {reviewLabel} {store.reviewCount}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="truncate text-[0.78rem] font-medium text-neutral-500 md:text-sm">
                      {store.shortDescription}
                    </p>
                    <div className="inline-flex w-fit rounded-full border border-gray-100 bg-[#fffaf6] px-3 py-1 text-[0.72rem] font-bold text-neutral-800 md:text-xs">
                      {isSelected ? reselectLabel : selectLabel}
                    </div>
                  </div>
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
