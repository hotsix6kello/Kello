import { getLocaleDisplayLabel } from "@/lib/translator/catalog.ts";
import type { ConciergeLocale, InterpreterTurnResponse } from "@/lib/translator/types.ts";

import { getConversationHistoryView } from "./viewModel";

interface ConversationHistoryListProps {
  turns: InterpreterTurnResponse[];
  onReplay: (text: string, locale: ConciergeLocale) => void;
}

function getSpeakerLabel(speaker: InterpreterTurnResponse["speaker"]) {
  return speaker === "customer" ? "Customer" : "Staff";
}

export function ConversationHistoryList({ turns, onReplay }: ConversationHistoryListProps) {
  const view = getConversationHistoryView(turns);
  const latestPlaybackText = view.latestTurn
    ? (view.latestTurn.fallbackToText ? view.latestTurn.originalText : view.latestTurn.translatedText)
    : null;
  const latestPlaybackLocale = view.latestTurn
    ? (view.latestTurn.fallbackToText ? view.latestTurn.sourceLocale : view.latestTurn.targetLocale)
    : null;

  return (
    <div className="grid gap-4">
      <section className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-white/60">Translation Panel</div>
            <h4 className="text-xl font-black tracking-[-0.03em]">Latest turn</h4>
          </div>
          {view.latestTurn && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                {getSpeakerLabel(view.latestTurn.speaker)}
              </span>
              {view.latestTurn.fallbackToText && (
                <span className="rounded-full bg-amber-300/20 px-3 py-1 text-xs font-bold text-amber-100">
                  Original shown
                </span>
              )}
            </div>
          )}
        </div>

        {!view.latestTurn ? (
          <p className="text-sm leading-6 text-white/70">
            No translation yet. Use one large speech button or tap a quick phrase to start.
          </p>
        ) : (
          <div className="grid gap-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/75">
              {getLocaleDisplayLabel(view.latestTurn.sourceLocale)} to {getLocaleDisplayLabel(view.latestTurn.targetLocale)}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-[24px] bg-white/8 p-4">
                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Original</div>
                <p className="whitespace-pre-wrap break-words text-[15px] font-semibold leading-7 text-white">
                  {view.latestTurn.originalText}
                </p>
                <button
                  type="button"
                  className="mt-4 min-h-[44px] rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/90"
                  onClick={() => onReplay(view.latestTurn.originalText, view.latestTurn.sourceLocale)}
                >
                  Play original
                </button>
              </article>

              <article className="rounded-[24px] bg-teal-600/20 p-4">
                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-100/80">Translated</div>
                <p className="whitespace-pre-wrap break-words text-[15px] font-semibold leading-7 text-white">
                  {view.latestTurn.translatedText}
                </p>
                <button
                  type="button"
                  className="mt-4 min-h-[44px] rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950"
                  onClick={() => {
                    if (latestPlaybackText && latestPlaybackLocale) {
                      onReplay(latestPlaybackText, latestPlaybackLocale);
                    }
                  }}
                >
                  {view.latestTurn.fallbackToText ? 'Play shown text' : 'Play translation'}
                </button>
              </article>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Conversation History</div>
            <h4 className="text-xl font-black tracking-[-0.03em] text-slate-950">Recent turns</h4>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {view.turnCountLabel}
          </span>
        </div>

        {view.isEmpty ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Original and translated turns will appear here.
          </div>
        ) : (
          <div className="grid gap-3">
            {turns.map((turn) => (
              <article key={turn.turnId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${
                        turn.speaker === "customer" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {getSpeakerLabel(turn.speaker)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {getLocaleDisplayLabel(turn.sourceLocale)} to {getLocaleDisplayLabel(turn.targetLocale)}
                    </span>
                    {turn.fallbackToText && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
                        Original shown
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(turn.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-white p-3">
                    <div className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Original</div>
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-900">
                      {turn.originalText}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-3">
                    <div className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Translated</div>
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-900">
                      {turn.translatedText}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
