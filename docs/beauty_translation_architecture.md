# Beauty Translation Architecture

## Scope
- Base locale: `ko`
- Supported translation targets: `en`, `ja`, `zh-CN`
- Initial domain: `beauty`
- Future domain extension: `restaurant`

## Layered Design
1. UI layer
   - Static UI copy uses `i18next` with `common` and `translation` namespaces.
   - Admin glossary UI lives at `/admin/glossary`.
2. Application layer
   - `TranslationService` is the orchestration point for static, realtime, and structured translation flows.
   - `runBatchTranslateJob` processes queued static content in batches.
3. Persistence layer
   - `translation_contents` stores original source payloads and field maps.
   - `translation_versions` stores versioned translated outputs, engine, locale, fallback state, and history.
   - `translation_glossary` stores category-scoped glossary overrides.
   - `translation_batch_jobs` stores batch execution metadata.
4. Provider layer
   - `HttpTranslationProvider` connects to an external translation engine via `TRANSLATION_PROVIDER_URL`.
   - `MockTranslationProvider` is the safe default for local development and tests.

## Translation Flows

### 1. Static Data
- Trigger point: when shop, service, description, or policy data is saved.
- Flow:
  1. Build a source hash from payload + field map + schema version.
  2. Store the source record in `translation_contents`.
  3. Batch job or synchronous save hook calls `translateStaticContent`.
  4. Service checks L1 memory cache, then DB cache in `translation_versions`.
  5. Missing targets are translated and persisted as a new version.
  6. On failure, the source text is returned and a failed version row is recorded.

### 2. Realtime Data
- Scope: chat messages and request notes.
- Flow:
  1. `/api/translations/chat` receives message + target locale.
  2. Service checks short-lived memory cache.
  3. Glossary is loaded by domain + target locale.
  4. Provider translates on demand.
  5. If `persist !== false`, the request and response are also written to translation history tables.
  6. On failure, source text is returned as fallback.

### 3. Structured Reservation Payload
- Schema fields:
  - `service_name`: translatable
  - `duration`: numeric, preserved
  - `price`: numeric, preserved
  - `currency`: preserved
  - `notes`: translatable
- The translator only mutates translatable leaves and rebuilds the payload with the original schema shape.

## Glossary Strategy
- `translation_glossary` is keyed by:
  - `domain`
  - `source_locale`
  - `target_locale`
  - `source_term`
  - `version`
- Priority rules:
  - Lower `priority` wins first.
  - If priority ties, longer source terms are applied first.
- Tokens are injected before provider translation and restored after translation to keep fixed beauty terms stable.

## Caching Strategy
- L1: in-memory TTL cache
  - Static: 1 hour
  - Realtime chat: 5 minutes
- L2: DB cache
  - Keyed by `content_id + target_locale + source_hash`
  - Stores full translation history and fallback records
- Cache key inputs:
  - domain
  - content type
  - source hash
  - target locale
  - schema version
  - source version

## Failure Policy
- Provider error, timeout, invalid response:
  - return source text
  - mark translation version as `failed`
  - keep audit row with engine and error message

## Extensibility
- `TranslationDomain` already includes `beauty` and `restaurant`.
- Adding a new category requires:
  1. glossary entries for the new domain
  2. content save hooks pointing to `TranslationService`
  3. optional domain-specific schema rules

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TRANSLATION_PROVIDER_URL`
- `TRANSLATION_PROVIDER_API_KEY`
- `TRANSLATION_PROVIDER_NAME`
