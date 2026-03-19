import type { SalonQuickPhraseGroup } from "@/lib/translator/salonGlossary.ts";

import { QuickPhrasePanel } from "./QuickPhrasePanel";
import { getSpeakerControlCardView } from "./viewModel";

interface SpeakerControlCardProps {
  title: string;
  subtitle: string;
  accentClassName: string;
  helperLabel: string;
  voiceButtonLabel: string;
  inputPlaceholder: string;
  draftValue: string;
  isRecording: boolean;
  isBusy: boolean;
  voiceSupported: boolean;
  statusText: string | null;
  errorText?: string | null;
  quickPhraseGroups: SalonQuickPhraseGroup[];
  onDraftChange: (value: string) => void;
  onSendText: () => void;
  onQuickPhraseClick: (text: string) => void;
  onPressStart: () => void;
  onPressEnd: () => void;
}

export function SpeakerControlCard(props: SpeakerControlCardProps) {
  const {
    title,
    subtitle,
    accentClassName,
    helperLabel,
    voiceButtonLabel,
    inputPlaceholder,
    draftValue,
    isRecording,
    isBusy,
    voiceSupported,
    statusText,
    errorText,
    quickPhraseGroups,
    onDraftChange,
    onSendText,
    onQuickPhraseClick,
    onPressStart,
    onPressEnd,
  } = props;

  const view = getSpeakerControlCardView({
    draftValue,
    isBusy,
    statusText,
  });

  return (
    <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid gap-2">
        <div
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${accentClassName}`}
        >
          {title}
        </div>
        <p className="text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>

      <div className="rounded-[26px] bg-gradient-to-br from-slate-950 via-teal-700 to-teal-600 px-5 py-5 text-white shadow-soft">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-white/65">Push to talk</div>
        <div className="mt-2 text-xl font-black">{helperLabel}</div>
        <p className="mt-2 text-sm leading-6 text-white/80">
          Hold to record. Release to send. If voice fails, type below or tap a quick phrase for instant translation.
        </p>
      </div>

      <button
        type="button"
        className={`min-h-[136px] rounded-[28px] px-6 py-5 text-left text-xl font-black text-white transition active:scale-[0.99] ${
          isRecording
            ? 'bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg'
            : 'bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500 shadow-soft'
        } ${!voiceSupported || isBusy ? 'opacity-60' : ''}`}
        onPointerDown={onPressStart}
        onPointerUp={onPressEnd}
        onPointerCancel={onPressEnd}
        onPointerLeave={() => {
          if (isRecording) {
            onPressEnd();
          }
        }}
        disabled={!voiceSupported || isBusy}
      >
        <span className="block text-xs font-black uppercase tracking-[0.2em] text-white/70">
          {isRecording ? 'Recording now' : 'Tap and hold'}
        </span>
        <span className="mt-3 block">{isRecording ? 'Release to send this turn' : voiceButtonLabel}</span>
        <span className="mt-4 block text-base font-semibold text-white/85">
          {voiceSupported ? 'Large touch target for in-shop use. Maximum 8 seconds.' : 'Voice unavailable. Use text input.'}
        </span>
      </button>

      <div className="grid gap-2">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          Quick phrases
        </div>
        <QuickPhrasePanel groups={quickPhraseGroups} onPhraseClick={onQuickPhraseClick} />
      </div>

      <div className="grid gap-3">
        <textarea
          className="min-h-[128px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-medium leading-7 text-slate-900"
          placeholder={inputPlaceholder}
          value={draftValue}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSendText();
            }
          }}
        />

        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-500">{view.statusText}</div>
          <button
            type="button"
            className="min-h-[52px] w-full rounded-2xl bg-slate-950 px-5 py-3 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            onClick={onSendText}
            disabled={view.translateDisabled}
          >
            {view.translateButtonLabel}
          </button>
        </div>
      </div>

      {errorText && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {errorText}
        </div>
      )}
      {!errorText && statusText && (
        <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">
          {statusText}
        </div>
      )}
      {!voiceSupported && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Voice recording is not available in this browser. Text input and quick phrases remain available.
        </div>
      )}
    </section>
  );
}
