import type { GlossaryEntry } from "./types.ts";

interface GlossaryToken {
  token: string;
  sourceTerm: string;
  targetTerm: string;
}

export function sortGlossaryEntries(entries: GlossaryEntry[]) {
  return [...entries]
    .filter((entry) => entry.isActive)
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return right.sourceTerm.length - left.sourceTerm.length;
    });
}

export function injectGlossaryTokens(text: string, entries: GlossaryEntry[]) {
  const tokens: GlossaryToken[] = [];
  let tokenizedText = text;

  sortGlossaryEntries(entries).forEach((entry, index) => {
    if (!tokenizedText.includes(entry.sourceTerm)) {
      return;
    }

    const token = `__KELLO_TERM_${index}__`;
    tokenizedText = tokenizedText.split(entry.sourceTerm).join(token);
    tokens.push({
      token,
      sourceTerm: entry.sourceTerm,
      targetTerm: entry.targetTerm,
    });
  });

  return {
    tokenizedText,
    appliedTerms: tokens.map((token) => token.sourceTerm),
    restore(translatedText: string) {
      return tokens.reduce((result, token) => {
        return result.split(token.token).join(token.targetTerm);
      }, translatedText);
    },
  };
}

export function getGlossaryVersion(entries: GlossaryEntry[]) {
  return entries.reduce((maxVersion, entry) => Math.max(maxVersion, entry.version), 1);
}
