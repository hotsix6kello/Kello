# Home Translator Hub

## Architecture
- Frontend: home screen card hub with two modes below recommended plans
- Backend: Next.js route handlers under `/api/translator/*`
- Translation: existing `TranslationService` reused for chat-style text translation and glossary application
- Salon glossary:
  - static beauty salon glossary file used as default fallback glossary
  - admin glossary entries can still override the default mappings
- Realtime-ready:
  - booking concierge uses stateless HTTP requests plus persisted session IDs
  - interpreter mode issues short-lived ephemeral tokens that can later back WebRTC or websocket upgrades
  - API keys stay server-side inside route handlers and translation providers
- Booking concierge:
  - user message
  - source text normalized into Korean for parsing
  - intent + booking field extraction
  - service info tool
  - availability tool
  - create/change/cancel booking tool when needed
  - grounded answer generation from tool results only
  - event persistence
- In-shop interpreter:
  - ephemeral session token
  - fixed customer/staff locale pair
  - browser STT if supported
  - server translation turn
  - browser TTS replay
  - text fallback when voice fails

## Folder Structure
```text
src/
  app/
    api/translator/
      concierge/route.ts
      interpreter/session/route.ts
      interpreter/turn/route.ts
    components/home-translator/
      HomeTranslatorHub.tsx
      HomeTranslatorHub.module.css
  lib/
    translator/
      catalog.ts
      parser.ts
      tools.ts
      repository.ts
      conciergeService.ts
      interpreterService.ts
      types.ts
      tests/home-translator.test.ts
```

## Relational Schema
- Shared translation glossary dependency:
  - `translation_glossary`
  - admin screen: `/admin/glossary`
- `booking_concierge_events`
  - original text
  - normalized text
  - localized response
  - customer locale
  - structured output json
  - tool trace json
  - booking id
- `booking_records`
  - session id
  - service name
  - booking date/time
  - status
  - notes
- `interpreter_sessions`
  - customer locale
  - staff locale
  - ephemeral token
  - expires at
- `interpreter_turns`
  - session id
  - speaker
  - source locale
  - target locale
  - original text
  - translated text
  - input mode

## Firestore Alternative
- `bookingConciergeSessions/{sessionId}`
  - metadata
  - `events/{eventId}`
  - `bookings/{bookingId}`
- `interpreterSessions/{sessionId}`
  - session metadata
  - `turns/{turnId}`

## API Contract

### POST `/api/translator/concierge`
```json
{
  "sessionId": "optional",
  "customerLocale": "en",
  "message": "Can I book lash extension on 2026-03-18 at 14:00?"
}
```

```json
{
  "sessionId": "concierge_1234abcd",
  "originalText": "Can I book lash extension on 2026-03-18 at 14:00?",
  "normalizedText": "...",
  "responseKo": "...",
  "responseLocalized": "...",
  "customerLocale": "en",
  "structuredOutput": {
    "intent": "create_booking",
    "service_name": "속눈썹 연장",
    "requested_date": "2026-03-18",
    "requested_time": "14:00",
    "notes": "..."
  },
  "tools": [],
  "booking": {},
  "savedEventId": "uuid"
}
```

### POST `/api/translator/interpreter/session`
```json
{
  "customerLocale": "en",
  "staffLocale": "ko"
}
```

### POST `/api/translator/interpreter/turn`
```json
{
  "sessionId": "uuid",
  "ephemeralToken": "opaque-token",
  "speaker": "customer",
  "inputMode": "voice",
  "text": "Please make the pressure softer."
}
```

## UI Components
- `HomeTranslatorHub`
  - mode switcher rendered below recommended plans
- `BookingConciergePanel`
  - locale selector
  - inquiry textarea
  - quick action chips for price, availability, change, cancel
  - grounded tool trace + structured output viewer
- `InShopInterpreterPanel`
  - fixed locale pair selector
  - push-to-talk controls
  - text fallback input
  - quick phrase buttons grouped by greeting, consultation, haircut, color, shampoo, finish
  - dual original / translated transcript cards
  - browser TTS replay buttons

## Implementation Plan
1. Add translator domain library with parser, tool layer, and repository abstraction.
2. Add API routes for concierge and interpreter session/turn handling.
3. Add homepage translator hub UI under recommended plans.
4. Connect glossary-aware translation and persistence.
5. Add tests for booking flow and interpreter flow.

## Sample Code
```ts
const structured = extractBookingFields(message);
const availability = await availabilityTool({
  serviceName: structured.service_name,
  requestedDate: structured.requested_date,
  requestedTime: structured.requested_time,
});

if (structured.intent === "create_booking" && availability.available) {
  const booking = await createBookingTool(repository, {
    sessionId,
    serviceName: structured.service_name,
    requestedDate: structured.requested_date,
    requestedTime: structured.requested_time,
    notes: structured.notes,
  });
}
```

## Test Scenarios
- booking create flow with valid slot
- booking create flow with unavailable slot
- booking change flow with existing booking
- booking cancel flow without active booking
- interpreter session token issuance
- interpreter turn translation customer → staff
- interpreter turn translation staff → customer
- voice unavailable fallback to text mode
