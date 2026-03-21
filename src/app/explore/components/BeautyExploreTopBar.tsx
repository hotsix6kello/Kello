'use client';

import { useRouter } from 'next/navigation';

type BeautyExploreTopBarProps = {
  title: string;
  fallbackHref?: string;
  backLabel?: string;
};

export default function BeautyExploreTopBar({
  title,
  fallbackHref = '/',
  backLabel = '뒤로',
}: BeautyExploreTopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-black/6 bg-white/92 px-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur md:-mx-6 md:px-6">
      <div className="mx-auto flex min-h-16 max-w-[1120px] items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100"
          aria-label={`${backLabel} ${title}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>{backLabel}</span>
        </button>

        <div className="min-w-0 flex-1 px-3 text-right">
          <p className="break-words text-base font-extrabold tracking-[-0.03em] text-neutral-950">{title}</p>
        </div>
      </div>
    </div>
  );
}
