# Booking Deep-link Stability Audit

## Scope

이 문서는 현재 `mypage` 브랜치 기준으로 itinerary item과 원본 service/item 사이의 연결 안정성을 조사한 결과를 정리한다.

이번 단계는 구현이 아니라 구조 판단이 목적이다.

- 새 backend / 새 API / 새 테이블 설계 없음
- 기존 booking-aware flow 동작 변경 없음
- 현재 코드베이스에서 어떤 deep-link가 안전한지 / 아닌지를 명확히 구분

## 조사한 파일 / 경로

- `src/lib/contexts/TripContext.tsx`
- `src/app/explore/mock/data.ts`
- `src/app/explore/page.tsx`
- `src/app/explore/[id]/page.tsx`
- `src/app/page.tsx`
- `src/app/planner/page.tsx`
- `src/app/planner/mock/data.ts`
- `src/lib/bookingContext.ts`
- `src/app/my/bookings/page.tsx`

## 1. Itinerary Item 생성 경로

### A. Explore에서 Add to Plan

파일:

- `src/app/explore/page.tsx`

생성 방식:

```ts
const newItem = {
  id: `plan_${selectedItemForPlan.id}_${Date.now()}`,
  name: selectedItemForPlan.title,
  status: 'draft',
  lat: selectedItemForPlan.lat,
  lng: selectedItemForPlan.lng,
  day,
  slot: 'pm',
  type: selectedItemForPlan.type,
  image_color: selectedItemForPlan.image_color,
  badges: selectedItemForPlan.badges,
}
```

관찰 포인트:

- itinerary item `id`는 local planner용 id로 새로 생성됨
- 원본 `ServiceItem.id`는 `selectedItemForPlan.id`에 존재하지만 itinerary item에는 별도 저장되지 않음
- 즉 생성 시점에 stable source id가 있었지만 버려지고 있음

### B. Home의 추천 플랜 적용

파일:

- `src/app/page.tsx`

생성 방식:

```ts
const formattedItems = plan.items.map((item) => ({
  ...item,
  id: `${plan.id}_${item.id}_${Date.now()}`
}))
```

관찰 포인트:

- 추천 플랜 원본 item은 `a1`, `b1`, `f2` 같은 stable-like id를 이미 갖고 있음
- 하지만 `setItinerary` 직전에 `id`를 새 compound id로 덮어씀
- 결과적으로 original item id가 itinerary에 남지 않음

### C. Planner 내부 편집

파일:

- `src/lib/contexts/TripContext.tsx`
- `src/app/planner/page.tsx`

관찰 포인트:

- 현재 Planner는 `trip_itinerary`를 읽고 제거/표시만 함
- planner page 안에서 새로운 itinerary id를 생성하는 로직은 현재 없음
- 실제 생성은 Explore 또는 Home 추천 플랜 적용 시점에 일어남

## 2. 현재 id 구조 요약

| 생성 경로 | itinerary `id` | 원본 item/service id 존재 여부 | 현재 남는가 | deep-link 안정성 |
| --- | --- | --- | --- | --- |
| Explore Add to Plan | `plan_${serviceId}_${Date.now()}` | 있음 (`selectedItemForPlan.id`) | 아니오 | 낮음 |
| Home 추천 플랜 적용 | `${plan.id}_${item.id}_${Date.now()}` | 있음 (`item.id`) | 아니오 | 낮음 |
| Planner mock `PlanCard` | `pc1`, `pc2` 등 | 있음 (`item_id`) | 예 | mock 수준에서만 높음 |
| Current TripContext item | local-generated `id`만 필수 | 없음 | 해당 없음 | booking focus 전용 |

## 3. stable reference 후보

현재 코드 기준으로 stable reference 후보는 아래 세 가지다.

### 1) `ServiceItem.id`

출처:

- `src/app/explore/mock/data.ts`
- `/api/places/nearby` 매핑 결과의 `p.id`

의미:

- `/explore/[id]`가 기대하는 값과 가장 가깝다
- mock/static item에서는 `f1`, `b1`, `a1` 형태
- nearby API 응답에서도 `p.id`를 `ServiceItem.id`로 사용 중

제약:

- itinerary에 저장될 때 이 값이 별도 필드로 남지 않는다

### 2) 추천 플랜 원본 `item.id`

출처:

- `src/app/page.tsx`의 `RECOMMENDED_PLANS[*].items[*].id`

의미:

- 실제로는 `ServiceItem.id`와 같은 값(`a1`, `b2`, `e1` 등)을 많이 사용한다

제약:

- `formattedItems` 단계에서 새 `id`로 덮어써서 사라진다

### 3) `planner/mock/data.ts`의 `item_id`

출처:

- `src/app/planner/mock/data.ts`

의미:

- 이미 이 repo 안에는 “planner card id”와 “원본 item id”를 분리하는 precedent가 존재한다
- `PlanCard.id`와 `PlanCard.item_id`를 분리하는 방식은 앞으로의 direction으로 자연스럽다

제약:

- 현재 실제 `TripContext.ItineraryItem`에는 이 필드가 없다
- planner mock 타입은 live itinerary 타입과 연결되지 않는다

## 4. `/explore/[id]` 연결 가능성

파일:

- `src/app/explore/[id]/page.tsx`

현재 이 route는 `params.id`를 “Service ID”로 취급한다.

실제 동작:

- `t(\`explore_items.${id}.title\`)`
- `t(\`explore_items.${id}.desc\`)`
- `t(\`explore_items.${id}.price\`)`

즉 현재 `/explore/[id]`는 아래 조건에서만 안전하다.

- `id`가 translation resource에 등록된 stable service id일 때
- 또는 fallback mock detail로 처리해도 UX상 괜찮을 때

안전하지 않은 경우:

- itinerary `id`처럼 `plan_b1_1712345678901` 형태의 local id를 넣는 경우
- 추천 플랜 적용 후 생성된 `${plan.id}_${item.id}_${Date.now()}` 형태 id를 넣는 경우

결론:

- 현재 모든 booking을 `/explore/[id]`로 보내는 것은 안전하지 않다
- `/explore/[id]`는 stable service/source id가 확보된 경우에만 연결 가능

## 5. `/my/bookings -> /planner focus`가 현재 정확 매칭에 기대는 이유

파일:

- `src/app/my/bookings/page.tsx`
- `src/lib/bookingContext.ts`
- `src/app/planner/page.tsx`

현재 흐름:

- `/my/bookings`가 itinerary item `id`를 `bookingId`로 query에 실음
- `/planner`는 `resolvedBookingContext.bookingId`와 `item.id`를 exact match

장점:

- 현재 구조에서 가장 확실하다
- local itinerary item을 정확히 찾아 same-session planner focus를 구현할 수 있다

한계:

- 이 `bookingId`는 source/service id가 아니라 “현재 itinerary row id”다
- itinerary를 다시 구성하거나 item id 생성 규칙이 바뀌면 deep-link 안정성이 떨어진다
- 같은 service를 다른 day/time에 여러 번 추가한 경우에도 source-level semantics는 없다

## 6. 현재 매칭이 깨질 수 있는 경우

### 1) itinerary item 재생성

- 추천 플랜을 다시 적용하거나
- Explore에서 같은 item을 다시 추가하면
- `Date.now()` 기반 새 id가 생성된다

결과:

- 이전 bookingId deep-link는 더 이상 현재 itinerary row와 매칭되지 않을 수 있다

### 2) source item id 유실

- 원본 service id가 itinerary에 남지 않기 때문에
- exact booking row가 없으면 `/explore/[id]`나 source detail로 fallback하기 어렵다

### 3) translation/detail route 의존

- `/explore/[id]`는 실제로 stable service id를 전제하는데
- itinerary item id는 그 전제를 만족하지 않는다

## 7. stable `sourceItemId` 도입 가능성 평가

평가: **가능함. 그리고 현재 구조에 비교적 자연스럽게 들어갈 수 있음.**

근거:

- Explore Add to Plan 시점에 `selectedItemForPlan.id`가 이미 존재
- Home 추천 플랜 item에도 source-like `item.id`가 이미 존재
- planner mock에는 이미 `item_id` precedent가 존재

가장 자연스러운 형태:

- `ItineraryItem`에 optional field 추가
  - `sourceItemId?: string`
  - 또는 `serviceId?: string`

어디서 넣어야 하는가:

### Explore 생성 경로

- `src/app/explore/page.tsx`
- `newItem` 생성 시 `sourceItemId: selectedItemForPlan.id`

### 추천 플랜 적용 경로

- `src/app/page.tsx`
- `formattedItems` 생성 시 기존 `item.id`를
  - `sourceItemId: item.id`
  - 그리고 local row id는 별도 `id`로 유지

### 영향 범위

- `src/lib/contexts/TripContext.tsx`
  - 타입 확장
- `/planner`
  - exact `bookingId` 실패 시 source-level fallback 후보로 사용 가능
- `/my/bookings`
  - 장기적으로 `View in Plan` 이후 source detail fallback 개선 가능
- `/explore/[id]`
  - 안전한 source id가 있을 때만 연결 가능

리스크:

- 기존 localStorage `trip_itinerary`에는 이 필드가 없을 수 있음
- 하지만 optional field로 넣으면 backward compatibility는 비교적 안전한 편

## 8. Recommended Options

### Option A. 현재 구조 유지 + planner focus 지속

설명:

- 지금처럼 bookingId exact match만 사용
- `View in Plan`을 primary fallback으로 유지

장점:

- 수정 범위 최소
- 현재 동작 가장 안정적
- 새 타입/마이그레이션 필요 없음

리스크:

- `/explore/[id]` direct deep-link는 계속 제한적
- item regeneration 시 deep-link 지속성 낮음

수정 범위:

- 거의 없음

### Option B. itinerary에 optional `sourceItemId` 추가

설명:

- local row id는 유지
- 동시에 source/service id를 별도 필드로 저장

장점:

- 가장 현실적인 점진 개선
- `/planner` fallback 정밀도 향상 가능
- `/explore/[id]` 연결 가능성이 생김
- mock precedent(`item_id`)와 방향이 맞음

리스크:

- 생성 경로 2곳 이상 수정 필요
- 기존 localStorage item에는 값이 비어 있을 수 있음

수정 범위:

- `TripContext.ItineraryItem` 타입
- `src/app/explore/page.tsx`
- `src/app/page.tsx`
- 이후 필요 시 `/planner`, `/my/bookings`

### Option C. booking detail route 준비를 위한 source-aware contract 정의

설명:

- 아직 route는 만들지 않음
- 먼저 “booking row id”와 “source item id”를 분리하는 contract만 정리

장점:

- 나중에 booking detail route 설계가 쉬워짐
- query/context 의미가 명확해짐

리스크:

- 즉시 사용자 체감은 적음
- route 미구현 상태에서는 문서/타입 정리에 가까움

수정 범위:

- 타입/헬퍼/문서 위주

## 9. Recommendation

현재 브랜치 기준 추천은 **Option B**다.

이유:

- 이미 source-like id가 생성 시점에 존재한다
- planner mock에 유사한 패턴이 있다
- 현재 booking-aware flow를 깨지 않고 점진적으로 넣을 수 있다
- `/explore/[id]` 및 future booking detail route 정확도를 같이 개선할 수 있다

다만 즉시 구현보다 먼저 아래 순서가 적절하다.

1. `ItineraryItem` optional `sourceItemId` 계약 정의
2. Explore Add to Plan / 추천 플랜 적용 경로에 값 저장
3. `/planner`에서 source-level fallback 탐색 검토
4. 그 다음 `/explore/[id]` 또는 future booking detail 연결 검토

## 10. 이번 단계 코드 수정 여부

- 제품 동작 변경 없음
- audit 문서 추가만 권장

## 11. 다음 단계 추천 작업

1. `ItineraryItem`에 optional `sourceItemId` 추가 가능성에 대한 작은 타입 PR
2. `src/app/explore/page.tsx`와 `src/app/page.tsx`에 source id 저장 PoC
3. `/planner`에서 `bookingId exact match -> sourceItemId fallback` 순서의 탐색 규칙 초안 작성
