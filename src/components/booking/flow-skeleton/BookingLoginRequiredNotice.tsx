'use client';

type BookingLoginRequiredNoticeProps = {
  title: string;
  description: string;
  ctaLabel: string;
  onCtaClick: () => void;
};

export function BookingLoginRequiredNotice({
  title,
  description,
  ctaLabel,
  onCtaClick,
}: BookingLoginRequiredNoticeProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[28px] border border-[#f1dce4] bg-white px-6 py-10 text-center shadow-[0_12px_40px_rgba(75,58,66,0.06)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-fuchsia-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-7 w-7 text-fuchsia-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-[17px] font-bold text-neutral-900">{title}</h3>
        <p className="text-[13px] leading-relaxed text-neutral-500">{description}</p>
      </div>

      <button
        type="button"
        onClick={onCtaClick}
        className="mt-2 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-fuchsia-600 px-8 text-[15px] font-bold text-white shadow-lg transition-colors hover:bg-fuchsia-700"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
