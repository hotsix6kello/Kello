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
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {eyebrow}
        </span>
        <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
      {children}
    </section>
  );
}
