export function InterpreterHeader() {
  return (
    <div className="grid gap-3">
      <div className="inline-flex w-fit items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-teal-700">
        In-shop Interpreter MVP
      </div>
      <div className="grid gap-2">
        <h3 className="text-2xl font-black tracking-[-0.03em] text-slate-950">
          Two-way interpreter for beauty salon conversations
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Customer and staff can speak face-to-face, see the original and translated text together, and replay the
          translated speech with browser TTS. If voice input fails, text fallback stays available.
        </p>
      </div>
    </div>
  );
}
