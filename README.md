# Kello

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Interpreter MVP

The homepage now includes an in-shop interpreter MVP below the recommended plans section.

Flow:
- client records short audio with push-to-talk
- server API route performs STT
- server translates the text
- client renders original and translated text together
- client plays translated speech with browser TTS
- local history is cached in `localStorage`
- conversation turns can also persist through the interpreter repository

If STT or translation provider environment variables are missing, the app falls back to mock providers so the local demo still works.

## Environment Variables

Optional translation provider:

```bash
TRANSLATION_PROVIDER_URL=
TRANSLATION_PROVIDER_API_KEY=
TRANSLATION_PROVIDER_NAME=
```

Optional interpreter translation provider:

```bash
INTERPRETER_TRANSLATION_PROVIDER=gemini
INTERPRETER_TRANSLATION_API_KEY=
INTERPRETER_TRANSLATION_GEMINI_MODEL=gemini-1.5-flash
INTERPRETER_TRANSLATION_ALLOW_MOCK_FALLBACK=true
GEMINI_API_KEY=
```

Supported provider values:
- `mock`
- `gemini`

`INTERPRETER_TRANSLATION_API_KEY` is optional. If it is not set, `GEMINI_API_KEY` is used.

Optional STT provider:

```bash
STT_PROVIDER_URL=
STT_PROVIDER_API_KEY=
STT_PROVIDER_NAME=
```

Optional Supabase persistence:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Scripts

```bash
npm run dev
npm run test
```

## Test Instructions

Run the interpreter and translation test suite with:

```bash
npm run test
```

Current MVP test coverage includes:
- translation service cache and glossary behavior
- booking concierge and interpreter service flows
- interpreter UI helper and component-state checks
- interpreter API route tests with mocked session, STT, and translation providers
- empty input validation
- microphone permission denied handling
- translation fallback to original text
- transcription failure fallback
- loading state logic

## Docs

- `docs/in_shop_interpreter_mvp.md`
- `docs/home_translator_hub.md`
- `docs/beauty_translation_architecture.md`
