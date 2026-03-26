import { useTranslation } from "react-i18next";

export function InterpreterHeader() {
  const { t } = useTranslation('common');

  return (
    <div className="grid gap-3">
      <div className="inline-flex w-fit items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-teal-700">
        In-shop Translation MVP
      </div>
      <div className="grid gap-2">
        <h3 className="text-2xl font-black tracking-[-0.03em] text-slate-950">
          {t('interpreter_ui_v2.header_title')}
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {t('interpreter_ui_v2.header_desc')}
        </p>
      </div>
    </div>
  );
}
