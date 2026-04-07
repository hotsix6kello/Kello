'use client';

type BeautyStoreCarouselItem = {
  id: string;
  name: string;
  categoryLabel: string;
  regionLabel: string;
  rating: number;
  reviewCount: number;
  shortDescription: string;
  priceLabel: string;
  tags: string[];
  categoryKey: 'hair' | 'nail' | 'esthetic' | 'waxing' | 'makeup' | 'lash';
};

type BeautyStoreCarouselProps = {
  stores: BeautyStoreCarouselItem[];
  selectedStoreId: string | null;
  reviewLabel: string;
  selectLabel: string;
  reselectLabel: string;
  onSelectStore: (store: BeautyStoreCarouselItem) => void;
};

const CATEGORY_THEMES: Record<BeautyStoreCarouselItem['categoryKey'], { bg: string; accent: string }> = {
  hair: { bg: 'from-stone-100 via-white to-rose-50', accent: 'bg-stone-900 text-white' },
  nail: { bg: 'from-pink-100 via-white to-rose-50', accent: 'bg-pink-600 text-white' },
  esthetic: { bg: 'from-amber-50 via-white to-orange-50', accent: 'bg-amber-700 text-white' },
  waxing: { bg: 'from-neutral-100 via-white to-lime-50', accent: 'bg-neutral-800 text-white' },
  makeup: { bg: 'from-rose-100 via-white to-fuchsia-50', accent: 'bg-rose-700 text-white' },
  lash: { bg: 'from-slate-100 via-white to-violet-50', accent: 'bg-slate-800 text-white' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function BeautyStoreCarousel({
  stores,
  selectedStoreId,
  reviewLabel,
  selectLabel,
  reselectLabel,
  onSelectStore,
}: BeautyStoreCarouselProps) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#fcf8f4] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#fcf8f4] to-transparent" />

      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-4 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stores.map((store) => {
          const isSelected = selectedStoreId === store.id;
          const theme = CATEGORY_THEMES[store.categoryKey];

          return (
            <article
              key={store.id}
              className={[
                'group relative min-w-0 shrink-0 snap-center overflow-hidden rounded-[28px] border bg-white/95 shadow-[0_18px_36px_rgba(73,48,33,0.08)] transition-all duration-200',
                'w-[84vw] max-w-[360px] sm:w-[380px] lg:w-[410px]',
                isSelected
                  ? 'border-[#7f4f46]/40 ring-2 ring-[#bb8a78]/35'
                  : 'border-[rgba(109,83,63,0.10)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(73,48,33,0.12)]',
              ].join(' ')}
            >
              <button
                type="button"
                className="block w-full text-left"
                aria-pressed={isSelected}
                aria-label={`${store.name} ${isSelected ? reselectLabel : selectLabel}`}
                onClick={() => onSelectStore(store)}
              >
                <div className={`relative h-52 w-full bg-gradient-to-br ${theme.bg}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_42%)]" />
                  <div className="absolute left-5 top-5 flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase ${theme.accent}`}>
                      {store.categoryLabel}
                    </span>
                    <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-medium text-neutral-600">
                      {store.regionLabel}
                    </span>
                  </div>

                  <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium tracking-[0.22em] text-neutral-500 uppercase">Beauty Partner</p>
                      <div className="mt-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-2xl font-black text-neutral-900 shadow-sm backdrop-blur">
                        {getInitials(store.name)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/78 px-4 py-3 text-right shadow-sm backdrop-blur">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">Starting</p>
                      <p className="mt-1 text-sm font-bold text-neutral-900">{store.priceLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 px-5 pb-5 pt-4">
                  <div className="space-y-2">
                    <h3 className="text-[1.35rem] font-black leading-tight tracking-[-0.03em] text-neutral-950">
                      {store.name}
                    </h3>
                    <p className="text-sm font-semibold text-neutral-700">
                      <span aria-hidden="true">★</span> {store.rating.toFixed(1)} / {reviewLabel} {store.reviewCount}
                    </p>
                  </div>

                  <p className="min-h-[48px] text-[0.95rem] font-medium leading-6 text-neutral-500">
                    {store.shortDescription}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {store.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[rgba(109,83,63,0.10)] bg-[#fffaf6] px-3 py-1 text-xs font-medium text-neutral-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="pt-1">
                    <span
                      className={[
                        'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition-colors',
                        isSelected
                          ? 'bg-[#7f4f46] text-[#fff9f5]'
                          : 'border border-[rgba(109,83,63,0.10)] bg-[#fffaf6] text-neutral-800',
                      ].join(' ')}
                    >
                      {isSelected ? reselectLabel : selectLabel}
                    </span>
                  </div>
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
