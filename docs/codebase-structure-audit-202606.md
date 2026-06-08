# Kello(wekello) 코드베이스 구조 감사 보고서

- 작성 시점: 2026-06-08
- 대상 브랜치: `develop` (최신 pull 상태, HEAD `71ff683`)
- 작업 브랜치: `chore/codebase-audit-report` (코드 변경 없음, 분석 전용)
- 범위: `src/app`, `src/lib`, `src/components`, API 라우트, Supabase 마이그레이션/타입, i18n 로케일, 문서/캐시 파일
- 방법: 정적 분석 (grep/import 추적), git 히스토리 대조, 문서-코드 정합성 검증. 코드 수정 없음.

---

## 0. 요약 (Executive Summary)

전반적으로 캐시·빌드 산출물 관리(`​.gitignore`)는 깔끔한 편이고, 트랜슬레이터/번역 시스템은 여러 차례의 정리(prune) 작업 덕분에 78% 수준으로 정돈되어 있습니다. 다만 다음 5가지는 우선 조치가 필요합니다.

1. **[보안-Critical]** `/api/places/*`, `/api/routes/compute`, `/api/talk/kello-ai` 등 유료 외부 API(Google Maps/Places, Gemini)를 호출하는 라우트에 인증/요청 제한이 전혀 없어 비용 남용에 노출되어 있음
2. **[문서 정합성-High]** `docs/kello-mvp-stabilization-report.md`가 "BookingFlowSkeleton은 폐기되었다"고 기술하지만, 이후 커밋(`02c40e9`)에서 해당 플로우가 **부활하여 현재 기본 예약 플로우로 운영 중** — 신규 개발자에게 잘못된 정보를 줄 수 있음
3. **[죽은 코드]** `src/lib/translator/interpreterTranslator.ts` 전체와 concierge 관련 인터페이스가 사용처 없이 방치됨 (약 130 LOC)
4. **[중복 코드]** PayPal `create-order`/`capture-order` 라우트가 `getPayPalBaseUrl()`, `getPayPalAccessToken()`을 각각 구현 — 공용 모듈화 필요
5. **[i18n]** `id`, `ms` 로케일이 "9개 언어 지원 대상"으로 선언되어 있으나 실제로는 영어 대비 약 1,100개 키 누락 (마이페이지 영역 미번역)

캐시/구버전 파일 측면에서는 `.next`(507MB), `node_modules`, `supabase/.temp` 모두 git 추적에서 정상적으로 제외되어 있고(`supabase/.temp`는 이번 정리 커밋 `038b7a0`에서 추적 해제 완료), 실제로 삭제가 필요한 추적 파일은 없습니다. 다만 `mockUploadBridgeAdapter.ts` 같은 고아 파일과, 목적을 다한 감사/스냅샷 문서들이 `docs/` 최상위에 누적되어 있습니다.

---

## 1. 전체 구조 개요

```
src/
├─ app/            # Next.js App Router (107 파일) — 페이지 + API 라우트 25개
│  ├─ api/         # admin, bookings, interpreter, my, notifications,
│  │               # payments, places, referral, routes, talk, translate,
│  │               # translations, weather
│  ├─ admin/       # 관리자 콘솔 (bookings/beauty, glossary, partners, users)
│  ├─ my/          # 마이페이지 (bookings, community, notifications, phrases, saved, settings, support)
│  ├─ explore/, business/, community/, interpreter/, talk/, help/, auth/ 등
├─ lib/            # 도메인 로직 (65 파일)
│  ├─ admin/       # adminRouteAccess (인증 가드)
│  ├─ bookings/    # bookingFlowSkeleton/ (예약 플로우 - 사실상 production)
│  ├─ translator/, translation/, interpreter/  # 번역·통역 시스템 (이원화)
│  └─ i18n/, contexts/, settings/, tests/
├─ components/     # booking/, review/ (9 파일 — 대부분 app/ 내부에 위치)
└─ hooks, constants, types  # 매우 작음 (각 1파일)
```

`supabase/migrations/`에는 18개 마이그레이션(2026-04-01 ~ 2026-06-03)이 있고, `public/locales/`에는 15개 언어 디렉터리가 존재합니다.

---

## 2. 영역별 상세 발견 사항

### 2.1 번역/통역 시스템 (`lib/translator`, `lib/translation`, `lib/interpreter`)

git 브랜치 목록에 `chore/audit-legacy-translator-*`, `chore/prune-translator-*` 류가 다수 있어 예상한 대로, **두 개의 번역 시스템이 공존**합니다.

| 구분 | `translator/` | `translation/` |
|---|---|---|
| 성격 | 통역(인터프리터) 도메인 특화 | 범용 다국어 번역 인프라 |
| 상태 | 일부 활성, 일부 죽은 코드 | 전체 활성 (서비스의 중심) |

**확인된 죽은 코드 (사용처 0건, grep으로 검증):**
- `src/lib/translator/interpreterTranslator.ts` 전체 — `MockInterpreterTranslationProvider`, `GeminiInterpreterTranslationProvider`, `translateInterpreterText()` 모두 어디서도 import되지 않음. `InShopInterpreterService`는 대신 `TranslationService`(translation/)를 사용 중 → **리팩터링 후 지우지 않은 잔재**
- `src/lib/translator/types.ts:178-179`, `repository.ts:25-34, 82-100`의 `saveConciergeEvent()` / concierge 이벤트 타입 — concierge 라우트가 이미 제거됨(커밋 `82c520d`)에도 인터페이스만 잔존
- `src/lib/translator/tests/home-translator.test.ts` — 삭제된 concierge 코드를 참조

**아키텍처 비일관성:**
- `/api/interpreter/session`, `/api/interpreter/turn`은 `InShopInterpreterService`를 거치는데, `/api/interpreter/translate/route.ts:7`은 죽은 `interpreterTranslator.ts`의 `translateInterpreterText()`를 직접 호출 — 패턴이 갈라짐
- `/api/talk/chat-translate`와 `/api/interpreter/translate`는 유사한 일을 하면서도 응답 형태(`translatedText` vs `translatedPayload`)가 다름

**TODO/FIXME:** `src/lib/interpreter/transcriber.ts`를 포함해 이 영역에는 TODO/FIXME 주석이 더 이상 없음 (이전 정리 과정에서 모두 해소된 것으로 보임).

### 2.2 예약/결제 플로우 (`lib/bookings/bookingFlowSkeleton`, PayPal API)

**중요한 문서-코드 불일치 발견:**
`docs/kello-mvp-stabilization-report.md` (커밋 `3484898`/`a54ea08` 시점 작성)는 "`BookingFlowSkeleton`은 폐기된 실험이며 더 이상 런타임에 포함되지 않는다", "`HomeBeautyBookingFlow`가 현재 경로다"라고 명시합니다. 그러나 이후 커밋 `02c40e9 feat: restore BookingFlowSkeleton flow and remove store-selection step`에서 **`HomeBeautyBookingFlow`를 삭제하고 `BookingFlowSkeleton`을 부활시켜 현재 기본 예약 플로우로 운영** 중입니다 (`HomeBookingFlowEntry.helpers.ts:35`에서 기본값 `"skeleton"` 반환, 코드베이스에 `HomeBeautyBookingFlow` 자체가 더 이상 존재하지 않음을 확인).
→ **`docs/kello-mvp-stabilization-report.md`는 사실상 폐기된 상태(stale)이며, 그대로 두면 신규 개발자가 정반대의 결론을 내릴 위험**이 있습니다. "skeleton"이라는 이름과 달리 실제로는 이미지 업로드, 약관 동의, 제출 오케스트레이션을 갖춘 정식 production 코드입니다.

**중복 코드:**
- `src/app/api/payments/paypal/create-order/route.ts`와 `capture-order/route.ts`가 `getPayPalBaseUrl()`(L24-28), `getPayPalAccessToken()`(L30-58)을 **각각 동일하게** 구현 — 공용 `lib/paypal/paypalClient.ts`로 추출 권장

**통화(currency) 처리:**
- 두 라우트 모두 `booking.quoteCurrency !== "USD"`를 결제 시점에 체크하지만(create-order:112, capture-order:109), **예약 생성 시점에는 통화를 강제하지 않음**. "fix: use USD for PayPal quote payments" 커밋이 사후 대응이었던 정황과 일치 — 근본적으로는 견적 생성 단계에서 통화를 USD로 고정/검증해야 함

**인증 일관성:**
- `/api/bookings/beauty/images/signed-url`은 다른 사용자 소유 라우트와 달리 `getOptionalAuthenticatedRouteAccess`를 사용 — 비로그인 요청 허용 여부가 의도된 것인지 불명확
- `/api/bookings/beauty` POST도 `getOptionalAuthenticatedRouteAccess()`를 사용해 `userId`가 null일 수 있음 — 익명 예약을 의도적으로 지원하는지 문서화 필요

**남은 TODO성 주석 (file:line):**
- `bookingFlowSkeleton/bridge.ts:152` — `// Required external input: skeleton state does not own store selection yet.`
- `bookingFlowSkeleton/bridge.ts:191` — `// Required external input in the future HomeBookingFlowEntry/submitAdapter.`
- `bookingFlowSkeleton/submitAdapter.ts:111` — `// Submit adapter only consumes uploaded URLs; raw file metadata stays in skeleton draft.`
- `HomeBookingFlowEntry.types.ts:128` — `// Skeleton is the current default path; set false only to force the legacy fallback.`

### 2.3 API 라우트 보안/일관성 (총 28개 라우트 점검)

**가장 심각한 영역 — 인증/요청 제한 부재로 비용 남용 가능:**

| 라우트 | 인증 | 비고 |
|---|---|---|
| `/api/places/search`, `/nearby`, `/details`, `/autocomplete` | ❌ 없음 | 사용자 입력이 그대로 Google Places 유료 API로 전달, 무제한 호출 가능 |
| `/api/routes/compute` | ❌ 없음 | 좌표 입력이 그대로 Google Routes 유료 API로 전달 |
| `/api/talk/kello-ai` | ❌ 없음 | 매 요청마다 Gemini(`gemini-2.0-flash`) 호출, 메시지 검증 부족(프롬프트 인젝션 가능성) |
| `/api/translations/batch` | ❌ 없음 | 배치 번역 작업을 인증/스키마 검증 없이 수락 |
| `/api/interpreter/transcribe` | ❌ 없음 | 음성 인식(고비용) 처리에 인증/제한 없음 |

→ 이 라우트들에 `requireAuthenticatedRouteAccess` 추가 + 사용자별 호출 횟수 제한(rate limit)이 시급합니다. 반대로 `/api/bookings/*`, `/api/admin/*`, `/api/notifications/*`, `/api/my/*`, `/api/referral/apply`는 `requireAuthenticatedRouteAccess`/`requireAdmin` 가드가 일관되게 적용되어 있어 양호합니다.

**오류 응답 정보 노출:**
- `/api/places/search:45-53`, `/api/places/nearby:94-100` — 원시 에러 메시지를 `"detail"` 필드로 그대로 클라이언트에 반환 → 일반화된 메시지로 교체 필요

**입력 검증 미흡:**
- `/api/routes/compute`, `/api/places/nearby` — 위도/경도 범위([-90,90], [-180,180]) 검증 없음
- `/api/places/autocomplete` — 입력 길이/문자 제한 없음
- (반대 사례, 참고할 만한 좋은 패턴) `/api/interpreter/translate`는 locale 화이트리스트 검증을 하고 있음(L43)

### 2.4 Supabase 마이그레이션 / 타입 / i18n

**마이그레이션 (18개, 2026-04-01 ~ 2026-06-03):**
- 전반적으로 기능 단위로 잘 나뉘어 있으나, `20260602000000`과 `20260602172000`(약 97분 간격)이 **동일하게 `*_ko` 뷰를 drop/recreate** — 같은 날 두 번 손댄 정황으로, 첫 번째 마이그레이션에 누락이 있었는지 확인 필요
- referral/coupon, community 관련 마이그레이션 등 다수에 down-migration(롤백)이 없음 — 문제 발생 시 수동 SQL 복구가 필요한 구조
- `supabase/.temp/`는 `linked-project.json`만 남아 있으며 git 추적에서 정상적으로 제외됨 (방금 커밋 `038b7a0`로 정리 완료, 추가 조치 불필요)

**Supabase 타입:**
- `src/types/`에 Supabase 스키마 기반 자동 생성 타입 파일이 존재하지 않음. 최근 마이그레이션(quote 컬럼, payment 컬럼, ko 뷰)이 타입에 반영되지 않았을 가능성 → `supabase gen types typescript`로 생성 후 커밋 권장

**i18n 로케일 (15개 언어):**
- `src/lib/i18n/locales.ts`에 정의된 정식 지원 언어(canonical) 8개: `ko, en, ja, zh-CN, zh-TW, vi, th, ar`
- 그 외 `de, es, fr, id, ms, pt, ru` 7개가 추가로 존재
- **`id`, `ms`는 "9개 언어 지원" 목표에 포함되어 있다고 선언되어 있으나, `common.json` 기준 약 1,278~1,298줄로 영어(2,423줄) 대비 약 1,100개 키 누락** — 특히 `/my/support`, `/my/settings`, `/my/phrases`, `/my/saved` 영역
- `pt, es, de, fr, ru`는 마이페이지 번역이 전혀 없는 "구버전" 수준(약 800줄)에 머물러 있음 — 정식 지원 언어로 분류할지, 레거시로 명확히 구분할지 결정 필요
- `zh-TW` vs `zh-HK` 식별 혼선: `docs/locale-naming-strategy.md`와 실제 `initLanguage.ts`의 `COUNTRY_TO_LOCALE` 매핑이 서로 다른 코드를 가리키는 부분이 있어 국가 기반 자동 감지 시 불일치 위험

---

## 3. 정리 대상 — 구버전/캐시/고아 파일

| 대상 | 상태 | 조치 |
|---|---|---|
| `.next/` (507MB), `node_modules/` | git 추적 0건, `.gitignore` 정상 등록 | 조치 불필요 (정상) |
| `supabase/.temp/` | 이번 세션에서 추적 해제 완료 (커밋 `038b7a0`) | 완료 |
| `src/lib/bookings/bookingFlowSkeleton/mockUploadBridgeAdapter.ts` | **고아 파일** — `createMockBookingImageUploadBridgeAdapter` 사용처 0건 (grep 검증), barrel(`index.ts`)에도 미등록 | 삭제 가능 |
| `src/lib/translator/interpreterTranslator.ts` | **고아 파일** (전체) — 위 2.1절 참조 | 삭제 가능 |
| `src/lib/translator/types.ts`, `repository.ts`의 concierge 관련 타입/메서드 | 죽은 인터페이스 (~50 LOC) | 삭제 가능 |
| `docs/archive/legacy/home_translator_hub.md` | 문서 자체에 "현재 구조가 아님" 명시 | `archive/` 유지 또는 삭제 |
| `docs/kello-mvp-stabilization-report.md` | **stale** — 2.2절의 문서-코드 불일치 참조 | 갱신 또는 archive 이동 후 최신 상태로 재작성 |
| `docs/booking-deeplink-audit.md`, `external-*-audit.md`, `mypage-qa-*`, `*-provenance-audit.md` 등 약 12개 | 목적을 다한 감사/스냅샷 문서 | `docs/archive/`로 이동 (22개 → 약 8개로 정리) |

git에 잘못 커밋된 대용량/바이너리 파일은 없으며(최대 추적 파일은 마이그레이션 SQL 23KB 수준), `eslint.config.mjs`에서 `no-unused-vars`, `no-explicit-any`, `react-hooks/exhaustive-deps`가 `"warn"`으로 완화되어 있어 — 위 정리가 끝난 뒤 `"error"`로 격상하면 향후 동일한 문제(고아 파일·죽은 코드 누적)의 재발을 막을 수 있습니다.

---

## 4. 우선순위 권장사항 (Top 7)

1. **[Critical/보안]** `/api/places/*`, `/api/routes/compute`, `/api/talk/kello-ai`, `/api/translations/batch`, `/api/interpreter/transcribe`에 인증 + 사용자별 호출 제한(rate limit) 추가 — 유료 외부 API 비용 남용 방지
2. **[High/문서]** `docs/kello-mvp-stabilization-report.md`를 현재 코드 상태(`BookingFlowSkeleton`이 부활하여 기본 플로우로 운영 중)에 맞게 갱신하거나 archive로 이동 — 그대로 두면 향후 개발자에게 잘못된 가이드가 됨
3. **[Medium/리팩터]** PayPal `create-order`/`capture-order`의 `getPayPalBaseUrl`/`getPayPalAccessToken` 중복을 `lib/paypal/` 공용 모듈로 추출
4. **[Medium/안정성]** 견적(quote) 생성 시점에 통화를 USD로 고정/검증하여, 결제 시점 거부가 아닌 생성 시점 차단으로 전환
5. **[Low~Medium/정리]** `interpreterTranslator.ts`, concierge 잔재 타입, `mockUploadBridgeAdapter.ts` 등 고아 코드(~180 LOC) 삭제
6. **[Low/i18n]** `id`, `ms` 로케일의 마이페이지 영역(약 1,100개 키) 번역을 우선 진행하거나, "9개 언어" 목표에서 제외 여부를 명확히 결정. `zh-TW`/`zh-HK` 식별 방식도 단일화
7. **[Low/문서 정리]** `docs/` 최상위에 쌓인 12개 안팎의 1회성 감사/체크리스트 문서를 `docs/archive/`로 이동하고, Supabase 타입(`supabase gen types`)을 생성·커밋하여 최신 스키마와 동기화

---

*본 보고서는 코드 변경 없이 분석만 수행한 결과이며, 위 권장사항의 실제 적용 여부와 우선순위는 팀 논의를 통해 결정하시기 바랍니다.*
