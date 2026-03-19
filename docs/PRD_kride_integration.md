# PRD — k.ride 승차 호출 연동
**문서 버전:** v1.0  
**작성일:** 2026-02-23  
**작성자:** PM  
**상태:** 검토 대기  
**대상:** 개발(FE/BE) · 디자인 · QA  

---

## 목차
1. [배경 및 목표](#1-배경-및-목표)
2. [UI 변경점](#2-ui-변경점)
3. [알림 및 데이터 로직](#3-알림-및-데이터-로직)
4. [예외 처리 정책](#4-예외-처리-정책)
5. [화면별 CTA 노출 정책](#5-화면별-cta-노출-정책)
6. [데이터 모델 / API 인터페이스](#6-데이터-모델--api-인터페이스)
7. [구현 우선순위 및 마일스톤](#7-구현-우선순위-및-마일스톤)

---

## 1. 배경 및 목표

### 1.1 배경
- 기존 앱은 일정 관리·예약 대행·네비게이션 화면이 구축되어 있음
- 외국인 여행자가 한국에서 이동 수단 호출을 독립적으로 처리하는 것은 언어·앱 장벽이 높음
- k.ride(한국 승차 호출 플랫폼)와 연동해 이동 단계의 마찰을 제거

### 1.2 목표
| 목표 | 지표 |
|---|---|
| 이동 수단 호출 전환율 향상 | 일정 있는 세션의 k.ride 호출 버튼 클릭률 ≥ 30% |
| 지각/노쇼 감소 | 출발 알림 발송 후 제시간 도착률 측정 |
| 외국인 사용성 개선 | 기사님용 한국어 주소 카드 복사 사용률 |

### 1.3 범위 (In Scope)
- 전역 고정 FAB(Floating Action Button) 상태 관리
- 네비(오늘) 화면 k.ride 버튼 강화
- 이동 알림 스케줄링 로직 및 메시지 정의
- 예외 처리 6가지 가드레일

### 1.4 범위 외 (Out of Scope)
- k.ride 앱 자체 개발
- 결제/정산 연동
- 드라이버 매칭 로직

---

## 2. UI 변경점

### 2.1 전역 고정 CTA — `<KRideGlobalFAB />`

#### 위치 및 레이아웃
```
화면 우측 하단
bottom: 96px (BottomNav 위)
right: 16px
z-index: 90 (BottomNav=100 보다 낮게)
```

#### 동적 상태 정의

```
State A — 일정 없음
  라벨: "🚕 이동 수단"
  색상: Gray (#6B7280)
  클릭: 액션 시트 → "일정/숙소를 먼저 설정하세요" 가이드 모드

State B — 일정 있음 (여행 전)
  라벨: "📍 숙소/다음 장소로 이동"
  색상: Blue (#3B82F6)
  클릭: 액션 시트 (표준 4옵션)

State C — 여행 당일 / 다음 일정까지 ≤ 60분
  라벨: "🚗 k.ride 호출"
  색상: Purple Gradient (#7C3AED → #4F46E5)
  크기: 기본보다 1.2× 확대, pulse 애니메이션
  클릭: 액션 시트 (k.ride 최상단 강조)
```

#### 액션 시트 — 4가지 옵션 (공통)

| 순서 | 옵션 | 아이콘 | 동작 |
|---|---|---|---|
| 1 | **k.ride 앱 열기** | 🚗 | 딥링크 `kride://route?dest=...` → 미설치 시 스토어 |
| 2 | 대중교통/도보 길찾기 | 🚇 | 카카오맵 딥링크 |
| 3 | 목적지 주소 복사 | 📋 | 클립보드 복사 + 토스트 확인 |
| 4 | **기사님용 한국어 주소 카드** | 🗺️ | 모달 → 한국어 주소 크게 표시 + 복사 |

> **디자인 주의:** State C는 액션 시트에서 옵션 1(k.ride)을 보라색 강조 카드로 표시, 나머지 3개는 보조 텍스트 버튼으로 처리

#### 스크롤 축소 동작
```
스크롤 방향: Down → FAB width 축소, 텍스트 숨김 (아이콘만 원형)
스크롤 방향: Up  → FAB 원래 크기 복원
transition: width 0.25s ease, opacity 0.2s
```

---

### 2.2 네비(오늘) 화면 — 기존 UI 강화

#### 변경 전 → 변경 후

**다음 일정 카드 내 버튼 배치:**
```
[변경 전]
  [🗺️ 길찾기] (단일 버튼)

[변경 후]
  [🚗 k.ride 호출]        ← Primary, full-width, 보라색
  [🚇 대중교통]  [🚶 도보] ← Secondary, 50:50 회색 버튼
```

**컴포넌트 위계:**
- `KRidePrimaryBtn` — height 52px, border-radius 16px, gradient bg
- `TransportSecondaryBtn` — height 40px, border-radius 12px, outlined

#### 출발 임박 배너 (화면 상단 고정)

```
조건: 현재시각 >= 출발권장시각 AND 현재시각 < 예약시각
위치: 화면 상단 sticky (safe-area-top 포함)
내용: "⏰ {분}분 후 출발 권장 — 지금 k.ride 호출하세요"
색상: 임박(≤10분) → 빨강(#DC2626), 여유(11~30분) → 주황(#F59E0B)
```

---

## 3. 알림 및 데이터 로직

### 3.1 출발 권장 시각 계산 공식

```
출발_권장시각 = 예약_시작시각 - 예상_이동시간 - 버퍼
```

| 변수 | 소스 | 기본값 |
|---|---|---|
| `예약_시작시각` | planner DB (schedule.start_time) | — |
| `예상_이동시간` | 카카오/Google Maps API | API 호출 실패 시 30분 |
| `버퍼` | 사용자 설정 가능 | 15분 |

```typescript
// 예시 코드 (FE 계산)
function getDepartureTime(scheduleStartISO: string, travelMinutes: number, bufferMinutes = 15): Date {
  const start = new Date(scheduleStartISO);
  return new Date(start.getTime() - (travelMinutes + bufferMinutes) * 60_000);
}
```

### 3.2 알림 상태 머신 및 메시지

```
┌─────────────────────────────────────────────────────┐
│                  알림 상태 머신                        │
├──────────────┬─────────────────────────────────────┤
│ 상태          │ 트리거 조건                            │
├──────────────┼─────────────────────────────────────┤
│ STANDBY      │ 출발권장시각 - 5분 이전                 │
│ DEPART_NOW   │ 출발권장시각 도달 (~0분)                │
│ URGENT       │ 출발권장시각 + 10분 경과               │
│ DANGER       │ 예약 시작시각 - 5분 이내               │
│ COMPLETED    │ 체크인 완료 OR 장소 도착 감지           │
└──────────────┴─────────────────────────────────────┘
```

#### 상태별 알림 메시지 및 CTA

| 상태 | 알림 메시지 | 인앱 배너 | Push CTA |
|---|---|---|---|
| `DEPART_NOW` | "지금 출발하면 여유 있어요 😊" | 주황 배너 | [k.ride 호출] |
| `URGENT` | "지금 출발해야 제시간이에요 ⚡" | 빨간 배너 + 진동 | **[k.ride 호출]** |
| `DANGER` | "도착이 늦을 수 있어요 ⚠️" | 빨간 배너 풀스크린 오버레이 | [k.ride] + [예약 변경] |

#### Push Notification Payload
```json
{
  "title": "⏰ 지금 출발해요!",
  "body": "다음 예약 [{place_name}] 까지 이동 시간 {travel_min}분",
  "data": {
    "type": "DEPART_ALERT",
    "deeplink": "ktrip://navigation?action=kride_open",
    "schedule_id": "uuid",
    "dest_lat": 37.551,
    "dest_lng": 126.988
  }
}
```

### 3.3 딥링크 스킴 정의

```
인앱 딥링크:
  ktrip://navigation             → 오늘 화면
  ktrip://navigation?action=kride_open  → 오늘 화면 + k.ride 액션 시트 자동 오픈

k.ride 딥링크:
  kride://route?dest_lat=37.5&dest_lng=126.9&dest_name=홍대입구역
  (미설치 fallback) → https://apps.apple.com/... or https://play.google.com/...

카카오맵 딥링크:
  kakaomap://route?ep=37.5,126.9&by=PUBLICTRANSIT
```

---

## 4. 예외 처리 정책

### Guard 1 — 폼/결제 화면 숨김

```typescript
// 전역 FAB 숨김 조건
const HIDE_FAB_ROUTES = [
  '/auth',
  '/planner?modal=booking',  // 예약 Bottom Sheet 열린 상태
  '/my/payment',
];

// 컴포넌트 레벨
if (isBookingSheetOpen || HIDE_FAB_ROUTES.includes(currentPath)) {
  return null;
}
```

**디자인:** 숨김 시 즉시 사라지지 않고 `opacity 0 + scale 0.8, 0.2s` 트랜지션 후 `display:none`

---

### Guard 2 — 스크롤 축소

```typescript
// 스크롤 방향 감지 훅
const { scrollDirection } = useScrollDirection();

const fabStyle = {
  width: scrollDirection === 'down' ? 52 : 'auto',  // 아이콘 원형만
  transition: 'width 0.25s ease',
};
```

---

### Guard 3 — Empty State (목적지 없음)

- FAB 비활성(disabled) ❌ → 클릭 가능하되 **툴팁 가이드** 제공
- 액션 시트 상단에 안내 배너 삽입:

```
┌─────────────────────────┐
│ 📋 다음 일정을 설정하면   │
│ 목적지가 자동으로 연결돼요 │
│ [일정 만들기]            │
└─────────────────────────┘
```

---

### Guard 4 — 위치 권한 / k.ride 미설치 분기

```
위치 권한 없음:
  → "이동시간 계산을 위해 위치 권한이 필요해요" 시스템 권한 요청
  → 거부 시: 예상 이동시간 기본값(30분) 사용, 배너로 안내

k.ride 미설치:
  → iOS: https://apps.apple.com/kr/app/kride/...
  → Android: https://play.google.com/store/apps/details?id=...
  → 웹 대안: https://kride.kr/web-booking?dest=...
```

---

### Guard 5 — 클립보드 콤보 (외부 앱 연동 실패 대비)

```typescript
async function openKRideWithFallback(dest: Destination) {
  // 1. 주소 클립보드 자동 복사
  await navigator.clipboard.writeText(dest.addressKo);
  
  // 2. 딥링크 시도
  window.location.href = `kride://route?dest_lat=${dest.lat}&dest_lng=${dest.lng}`;
  
  // 3. 500ms 후 앱 전환 실패 감지 → 토스트
  setTimeout(() => {
    showToast('주소가 복사됐어요. k.ride에 붙여넣기 해주세요 📋');
  }, 500);
}
```

---

### Guard 6 — 안티 스팸 알림

```typescript
// 알림 발송 전 중복 체크
const SENT_ALERTS_KEY = 'sent_departure_alerts';

function canSendAlert(scheduleId: string): boolean {
  const sent = JSON.parse(localStorage.getItem(SENT_ALERTS_KEY) || '[]');
  return !sent.includes(scheduleId);
}

function markAlertSent(scheduleId: string): void {
  const sent = JSON.parse(localStorage.getItem(SENT_ALERTS_KEY) || '[]');
  localStorage.setItem(SENT_ALERTS_KEY, JSON.stringify([...sent, scheduleId]));
}
```

> **정책:** 동일 `schedule_id`에 대해 `DEPART_NOW` 알림은 **1회만** 발송.  
> `DANGER` 상태는 예외적으로 최대 1회 추가 발송 허용 (총 2회 한도).

---

## 5. 화면별 CTA 노출 정책

| 화면 (Route) | FAB 노출 | 형태 | 특이사항 |
|---|---|---|---|
| **홈 (`/`)** | ✅ 노출 | 소형 (아이콘+짧은 라벨) | State A/B/C 동적 |
| **탐색 (`/explore`)** | ✅ 노출 | 장소 카드 클릭 시 "이곳으로 이동" 자동 바인딩 | 장소 선택 전: 기본 FAB |
| **일정 (`/planner`)** | ⚠️ 축소 | 예약 확정 카드 내 "여기로 이동" 버튼 별도 표시 | 예약 Bottom Sheet 열리면 FAB 완전 숨김 |
| **오늘 (`/navigation`)** | ✅ 확장 | "k.ride 호출" State C 풀 사이즈 + 다음 일정 카드 내 Primary 버튼 | FAB와 카드 버튼 모두 k.ride |
| **마이 (`/my`)** | ❌ 숨김 | — | 업무 집중 방해 방지 |
| **인증 (`/auth/\*`)** | ❌ 숨김 | — | 항상 숨kim |
| **결제/폼 오버레이** | ❌ 숨김 | — | 실수 클릭 방지 |

---

## 6. 데이터 모델 / API 인터페이스

### 6.1 FAB 상태 결정 함수 (FE)

```typescript
type FABState = 'NO_SCHEDULE' | 'PRE_TRAVEL' | 'IMMINENT';

interface ScheduleContext {
  hasSchedule: boolean;
  nextScheduleTime: Date | null;
  travelMinutesToNext: number | null;
}

function getFABState(ctx: ScheduleContext): FABState {
  if (!ctx.hasSchedule) return 'NO_SCHEDULE';
  
  if (ctx.nextScheduleTime && ctx.travelMinutesToNext !== null) {
    const now = new Date();
    const minsUntilSchedule =
      (ctx.nextScheduleTime.getTime() - now.getTime()) / 60_000;
    const minsUntilDepart = minsUntilSchedule - ctx.travelMinutesToNext - 15;
    
    if (minsUntilDepart <= 60) return 'IMMINENT';  // State C
  }
  
  return 'PRE_TRAVEL';  // State B
}
```

### 6.2 이동 시간 API 요청

```typescript
// GET /api/travel-time
interface TravelTimeRequest {
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  mode: 'transit' | 'walking' | 'driving';
}

interface TravelTimeResponse {
  minutes: number;
  distance_km: number;
  source: 'kakao' | 'google' | 'fallback';
}
```

### 6.3 알림 스케줄 등록 (BE)

```typescript
// POST /api/notifications/departure-schedule
interface DepartureAlertSchedule {
  user_id: string;
  schedule_id: string;
  schedule_start: string;      // ISO 8601
  dest_lat: number;
  dest_lng: number;
  dest_name: string;
  dest_address_ko: string;
  travel_minutes: number;
  buffer_minutes: number;      // default: 15
}
```

---

## 7. 구현 우선순위 및 마일스톤

### Phase 1 — MVP (2주)
- [ ] `KRideGlobalFAB` 컴포넌트 (State A/B/C)
- [ ] 액션 시트 4옵션 UI
- [ ] 기사님용 한국어 주소 카드 모달
- [ ] 오늘 화면 k.ride Primary Button 배치
- [ ] 클립보드 콤보 + 딥링크 fallback

### Phase 2 — 알림 (2주)
- [ ] 이동 시간 API 연동
- [ ] 출발 권장 시각 계산 로직
- [ ] 인앱 배너 (주황/빨강)
- [ ] 알림 1회 발송 안티 스팸

### Phase 3 — 개인화 (1주)
- [ ] 버퍼 시간 사용자 설정
- [ ] k.ride 미설치 분기 스토어 유도
- [ ] 스크롤 축소 애니메이션

### 화면별 작업 파일 가이드

```
FE 작업 파일:
  src/app/components/KRideGlobalFAB.tsx     ← 신규 생성
  src/app/components/KRideActionSheet.tsx   ← 신규 생성
  src/app/components/AddressCard.tsx        ← 신규 생성
  src/app/navigation/page.tsx               ← 기존 수정
  src/app/layout.tsx                        ← FAB 주입

BE 작업 파일:
  api/travel-time/route.ts                  ← 신규
  api/notifications/departure-schedule/route.ts  ← 신규

훅:
  src/hooks/useFABState.ts          ← 신규
  src/hooks/useScrollDirection.ts   ← 신규
  src/hooks/useTravelTime.ts        ← 신규
```

---

## 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| v1.0 | 2026-02-23 | 최초 작성 |
