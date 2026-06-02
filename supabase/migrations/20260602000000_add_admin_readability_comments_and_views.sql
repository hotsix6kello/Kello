begin;

-- ============================================================
-- Admin readability phase 1
-- - COMMENT ON TABLE / COMMENT ON COLUMN only
-- - Read-only admin views only
-- - No table rename, column rename, data update, status change, RLS change
-- - No payment schema changes in this migration
-- ============================================================

comment on table public.beauty_booking_requests is
  'Kello 뷰티 예약 운영 원본 테이블. 결제 테이블이 아니며 payment_status는 아직 분리되지 않았다. booking_records와는 다른 도메인이다.';
comment on column public.beauty_booking_requests.id is '뷰티 예약 요청 기본 키.';
comment on column public.beauty_booking_requests.category is '예약 도메인 구분값. 현재 beauty 고정.';
comment on column public.beauty_booking_requests.customer_user_id is '예약 요청을 생성한 auth.users 사용자 ID. 비회원 요청이면 null 가능.';
comment on column public.beauty_booking_requests.beauty_category is '뷰티 카테고리 코드. 예: hair, nail, esthetic, waxing, makeup, lash.';
comment on column public.beauty_booking_requests.region is '고객이 선택한 지역 코드 또는 지역명.';
comment on column public.beauty_booking_requests.store_id is '앱 내부 매장 식별자.';
comment on column public.beauty_booking_requests.store_name is '예약 대상 매장 표시 이름.';
comment on column public.beauty_booking_requests.booking_date is '고객이 요청한 예약 날짜.';
comment on column public.beauty_booking_requests.booking_time is '고객이 요청한 예약 시간 문자열.';
comment on column public.beauty_booking_requests.designer_id is '선택한 디자이너 식별자.';
comment on column public.beauty_booking_requests.designer_name is '선택한 디자이너 표시 이름.';
comment on column public.beauty_booking_requests.primary_service_id is '대표 시술 식별자.';
comment on column public.beauty_booking_requests.primary_service_name is '대표 시술 표시 이름.';
comment on column public.beauty_booking_requests.add_on_ids is '추가 옵션 식별자 배열.';
comment on column public.beauty_booking_requests.add_on_names is '추가 옵션 표시 이름 배열.';
comment on column public.beauty_booking_requests.base_price is '대표 시술 기본 금액.';
comment on column public.beauty_booking_requests.add_on_price is '추가 옵션 합산 금액.';
comment on column public.beauty_booking_requests.designer_surcharge is '디자이너 선택 추가 금액.';
comment on column public.beauty_booking_requests.total_price is '예약 총 금액. 현재 결제 상태와는 분리되지 않은 표시용 합계.';
comment on column public.beauty_booking_requests.customer_name is '예약자 이름.';
comment on column public.beauty_booking_requests.customer_email is '예약자 이메일.';
comment on column public.beauty_booking_requests.customer_phone is '예약자 연락처.';
comment on column public.beauty_booking_requests.customer_request is '고객 요청사항 원문.';
comment on column public.beauty_booking_requests.current_image_url is '현재 상태 이미지 URL 스냅샷.';
comment on column public.beauty_booking_requests.style_image_url is '희망 스타일 이미지 URL 스냅샷.';
comment on column public.beauty_booking_requests.image_urls is '구버전 또는 보조 이미지 URL 배열.';
comment on column public.beauty_booking_requests.communication_language is '고객과 매장 간 소통 언어 코드.';
comment on column public.beauty_booking_requests.communication_intent is '소통 목적 코드. 예: booking_confirm, service_request.';
comment on column public.beauty_booking_requests.korean_message is '소통 메시지의 한국어 기준 문안.';
comment on column public.beauty_booking_requests.localized_message is '소통 메시지의 현지어 문안.';
comment on column public.beauty_booking_requests.agreements is '약관 동의 상태 JSON 스냅샷.';
comment on column public.beauty_booking_requests.created_from_flow is '예약이 생성된 UI 흐름 식별값.';
comment on column public.beauty_booking_requests.payload_json is '예약 제출 당시 원본 payload 전체 스냅샷.';
comment on column public.beauty_booking_requests.status is '예약 운영 상태. 허용값 requested, confirmed, completed, canceled, failed, change_requested. 결제 상태와 별도.';
comment on column public.beauty_booking_requests.canceled_at is '예약 취소 시각.';
comment on column public.beauty_booking_requests.canceled_by is '예약 취소 주체. customer 또는 admin.';
comment on column public.beauty_booking_requests.cancel_reason is '예약 취소 사유.';
comment on column public.beauty_booking_requests.change_requested_at is '고객 변경 요청 접수 시각.';
comment on column public.beauty_booking_requests.change_reason is '고객 변경 요청 사유.';
comment on column public.beauty_booking_requests.status_before_change_request is 'change_requested 진입 직전 상태 스냅샷. 변경 요청 검토 완료 후 복귀 기준.';
comment on column public.beauty_booking_requests.change_request_status is '변경 요청 검토 상태. approved, rejected, pending.';
comment on column public.beauty_booking_requests.change_reviewed_at is '변경 요청 검토 완료 시각.';
comment on column public.beauty_booking_requests.change_reviewed_by is '변경 요청을 검토한 관리자 auth.users ID.';
comment on column public.beauty_booking_requests.change_review_note is '변경 요청 검토 메모.';
comment on column public.beauty_booking_requests.operator_status is '운영자 내부 진행 상태. 고객에게 노출되는 최종 예약 status와 별도.';
comment on column public.beauty_booking_requests.internal_note is '운영자 내부 메모.';
comment on column public.beauty_booking_requests.shop_contacted is '매장 연락 여부.';
comment on column public.beauty_booking_requests.customer_contacted is '고객 연락 여부.';
comment on column public.beauty_booking_requests.follow_up_needed is '후속 확인 필요 여부.';
comment on column public.beauty_booking_requests.alternative_offer_status is '대체 일정 제안 상태. none, offered, accepted, rejected.';
comment on column public.beauty_booking_requests.alternative_offer_items is '운영자가 제안한 대체 일정 목록 JSON.';
comment on column public.beauty_booking_requests.alternative_offer_note is '대체 일정 제안 메모.';
comment on column public.beauty_booking_requests.alternative_offered_at is '대체 일정 제안 시각.';
comment on column public.beauty_booking_requests.alternative_offered_by is '대체 일정을 제안한 관리자 auth.users ID.';
comment on column public.beauty_booking_requests.alternative_response_at is '고객이 대체 일정에 응답한 시각.';
comment on column public.beauty_booking_requests.created_at is '예약 요청 생성 시각.';
comment on column public.beauty_booking_requests.updated_at is '예약 요청 최종 수정 시각.';

comment on table public.beauty_booking_request_images is
  '뷰티 예약 요청 이미지 메타데이터 테이블. 원본 파일은 Supabase Storage에 있고 이 테이블은 경로와 파일 정보를 보관한다.';
comment on column public.beauty_booking_request_images.id is '예약 이미지 메타데이터 기본 키.';
comment on column public.beauty_booking_request_images.request_id is '연결된 beauty_booking_requests.id.';
comment on column public.beauty_booking_request_images.user_id is '이미지를 업로드한 auth.users 사용자 ID.';
comment on column public.beauty_booking_request_images.image_type is '이미지 용도. current 또는 style.';
comment on column public.beauty_booking_request_images.bucket_name is '원본 이미지가 저장된 Supabase Storage 버킷명.';
comment on column public.beauty_booking_request_images.storage_path is 'Storage 내부 파일 경로.';
comment on column public.beauty_booking_request_images.original_file_name is '사용자가 업로드한 원본 파일명.';
comment on column public.beauty_booking_request_images.created_at is '이미지 메타데이터 생성 시각.';

comment on table public.beauty_booking_notifications is
  '뷰티 예약 알림 이력 테이블. 인앱 표시와 외부 채널 발송 추적을 함께 저장한다.';
comment on column public.beauty_booking_notifications.id is '예약 알림 기본 키.';
comment on column public.beauty_booking_notifications.created_at is '알림 생성 시각.';
comment on column public.beauty_booking_notifications.user_id is '알림 수신 대상 auth.users 사용자 ID.';
comment on column public.beauty_booking_notifications.booking_id is '연결된 beauty_booking_requests.id.';
comment on column public.beauty_booking_notifications.event_type is '알림 이벤트 유형 코드. 예: booking_created, booking_confirmed.';
comment on column public.beauty_booking_notifications.title is '알림 제목.';
comment on column public.beauty_booking_notifications.message is '알림 본문.';
comment on column public.beauty_booking_notifications.channel is '발송 채널. 예: in_app, email, sms, push.';
comment on column public.beauty_booking_notifications.status is '알림 읽음 또는 내부 상태 컬럼. 현재 코드에서는 read 표시와 함께 사용된다.';
comment on column public.beauty_booking_notifications.metadata_json is '알림 템플릿 렌더링용 보조 데이터 JSON.';
comment on column public.beauty_booking_notifications.read_at is '사용자가 알림을 읽은 시각.';
comment on column public.beauty_booking_notifications.dispatch_status is '외부 채널 발송 결과 상태. pending, sent, failed.';
comment on column public.beauty_booking_notifications.error_log is '발송 실패 시 오류 로그.';
comment on column public.beauty_booking_notifications.dispatched_at is '외부 채널 발송 완료 시각.';
comment on column public.beauty_booking_notifications.resend_count is '관리자 재발송 누적 횟수.';
comment on column public.beauty_booking_notifications.last_resent_at is '최근 재발송 시각.';
comment on column public.beauty_booking_notifications.resent_by is '최근 재발송을 수행한 관리자 auth.users ID.';

comment on table public.beauty_notification_preferences is
  '뷰티 예약 알림 수신 설정 테이블. 사용자별 채널 및 이벤트 유형 허용 여부를 저장한다.';
comment on column public.beauty_notification_preferences.user_id is '설정 소유자 auth.users 사용자 ID.';
comment on column public.beauty_notification_preferences.in_app_enabled is '인앱 알림 수신 허용 여부.';
comment on column public.beauty_notification_preferences.email_enabled is '이메일 알림 수신 허용 여부.';
comment on column public.beauty_notification_preferences.booking_updates_enabled is '일반 예약 상태 알림 수신 허용 여부.';
comment on column public.beauty_notification_preferences.change_request_updates_enabled is '변경 요청 관련 알림 수신 허용 여부.';
comment on column public.beauty_notification_preferences.alternative_offer_updates_enabled is '대체 일정 제안 관련 알림 수신 허용 여부.';
comment on column public.beauty_notification_preferences.updated_at is '설정 최종 수정 시각.';

comment on table public.booking_records is
  '홈 translator 또는 컨시어지 세션에서 생성되는 간이 예약 기록. beauty_booking_requests와 다른 도메인이다.';
comment on column public.booking_records.id is '세션 기반 예약 레코드 식별자.';
comment on column public.booking_records.session_id is '연결된 interpreter 또는 concierge 세션 식별자.';
comment on column public.booking_records.service_name is '세션에서 확인된 서비스 이름.';
comment on column public.booking_records.booking_date is '세션에서 확인된 예약 날짜.';
comment on column public.booking_records.booking_time is '세션에서 확인된 예약 시간.';
comment on column public.booking_records.status is 'translator booking 상태. 허용값 confirmed, cancelled. beauty_booking_requests.status와 별도.';
comment on column public.booking_records.notes is '세션에서 추출된 메모 또는 보조 설명.';
comment on column public.booking_records.created_at is '레코드 생성 시각.';
comment on column public.booking_records.updated_at is '레코드 최종 수정 시각.';

comment on table public.booking_concierge_events is
  '홈 translator 또는 컨시어지 대화 이벤트 로그. 예약 자체가 아니라 대화 처리 이력을 저장한다.';
comment on column public.booking_concierge_events.id is '대화 이벤트 기본 키.';
comment on column public.booking_concierge_events.session_id is '연결된 세션 식별자.';
comment on column public.booking_concierge_events.customer_locale is '고객 언어 또는 로케일 코드.';
comment on column public.booking_concierge_events.original_text is '사용자 원문 입력.';
comment on column public.booking_concierge_events.normalized_text is '전처리 또는 정규화된 입력 문장.';
comment on column public.booking_concierge_events.response_ko is '한국어 기준 응답 문안.';
comment on column public.booking_concierge_events.response_localized is '고객 언어 기준 응답 문안.';
comment on column public.booking_concierge_events.structured_output is '대화에서 추출한 구조화 결과 JSON.';
comment on column public.booking_concierge_events.tools is '대화 처리 중 사용한 도구 호출 기록 JSON.';
comment on column public.booking_concierge_events.booking_id is '연결된 booking_records.id. beauty_booking_requests.id를 가리키지 않는다.';
comment on column public.booking_concierge_events.created_at is '대화 이벤트 생성 시각.';

comment on table public.profiles is
  'auth.users를 보조하는 사용자 프로필 및 앱 권한 테이블.';
comment on column public.profiles.id is 'auth.users.id와 동일한 사용자 기본 키.';
comment on column public.profiles.role is '앱 권한 역할. 예: admin, super_admin.';
comment on column public.profiles.is_admin is '레거시 관리자 boolean 플래그. 최종 권한은 role과 함께 확인 필요.';
comment on column public.profiles.display_name is '기본 표시 이름.';
comment on column public.profiles.phone is '사용자 연락처.';
comment on column public.profiles.avatar_url is '프로필 이미지 공개 URL 스냅샷.';
comment on column public.profiles.avatar_path is '프로필 이미지 Storage 경로.';
comment on column public.profiles.sns is 'SNS 또는 외부 연락 채널 정보.';
comment on column public.profiles.referral_code is '사용자 추천 코드.';
comment on column public.profiles.created_at is '프로필 생성 시각.';
comment on column public.profiles.nickname is '사용자 닉네임.';
comment on column public.profiles.country is '사용자 국가 또는 기본 로케일 코드.';

comment on table public.partners is
  '파트너 또는 매장 제휴 신청과 심사 상태를 저장하는 테이블.';
comment on column public.partners.id is '파트너 신청 기본 키.';
comment on column public.partners.company_name is '업체명.';
comment on column public.partners.business_type is '업종 또는 비즈니스 유형.';
comment on column public.partners.contact_name is '담당자 이름.';
comment on column public.partners.email is '담당자 이메일. 파트너 상태 매핑에도 사용된다.';
comment on column public.partners.phone is '담당자 연락처.';
comment on column public.partners.address is '업체 주소.';
comment on column public.partners.website is '업체 웹사이트.';
comment on column public.partners.description is '업체 소개.';
comment on column public.partners.status is '심사 상태. pending, approved, rejected.';
comment on column public.partners.reject_reason is '거절 사유.';
comment on column public.partners.visibility_status is '탐색 화면 또는 외부 노출 허용 여부. 승인 상태와 별도로 관리.';
comment on column public.partners.created_at is '신청 생성 시각.';
comment on column public.partners.reviewed_at is '심사 완료 시각.';

create schema if not exists admin;
revoke all on schema admin from public;
revoke all on schema admin from anon;
revoke all on schema admin from authenticated;
grant usage on schema admin to service_role;

drop view if exists public.admin_beauty_booking_requests_ko;
drop view if exists public.admin_booking_records_ko;
drop view if exists admin.admin_beauty_booking_requests_ko;
create view admin.admin_beauty_booking_requests_ko
with (security_invoker = true) as
select
  b.id,
  b.created_at,
  b.updated_at,
  b.status,
  case b.status
    when 'requested' then '접수됨'
    when 'confirmed' then '예약 확정'
    when 'completed' then '시술 완료'
    when 'canceled' then '취소됨'
    when 'failed' then '처리 실패'
    when 'change_requested' then '변경 요청됨'
    else b.status
  end as status_ko,
  b.change_request_status,
  case b.change_request_status
    when 'pending' then '검토 대기'
    when 'approved' then '승인됨'
    when 'rejected' then '반려됨'
    else b.change_request_status
  end as change_request_status_ko,
  b.operator_status,
  case b.operator_status
    when 'pending_assignment' then '배정 대기'
    when 'awaiting_shop_reply' then '매장 회신 대기'
    when 'awaiting_customer_reply' then '고객 회신 대기'
    when 'alternative_time_needed' then '대체 시간 필요'
    when 'ready_to_confirm' then '확정 준비 완료'
    when 'unable_to_book' then '예약 불가'
    else b.operator_status
  end as operator_status_ko,
  b.alternative_offer_status,
  case b.alternative_offer_status
    when 'none' then '없음'
    when 'offered' then '제안됨'
    when 'accepted' then '수락됨'
    when 'rejected' then '거절됨'
    else b.alternative_offer_status
  end as alternative_offer_status_ko,
  b.canceled_by,
  case b.canceled_by
    when 'customer' then '고객'
    when 'admin' then '관리자'
    else null
  end as canceled_by_ko,
  b.customer_user_id,
  p.role as customer_role,
  p.is_admin as customer_is_admin,
  p.display_name as customer_profile_display_name,
  p.nickname as customer_profile_nickname,
  p.country as customer_profile_country,
  b.beauty_category,
  case b.beauty_category
    when 'hair' then '헤어'
    when 'nail' then '네일'
    when 'esthetic' then '에스테틱'
    when 'waxing' then '왁싱'
    when 'makeup' then '메이크업'
    when 'lash' then '속눈썹'
    else b.beauty_category
  end as beauty_category_ko,
  b.region,
  b.store_id,
  b.store_name,
  b.booking_date,
  b.booking_time,
  b.designer_id,
  b.designer_name,
  b.primary_service_id,
  b.primary_service_name,
  b.add_on_ids,
  b.add_on_names,
  b.base_price,
  b.add_on_price,
  b.designer_surcharge,
  b.total_price,
  b.customer_name,
  b.customer_email,
  b.customer_phone,
  b.customer_request,
  b.communication_language,
  b.communication_intent,
  b.korean_message,
  b.localized_message,
  b.agreements,
  b.created_from_flow,
  b.current_image_url,
  b.style_image_url,
  b.image_urls,
  img.current_image_bucket_name,
  img.current_image_path,
  img.current_image_name,
  img.current_image_count,
  img.style_image_bucket_name,
  img.style_image_path,
  img.style_image_name,
  img.style_image_count,
  b.canceled_at,
  b.cancel_reason,
  b.change_requested_at,
  b.change_reason,
  b.status_before_change_request,
  b.change_reviewed_at,
  b.change_reviewed_by,
  b.change_review_note,
  b.internal_note,
  b.shop_contacted,
  b.customer_contacted,
  b.follow_up_needed,
  b.alternative_offer_items,
  b.alternative_offer_note,
  b.alternative_offered_at,
  b.alternative_offered_by,
  b.alternative_response_at
from public.beauty_booking_requests as b
left join public.profiles as p
  on p.id = b.customer_user_id
left join lateral (
  select
    max(i.bucket_name) filter (where i.image_type = 'current') as current_image_bucket_name,
    max(i.storage_path) filter (where i.image_type = 'current') as current_image_path,
    max(i.original_file_name) filter (where i.image_type = 'current') as current_image_name,
    count(*) filter (where i.image_type = 'current') as current_image_count,
    max(i.bucket_name) filter (where i.image_type = 'style') as style_image_bucket_name,
    max(i.storage_path) filter (where i.image_type = 'style') as style_image_path,
    max(i.original_file_name) filter (where i.image_type = 'style') as style_image_name,
    count(*) filter (where i.image_type = 'style') as style_image_count
  from public.beauty_booking_request_images as i
  where i.request_id = b.id
) as img
  on true;

comment on view admin.admin_beauty_booking_requests_ko is
  '관리자용 읽기 전용 조회 뷰 초안. beauty_booking_requests 원본 status는 유지하고 status_ko 등 한글 표시 컬럼만 추가한다.';

revoke all on admin.admin_beauty_booking_requests_ko from public;
revoke all on admin.admin_beauty_booking_requests_ko from anon;
revoke all on admin.admin_beauty_booking_requests_ko from authenticated;
grant select on admin.admin_beauty_booking_requests_ko to service_role;

drop view if exists admin.admin_booking_records_ko;
create view admin.admin_booking_records_ko
with (security_invoker = true) as
select
  br.id,
  br.session_id,
  br.service_name,
  br.booking_date,
  br.booking_time,
  br.status,
  case br.status
    when 'confirmed' then '확정'
    when 'cancelled' then '취소됨'
    else br.status
  end as status_ko,
  br.notes,
  br.created_at,
  br.updated_at,
  event_count.concierge_event_count,
  latest_event.latest_event_id,
  latest_event.latest_event_at,
  latest_event.latest_customer_locale,
  latest_event.latest_original_text,
  latest_event.latest_response_ko,
  latest_event.latest_response_localized
from public.booking_records as br
left join lateral (
  select count(*) as concierge_event_count
  from public.booking_concierge_events as e
  where e.session_id = br.session_id
) as event_count
  on true
left join lateral (
  select
    e.id as latest_event_id,
    e.created_at as latest_event_at,
    e.customer_locale as latest_customer_locale,
    e.original_text as latest_original_text,
    e.response_ko as latest_response_ko,
    e.response_localized as latest_response_localized
  from public.booking_concierge_events as e
  where e.session_id = br.session_id
  order by e.created_at desc
  limit 1
) as latest_event
  on true;

comment on view admin.admin_booking_records_ko is
  '관리자용 읽기 전용 조회 뷰 초안. booking_records는 home translator 도메인 예약이며 beauty_booking_requests와 별도다.';

revoke all on admin.admin_booking_records_ko from public;
revoke all on admin.admin_booking_records_ko from anon;
revoke all on admin.admin_booking_records_ko from authenticated;
grant select on admin.admin_booking_records_ko to service_role;

commit;
