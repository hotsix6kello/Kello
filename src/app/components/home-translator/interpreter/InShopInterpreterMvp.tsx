'use client';

import { useEffect, useMemo, useState } from 'react';

import { getLocaleDisplayLabel, getSpeechLocale } from '@/lib/translator/catalog.ts';
import {
  getCompletedTranslationStatusMessage,
  getEmptyInterpreterInputMessage,
  getTranscriptionFallbackStatusMessage,
  normalizeInterpreterTextInput,
} from '@/lib/translator/interpreterUi.ts';
import { getSalonQuickPhraseGroups } from '@/lib/translator/salonGlossary.ts';
import type {
  ConciergeLocale,
  InterpreterSession,
  InterpreterSttResponse,
  InterpreterTurnResponse,
  SpeakerRole,
} from '@/lib/translator/types.ts';

import { ConversationHistoryList } from './ConversationHistoryList';
import { useInterpreterHistory } from './hooks/useInterpreterHistory';
import { usePushToTalkRecorder } from './hooks/usePushToTalkRecorder';
import { InterpreterHeader } from './InterpreterHeader';
import { LanguageSelectorRow } from './LanguageSelectorRow';
import { mergeInterpreterHistory } from './storage';
import { SpeakerControlCard } from './SpeakerControlCard';

const DEFAULT_CUSTOMER_LOCALE: ConciergeLocale = 'en';
const DEFAULT_STAFF_LOCALE: ConciergeLocale = 'ko';

function getReplayPayload(turn: InterpreterTurnResponse) {
  if (turn.fallbackToText) {
    return {
      text: turn.originalText,
      locale: turn.sourceLocale,
    };
  }

  return {
    text: turn.translatedText,
    locale: turn.targetLocale,
  };
}

export default function InShopInterpreterMvp() {
  const [customerLocale, setCustomerLocale] = useState<ConciergeLocale>(DEFAULT_CUSTOMER_LOCALE);
  const [staffLocale, setStaffLocale] = useState<ConciergeLocale>(DEFAULT_STAFF_LOCALE);
  const [session, setSession] = useState<InterpreterSession | null>(null);
  const [drafts, setDrafts] = useState<Record<SpeakerRole, string>>({ customer: '', staff: '' });
  const [busyRole, setBusyRole] = useState<SpeakerRole | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const { turns, setTurns } = useInterpreterHistory(customerLocale, staffLocale);
  const { voiceSupported, recordingRole, startRecording, stopRecording } = usePushToTalkRecorder({
    onRecorded: async (speaker, audioBlob) => {
      await submitVoiceTurn(speaker, audioBlob);
    },
    onStatusChange: setStatusText,
    onError: setErrorText,
  });

  useEffect(() => {
    setErrorText(null);
    setStatusText('Preparing an interpreter session.');
    void createSession(customerLocale, staffLocale);
  }, [customerLocale, staffLocale]);

  async function createSession(nextCustomerLocale: ConciergeLocale, nextStaffLocale: ConciergeLocale) {
    try {
      const response = await fetch('/api/translator/interpreter/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerLocale: nextCustomerLocale,
          staffLocale: nextStaffLocale,
        }),
      });

      const data = (await response.json()) as InterpreterSession | { error: string };
      if ('error' in data) {
        setErrorText(data.error);
        setStatusText(null);
        return;
      }

      setSession(data);
      setStatusText('Interpreter session ready. Hold a button to speak, type a message, or tap a quick phrase.');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Interpreter session creation failed.');
      setStatusText(null);
    }
  }

  async function submitTextTurn(speaker: SpeakerRole, text: string) {
    if (!session) {
      setErrorText('Interpreter session is still starting. Try again in a moment.');
      return;
    }

    const normalizedText = normalizeInterpreterTextInput(text);
    if (!normalizedText) {
      setErrorText(getEmptyInterpreterInputMessage(speaker));
      setStatusText(null);
      return;
    }

    setBusyRole(speaker);
    setErrorText(null);
    setStatusText('Submitting text for translation.');

    try {
      const response = await fetch('/api/translator/interpreter/turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          ephemeralToken: session.ephemeralToken,
          speaker,
          inputMode: 'text',
          text: normalizedText,
        }),
      });

      const data = (await response.json()) as InterpreterTurnResponse | { error: string };
      if ('error' in data) {
        setErrorText(data.error);
        setBusyRole(null);
        setStatusText('Use text input or a quick phrase to try again.');
        return;
      }

      applyTurnResult(speaker, data);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Translation request failed.');
      setBusyRole(null);
      setStatusText('Use text input or a quick phrase to try again.');
    }
  }

  async function submitVoiceTurn(speaker: SpeakerRole, audioBlob: Blob) {
    if (!session) {
      setErrorText('Interpreter session is still starting. Try again in a moment.');
      return;
    }

    const speakerLocale = speaker === 'customer' ? customerLocale : staffLocale;
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', speakerLocale);

    setBusyRole(speaker);
    setErrorText(null);
    setStatusText('Uploading audio for transcription.');

    try {
      const response = await fetch('/api/translator/interpreter/stt', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as InterpreterSttResponse | { error: string };
      if ('error' in data) {
        setBusyRole(null);
        setErrorText(data.error);
        setStatusText(getTranscriptionFallbackStatusMessage());
        return;
      }

      setStatusText(data.fallbackUsed ? `Transcribed with backup STT (${data.engine}).` : `Transcription complete (${data.engine}).`);

      await submitInterpreterTurn({
        speaker,
        inputMode: 'voice',
        text: data.text,
      });
    } catch (error) {
      setBusyRole(null);
      setErrorText(error instanceof Error ? error.message : 'STT request failed.');
      setStatusText(getTranscriptionFallbackStatusMessage());
    }
  }

  async function submitInterpreterTurn(input: {
    speaker: SpeakerRole;
    inputMode: 'voice' | 'text';
    text: string;
  }) {
    if (!session) {
      return;
    }

    const normalizedText = normalizeInterpreterTextInput(input.text);
    if (!normalizedText) {
      setBusyRole(null);
      setErrorText(getEmptyInterpreterInputMessage(input.speaker));
      setStatusText(null);
      return;
    }

    try {
      const response = await fetch('/api/translator/interpreter/turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          ephemeralToken: session.ephemeralToken,
          speaker: input.speaker,
          inputMode: input.inputMode,
          text: normalizedText,
        }),
      });

      const data = (await response.json()) as InterpreterTurnResponse | { error: string };
      if ('error' in data) {
        setErrorText(data.error);
        setBusyRole(null);
        setStatusText('Use text input or a quick phrase to try again.');
        return;
      }

      applyTurnResult(input.speaker, data);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Translation request failed.');
      setBusyRole(null);
      setStatusText('Use text input or a quick phrase to try again.');
    }
  }

  function applyTurnResult(speaker: SpeakerRole, data: InterpreterTurnResponse) {
    setTurns((current) => mergeInterpreterHistory(current, data));
    setDrafts((current) => ({ ...current, [speaker]: '' }));
    setBusyRole(null);
    setStatusText(getCompletedTranslationStatusMessage(data.fallbackToText));
    const replayPayload = getReplayPayload(data);
    replay(replayPayload.text, replayPayload.locale);
  }

  function replay(text: string, locale: ConciergeLocale) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLocale(locale);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  const customerQuickPhraseGroups = useMemo(() => {
    return getSalonQuickPhraseGroups('customer', customerLocale);
  }, [customerLocale]);

  const staffQuickPhraseGroups = useMemo(() => {
    return getSalonQuickPhraseGroups('staff', staffLocale);
  }, [staffLocale]);

  return (
    <div className="grid gap-5">
      <InterpreterHeader />

      <LanguageSelectorRow
        customerLocale={customerLocale}
        staffLocale={staffLocale}
        session={session}
        onCustomerLocaleChange={setCustomerLocale}
        onStaffLocaleChange={setStaffLocale}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="grid gap-5">
          <SpeakerControlCard
            title="Customer"
            subtitle="The customer can speak or type in their own language. The app translates it for the Korean staff."
            accentClassName="bg-sky-100 text-sky-800"
            helperLabel={`${getLocaleDisplayLabel(customerLocale)} to ${getLocaleDisplayLabel(staffLocale)}`}
            voiceButtonLabel="Customer speech"
            inputPlaceholder="Type the customer's request here."
            draftValue={drafts.customer}
            isRecording={recordingRole === 'customer'}
            isBusy={busyRole === 'customer'}
            voiceSupported={voiceSupported}
            statusText={recordingRole === 'customer' || busyRole === 'customer' ? statusText : null}
            errorText={recordingRole === 'customer' || busyRole === 'customer' ? errorText : null}
            quickPhraseGroups={customerQuickPhraseGroups}
            onDraftChange={(value) => setDrafts((current) => ({ ...current, customer: value }))}
            onSendText={() => void submitTextTurn('customer', drafts.customer)}
            onQuickPhraseClick={(text) => void submitTextTurn('customer', text)}
            onPressStart={() => void startRecording('customer', Boolean(busyRole))}
            onPressEnd={stopRecording}
          />

          <SpeakerControlCard
            title="Staff"
            subtitle="The Korean staff can speak or type. The app translates each turn into the customer's language and plays it back."
            accentClassName="bg-amber-100 text-amber-900"
            helperLabel={`${getLocaleDisplayLabel(staffLocale)} to ${getLocaleDisplayLabel(customerLocale)}`}
            voiceButtonLabel="Staff speech"
            inputPlaceholder="Type the staff message here."
            draftValue={drafts.staff}
            isRecording={recordingRole === 'staff'}
            isBusy={busyRole === 'staff'}
            voiceSupported={voiceSupported}
            statusText={recordingRole === 'staff' || busyRole === 'staff' ? statusText : null}
            errorText={recordingRole === 'staff' || busyRole === 'staff' ? errorText : null}
            quickPhraseGroups={staffQuickPhraseGroups}
            onDraftChange={(value) => setDrafts((current) => ({ ...current, staff: value }))}
            onSendText={() => void submitTextTurn('staff', drafts.staff)}
            onQuickPhraseClick={(text) => void submitTextTurn('staff', text)}
            onPressStart={() => void startRecording('staff', Boolean(busyRole))}
            onPressEnd={stopRecording}
          />

          {(statusText || errorText) && (
            <div className="grid gap-2">
              {statusText && (
                <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">
                  {statusText}
                </div>
              )}
              {errorText && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {errorText}
                </div>
              )}
            </div>
          )}
        </div>

        <ConversationHistoryList turns={turns} onReplay={replay} />
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-600 shadow-soft">
        <span className="font-black text-slate-950">MVP architecture:</span> short audio upload or text submit,
        server STT, server translation, browser TTS, and local history caching. If voice fails, the interpreter
        continues with text input.
      </div>
    </div>
  );
}
