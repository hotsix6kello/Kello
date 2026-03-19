# Beauty Booking Deployment Checklist

## Scope
- 대상 기능: `beauty explore` 예약 저장 흐름
- 저장 경로: `POST /api/bookings/beauty`
- 저장 테이블: `public.beauty_booking_requests`

## Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

운영 기준:
- `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용한다.
- 클라이언트 번들에는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`만 노출 가능하다.
- 위 두 값 중 하나라도 없으면 예약 저장은 실패해야 하며 completion 상태로 넘어가면 안 된다.

## SQL Apply Order
1. 배포 환경에 `NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`를 설정한다.
2. Supabase SQL Editor 또는 migration 흐름에서 [beauty_booking_table.sql](c:/Users/USER/Desktop/kello/beauty_booking_table.sql)을 적용한다.
3. 운영자 상태 변경 화면까지 사용할 환경이라면 [beauty_booking_status_update.sql](c:/Users/USER/Desktop/kello/beauty_booking_status_update.sql)도 함께 적용한다.
4. 고객용 내 예약 화면까지 사용할 환경이라면 [beauty_booking_owner_update.sql](c:/Users/USER/Desktop/kello/beauty_booking_owner_update.sql)도 함께 적용한다.
5. 고객 셀프 취소까지 사용할 환경이라면 [beauty_booking_cancel_update.sql](c:/Users/USER/Desktop/kello/beauty_booking_cancel_update.sql)도 함께 적용한다.
6. `public.beauty_booking_requests` 테이블 생성 여부와 status constraint, `customer_user_id`, `canceled_at`, `canceled_by`, `cancel_reason` 컬럼을 확인한다.
7. 앱을 실행하고 beauty 예약 1건을 저장한다.
8. Supabase에서 저장 row를 확인한다.

## Smoke Test

### 1. 저장 성공
1. 홈에서 beauty category를 선택하고 `/explore?category=beauty&beautyCategory=hair`로 진입한다.
2. 매장, 날짜, 시간, 대표 시술, 고객 이름, 연락처, 동의를 모두 입력한다.
3. `예약 요청 정리하기` 클릭 시 버튼 문구가 `예약 요청 저장 중...`으로 바뀌는지 확인한다.
4. 저장 성공 후 completion 카드가 정상 표시되는지 확인한다.
5. Supabase에서 아래 컬럼이 채워졌는지 확인한다.
   - `store_name`
   - `booking_date`
   - `booking_time`
   - `primary_service_name`
   - `total_price`
   - `communication_language`
   - `status`
   - `payload_json`

### 2. env 누락
1. 서버 환경에서 `NEXT_PUBLIC_SUPABASE_URL` 또는 `SUPABASE_SERVICE_ROLE_KEY`를 제거한다.
2. 같은 예약 저장을 시도한다.
3. UI는 completion으로 넘어가지 않고 `예약 요청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.` 문구를 보여야 한다.
4. 서버 로그에는 `storage_env_missing`만 남고, 고객 이름/연락처/요청사항 전문은 남기지 않는다.

### 3. SQL 미적용
1. `beauty_booking_table.sql`을 적용하지 않은 환경에서 저장을 시도한다.
2. UI는 completion으로 넘어가지 않고 같은 실패 문구를 보여야 한다.
3. 서버 로그에는 `storage_schema_missing`만 남아야 한다.

### 4. route validation 실패
1. `POST /api/bookings/beauty`에 필수 필드가 없는 body를 보낸다.
2. 응답은 `400`이어야 한다.
3. `category`, `createdFrom.flow`, `agreements` boolean이 누락되거나 잘못돼도 같은 `400`으로 막혀야 한다.
4. 응답 shape는 아래와 같아야 한다.
```json
{
  "ok": false,
  "error": "valid beauty booking payload is required"
}
```

### 5. 고객 내 예약 확인
1. 로그인한 사용자로 beauty 예약을 1건 저장한다.
2. `customer_user_id`가 저장되었는지 확인한다.
3. `/my/bookings/beauty` 또는 `GET /api/bookings/beauty/mine`에서 해당 사용자 예약만 보이는지 확인한다.
4. 로그인하지 않거나 다른 사용자 토큰이면 예약 목록이 노출되지 않아야 한다.

### 6. 고객 예약 취소
1. `requested` 또는 `confirmed` 상태 예약을 선택한다.
2. `/my/bookings/beauty`에서 취소 사유를 입력하고 취소를 진행한다.
3. UI 상태가 즉시 `예약 취소`로 바뀌는지 확인한다.
4. Supabase에서 `status`, `canceled_at`, `canceled_by`, `cancel_reason`이 함께 저장되는지 확인한다.
5. `/admin/bookings/beauty` 상세에서도 같은 취소 정보가 보이는지 확인한다.

## Quick Verification Columns
정상 저장 여부는 아래 컬럼만 먼저 보면 된다.
- `id`
- `created_at`
- `status`
- `store_name`
- `booking_date`
- `booking_time`
- `primary_service_name`
- `total_price`
- `communication_language`
- `payload_json`

## Route Response Contract

성공:
```json
{
  "ok": true,
  "bookingId": "uuid",
  "status": "requested",
  "createdAt": "2026-03-18T12:34:56.000Z"
}
```

실패:
```json
{
  "ok": false,
  "error": "..."
}
```

## Pre-Deploy Checklist
- 필수 env 2개가 모두 설정되어 있다.
- [beauty_booking_table.sql](c:/Users/USER/Desktop/kello/beauty_booking_table.sql)이 적용되어 있다.
- `예약 요청 정리하기` 저장 성공 시 completion 카드가 유지된다.
- 저장 실패 시 completion으로 넘어가지 않는다.
- 모바일 폭 360px~430px에서 CTA/loading/error가 자연스럽게 보인다.
- service role key가 클라이언트 코드에 직접 사용되지 않는다.

## Known Issue Boundary
- 현재 `tsc --noEmit` 실패 항목 중 아래는 beauty booking 저장 경로와 무관한 기존 이슈다.
  - `src/app/explore/page.tsx` nearby place 타입 불일치
  - `src/lib/translation/tests/translation.service.test.ts`
  - `src/lib/translator/tests/interpreter.routes.test.ts`
- 위 이슈와 별개로, beauty booking 배포 판단은 아래 4가지만 우선 본다.
  - env 설정 완료
  - SQL 적용 완료
  - 저장 성공 smoke test 통과
  - 저장 실패 시 graceful handling 확인
