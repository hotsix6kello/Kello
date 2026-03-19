# In-Shop Interpreter MVP

## Technical Spec
- Goal: help a foreign customer and Korean beauty staff communicate face-to-face with short push-to-talk turns
- Salon glossary layer:
  - static glossary file for common beauty salon terms
  - Korean, English, Japanese, Simplified Chinese mappings
  - applied before provider translation
  - quick phrases generated from the same glossary tokens and grouped by salon step
- Channel: web app only, embedded on the homepage below recommended plans
- Roles:
  - customer
  - staff
- Languages:
  - ko
  - en
  - ja
  - zh-CN
- MVP flow:
  - client records a short audio clip
  - server STT route transcribes the clip
  - server translation route translates and stores the turn
  - client renders original and translated text together
  - client plays translated TTS with browser speech synthesis
  - conversation history is appended locally
  - if voice fails, text input fallback is always available
- Persistence:
  - local browser history via `localStorage`
  - optional repository persistence for sessions and turns
- Non-goals:
  - no realtime streaming
  - no multi-party room
  - no provider-specific SDK coupling on the client

## Implementation Plan
1. Add spec, README, and Tailwind scaffolding.
2. Add STT provider abstraction with mock and HTTP provider fallback.
3. Reuse existing interpreter session and turn translation services.
4. Build reusable homepage interpreter UI with push-to-talk and text fallback.
5. Persist recent history locally and show loading/error states.
6. Add tests for STT mock flow and interpreter translation flow.

## Folder Structure
```text
src/
  app/
    api/translator/interpreter/
      session/route.ts
      stt/route.ts
      turn/route.ts
    components/home-translator/
      HomeTranslatorHub.tsx
      interpreter/
        index.ts
        InShopInterpreterMvp.tsx
        ConversationHistoryList.tsx
        InterpreterHeader.tsx
        LanguageSelectorRow.tsx
        QuickPhrasePanel.tsx
        SpeakerControlCard.tsx
        storage.ts
        hooks/
          useInterpreterHistory.ts
          usePushToTalkRecorder.ts
  lib/
    translator/
      index.ts
      salonGlossary.ts
      stt.ts
      interpreterService.ts
      repository.ts
      catalog.ts
      tests/
```

## UI Components
- `InterpreterHeader`
- `LanguageSelectorRow`
- `SpeakerControlCard`
- `QuickPhrasePanel`
- `ConversationHistoryList`
- `InShopInterpreterMvp`

## API Route Design
- `POST /api/translator/interpreter/session`
  - create short-lived session token
- `POST /api/translator/interpreter/stt`
  - multipart form upload
  - returns transcript text, locale, provider metadata
- `POST /api/translator/interpreter/turn`
  - accepts text turn
  - translates, stores, and returns normalized turn payload

## Storage Schema
- Local:
  - `localStorage["kello:interpreter-history:{customerLocale}:{staffLocale}"]`
- Relational:
  - `interpreter_sessions`
  - `interpreter_turns`
  - shared `translation_glossary`

## Test Plan
- STT mock returns a transcript for each supported language
- interpreter session issues ephemeral token
- staff Korean turn translates to customer locale and keeps glossary terms
- invalid token rejects turn submission
- local history serializer keeps recent turns only

## Realtime Upgrade Plan
- replace short audio upload with websocket or WebRTC transport
- reuse the same session token format as ephemeral auth
- switch turn-based persistence to chunk aggregation
- replace browser TTS with low-latency streaming audio when available
