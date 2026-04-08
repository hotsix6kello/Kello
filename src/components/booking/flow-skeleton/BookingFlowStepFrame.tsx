import type { ReactNode } from "react";

type BookingFlowStepFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function BookingFlowStepFrame({
  eyebrow,
  title,
  description,
  children,
}: BookingFlowStepFrameProps) {
  return (
    <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="mb-6 border-b border-neutral-100 pb-5">
        <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {eyebrow}
        </span>
        <h2 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.02em] text-neutral-950">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}
