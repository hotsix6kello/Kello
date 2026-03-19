'use client';

import { useEffect, useMemo, useState } from 'react';

import type { ConciergeLocale, InterpreterTurnResponse } from '@/lib/translator/types.ts';

import { buildInterpreterHistoryKey, parseInterpreterHistory } from '../storage';

export function useInterpreterHistory(customerLocale: ConciergeLocale, staffLocale: ConciergeLocale) {
  const [turns, setTurns] = useState<InterpreterTurnResponse[]>([]);

  const historyKey = useMemo(
    () => buildInterpreterHistoryKey(customerLocale, staffLocale),
    [customerLocale, staffLocale],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = parseInterpreterHistory(window.localStorage.getItem(historyKey));
    setTurns(stored);
  }, [historyKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(historyKey, JSON.stringify(turns));
  }, [historyKey, turns]);

  return {
    historyKey,
    turns,
    setTurns,
  };
}
