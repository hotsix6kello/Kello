import type { SalonQuickPhraseGroup } from "@/lib/translator/salonGlossary.ts";

import { getVisibleQuickPhraseGroups } from "./viewModel";

interface QuickPhrasePanelProps {
  groups: SalonQuickPhraseGroup[];
  onPhraseClick: (text: string) => void;
}

export function QuickPhrasePanel({ groups, onPhraseClick }: QuickPhrasePanelProps) {
  const visibleGroups = getVisibleQuickPhraseGroups(groups);

  if (visibleGroups.length === 0) {
    return (
      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm font-semibold leading-6 text-slate-600">
        Quick phrases are currently prepared for Korean, English, Japanese, and Simplified Chinese.
        Use voice or text input for the other supported languages.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {visibleGroups.map((group) => (
        <section
          key={group.category}
          className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 p-3"
        >
          <div className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 shadow-sm">
            {group.label}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {group.phrases.map((phrase) => (
              <button
                key={phrase.id}
                type="button"
                className="min-h-[60px] rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 text-left text-[15px] font-bold leading-6 text-orange-900 transition active:scale-[0.99] hover:border-orange-300 hover:bg-orange-100"
                onClick={() => onPhraseClick(phrase.text)}
              >
                {phrase.text}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
