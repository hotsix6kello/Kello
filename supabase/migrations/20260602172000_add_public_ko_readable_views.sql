begin;

drop view if exists public.profiles_ko;
create view public.profiles_ko
with (security_invoker = true) as
select
  id as "사용자ID",
  role as "권한역할",
  is_admin as "관리자여부",
  display_name as "표시이름",
  phone as "전화번호",
  avatar_url as "아바타URL",
  avatar_path as "아바타경로",
  sns as "SNS",
  referral_code as "추천코드",
  created_at as "생성일시",
  nickname as "닉네임",
  country as "국가코드"
from public.profiles;

revoke all on public.profiles_ko from public;
revoke all on public.profiles_ko from anon;
revoke all on public.profiles_ko from authenticated;
grant select on public.profiles_ko to service_role;

drop view if exists public.beauty_booking_requests_ko;
create view public.beauty_booking_requests_ko
with (security_invoker = true) as
select
  id as "예약요청ID",
  category as "카테고리",
  customer_user_id as "고객사용자ID",
  beauty_category as "뷰티카테고리",
  region as "지역",
  store_id as "매장ID",
  store_name as "매장명",
  booking_date as "예약일",
  booking_time as "예약시간",
  designer_id as "디자이너ID",
  designer_name as "디자이너명",
  primary_service_id as "대표시술ID",
  primary_service_name as "대표시술명",
  add_on_ids as "추가옵션ID목록",
  add_on_names as "추가옵션명목록",
  base_price as "기본금액",
  add_on_price as "추가옵션금액",
  designer_surcharge as "디자이너추가금액",
  total_price as "총금액",
  customer_name as "고객명",
  customer_email as "고객이메일",
  customer_phone as "고객전화번호",
  customer_request as "고객요청사항",
  current_image_url as "현재이미지URL",
  style_image_url as "스타일이미지URL",
  image_urls as "이미지URL목록",
  communication_language as "소통언어",
  communication_intent as "소통의도",
  korean_message as "한국어메시지",
  localized_message as "현지어메시지",
  agreements as "동의내역JSON",
  created_from_flow as "생성플로우",
  payload_json as "원본페이로드JSON",
  status as "예약상태",
  canceled_at as "취소일시",
  canceled_by as "취소주체",
  cancel_reason as "취소사유",
  change_requested_at as "변경요청일시",
  change_reason as "변경요청사유",
  status_before_change_request as "변경요청전상태",
  change_request_status as "변경요청상태",
  change_reviewed_at as "변경검토일시",
  change_reviewed_by as "변경검토자ID",
  change_review_note as "변경검토메모",
  operator_status as "운영상태",
  internal_note as "내부메모",
  shop_contacted as "매장연락여부",
  customer_contacted as "고객연락여부",
  follow_up_needed as "후속확인필요여부",
  alternative_offer_status as "대체제안상태",
  alternative_offer_items as "대체제안항목JSON",
  alternative_offer_note as "대체제안메모",
  alternative_offered_at as "대체제안일시",
  alternative_offered_by as "대체제안자ID",
  alternative_response_at as "대체응답일시",
  created_at as "생성일시",
  updated_at as "수정일시"
from public.beauty_booking_requests;

revoke all on public.beauty_booking_requests_ko from public;
revoke all on public.beauty_booking_requests_ko from anon;
revoke all on public.beauty_booking_requests_ko from authenticated;
grant select on public.beauty_booking_requests_ko to service_role;

drop view if exists public.beauty_booking_request_images_ko;
create view public.beauty_booking_request_images_ko
with (security_invoker = true) as
select
  id as "이미지ID",
  request_id as "예약요청ID",
  user_id as "사용자ID",
  image_type as "이미지유형",
  bucket_name as "버킷명",
  storage_path as "저장경로",
  original_file_name as "원본파일명",
  created_at as "생성일시"
from public.beauty_booking_request_images;

revoke all on public.beauty_booking_request_images_ko from public;
revoke all on public.beauty_booking_request_images_ko from anon;
revoke all on public.beauty_booking_request_images_ko from authenticated;
grant select on public.beauty_booking_request_images_ko to service_role;

drop view if exists public.beauty_booking_notifications_ko;
create view public.beauty_booking_notifications_ko
with (security_invoker = true) as
select
  id as "알림ID",
  created_at as "생성일시",
  user_id as "사용자ID",
  booking_id as "예약요청ID",
  event_type as "이벤트유형",
  title as "제목",
  message as "메시지",
  channel as "채널",
  status as "상태",
  metadata_json as "메타데이터JSON",
  read_at as "읽음일시",
  dispatch_status as "발송상태",
  error_log as "오류로그",
  dispatched_at as "발송일시",
  resend_count as "재발송횟수",
  last_resent_at as "최근재발송일시",
  resent_by as "재발송자ID"
from public.beauty_booking_notifications;

revoke all on public.beauty_booking_notifications_ko from public;
revoke all on public.beauty_booking_notifications_ko from anon;
revoke all on public.beauty_booking_notifications_ko from authenticated;
grant select on public.beauty_booking_notifications_ko to service_role;

drop view if exists public.beauty_notification_preferences_ko;
create view public.beauty_notification_preferences_ko
with (security_invoker = true) as
select
  user_id as "사용자ID",
  in_app_enabled as "인앱알림허용",
  email_enabled as "이메일알림허용",
  booking_updates_enabled as "예약업데이트알림허용",
  change_request_updates_enabled as "변경요청알림허용",
  alternative_offer_updates_enabled as "대체제안알림허용",
  updated_at as "수정일시"
from public.beauty_notification_preferences;

revoke all on public.beauty_notification_preferences_ko from public;
revoke all on public.beauty_notification_preferences_ko from anon;
revoke all on public.beauty_notification_preferences_ko from authenticated;
grant select on public.beauty_notification_preferences_ko to service_role;

drop view if exists public.booking_records_ko;
create view public.booking_records_ko
with (security_invoker = true) as
select
  id as "예약기록ID",
  session_id as "세션ID",
  service_name as "서비스명",
  booking_date as "예약일",
  booking_time as "예약시간",
  status as "상태",
  notes as "메모",
  created_at as "생성일시",
  updated_at as "수정일시"
from public.booking_records;

revoke all on public.booking_records_ko from public;
revoke all on public.booking_records_ko from anon;
revoke all on public.booking_records_ko from authenticated;
grant select on public.booking_records_ko to service_role;

drop view if exists public.booking_concierge_events_ko;
create view public.booking_concierge_events_ko
with (security_invoker = true) as
select
  id as "이벤트ID",
  session_id as "세션ID",
  customer_locale as "고객로케일",
  original_text as "원문텍스트",
  normalized_text as "정규화텍스트",
  response_ko as "한국어응답",
  response_localized as "현지어응답",
  structured_output as "구조화출력JSON",
  tools as "도구기록JSON",
  booking_id as "예약기록ID",
  created_at as "생성일시"
from public.booking_concierge_events;

revoke all on public.booking_concierge_events_ko from public;
revoke all on public.booking_concierge_events_ko from anon;
revoke all on public.booking_concierge_events_ko from authenticated;
grant select on public.booking_concierge_events_ko to service_role;

drop view if exists public.community_posts_ko;
create view public.community_posts_ko
with (security_invoker = true) as
select
  id as "게시글ID",
  author as "작성자",
  flag as "말머리",
  type as "유형",
  title as "제목",
  "desc" as "설명",
  time as "시간표시",
  comments as "댓글수",
  likes_count as "좋아요수",
  dislikes_count as "싫어요수",
  created_at as "생성일시"
from public.community_posts;

revoke all on public.community_posts_ko from public;
revoke all on public.community_posts_ko from anon;
revoke all on public.community_posts_ko from authenticated;
grant select on public.community_posts_ko to service_role;

drop view if exists public.community_comments_ko;
create view public.community_comments_ko
with (security_invoker = true) as
select
  id as "댓글ID",
  post_id as "게시글ID",
  author as "작성자",
  author_user_id as "작성자사용자ID",
  content as "내용",
  created_at as "생성일시"
from public.community_comments;

revoke all on public.community_comments_ko from public;
revoke all on public.community_comments_ko from anon;
revoke all on public.community_comments_ko from authenticated;
grant select on public.community_comments_ko to service_role;

drop view if exists public.community_reactions_ko;
create view public.community_reactions_ko
with (security_invoker = true) as
select
  id as "반응ID",
  post_id as "게시글ID",
  user_id as "사용자ID",
  reaction_type as "반응유형",
  created_at as "생성일시"
from public.community_reactions;

revoke all on public.community_reactions_ko from public;
revoke all on public.community_reactions_ko from anon;
revoke all on public.community_reactions_ko from authenticated;
grant select on public.community_reactions_ko to service_role;

drop view if exists public.coupons_ko;
create view public.coupons_ko
with (security_invoker = true) as
select
  id as "쿠폰ID",
  user_id as "사용자ID",
  discount_type as "할인유형",
  discount_value as "할인값",
  issue_reason as "발급사유",
  is_used as "사용여부",
  created_at as "생성일시"
from public.coupons;

revoke all on public.coupons_ko from public;
revoke all on public.coupons_ko from anon;
revoke all on public.coupons_ko from authenticated;
grant select on public.coupons_ko to service_role;

drop view if exists public.interpreter_sessions_ko;
create view public.interpreter_sessions_ko
with (security_invoker = true) as
select
  id as "세션ID",
  ephemeral_token as "임시토큰",
  customer_locale as "고객로케일",
  staff_locale as "직원로케일",
  expires_at as "만료일시",
  created_at as "생성일시"
from public.interpreter_sessions;

revoke all on public.interpreter_sessions_ko from public;
revoke all on public.interpreter_sessions_ko from anon;
revoke all on public.interpreter_sessions_ko from authenticated;
grant select on public.interpreter_sessions_ko to service_role;

drop view if exists public.interpreter_turns_ko;
create view public.interpreter_turns_ko
with (security_invoker = true) as
select
  id as "턴ID",
  session_id as "세션ID",
  speaker as "화자",
  source_locale as "원문로케일",
  target_locale as "대상로케일",
  input_mode as "입력방식",
  original_text as "원문텍스트",
  translated_text as "번역텍스트",
  created_at as "생성일시"
from public.interpreter_turns;

revoke all on public.interpreter_turns_ko from public;
revoke all on public.interpreter_turns_ko from anon;
revoke all on public.interpreter_turns_ko from authenticated;
grant select on public.interpreter_turns_ko to service_role;

drop view if exists public.partners_ko;
create view public.partners_ko
with (security_invoker = true) as
select
  id as "파트너ID",
  company_name as "업체명",
  business_type as "업종",
  contact_name as "담당자명",
  email as "이메일",
  phone as "전화번호",
  address as "주소",
  website as "웹사이트",
  description as "설명",
  status as "상태",
  reject_reason as "거절사유",
  visibility_status as "노출상태",
  created_at as "생성일시",
  reviewed_at as "검토일시"
from public.partners;

revoke all on public.partners_ko from public;
revoke all on public.partners_ko from anon;
revoke all on public.partners_ko from authenticated;
grant select on public.partners_ko to service_role;

drop view if exists public.referrals_ko;
create view public.referrals_ko
with (security_invoker = true) as
select
  id as "추천관계ID",
  referrer_id as "추천인ID",
  referred_id as "피추천인ID",
  created_at as "생성일시"
from public.referrals;

revoke all on public.referrals_ko from public;
revoke all on public.referrals_ko from anon;
revoke all on public.referrals_ko from authenticated;
grant select on public.referrals_ko to service_role;

drop view if exists public.translation_batch_jobs_ko;
create view public.translation_batch_jobs_ko
with (security_invoker = true) as
select
  id as "배치작업ID",
  domain as "도메인",
  content_type as "콘텐츠유형",
  requested_locales as "요청로케일목록",
  status as "상태",
  queued_count as "대기건수",
  processed_count as "처리건수",
  translated_count as "번역완료건수",
  failed_count as "실패건수",
  summary as "요약JSON",
  created_at as "생성일시",
  started_at as "시작일시",
  completed_at as "완료일시"
from public.translation_batch_jobs;

revoke all on public.translation_batch_jobs_ko from public;
revoke all on public.translation_batch_jobs_ko from anon;
revoke all on public.translation_batch_jobs_ko from authenticated;
grant select on public.translation_batch_jobs_ko to service_role;

drop view if exists public.translation_contents_ko;
create view public.translation_contents_ko
with (security_invoker = true) as
select
  id as "번역콘텐츠ID",
  domain as "도메인",
  content_type as "콘텐츠유형",
  source_table as "원본테이블명",
  source_id as "원본ID",
  source_locale as "원본로케일",
  source_version as "원본버전",
  schema_version as "스키마버전",
  mode as "모드",
  source_hash as "원본해시",
  source_payload as "원본페이로드JSON",
  source_fields as "원본필드JSON",
  target_locales as "대상로케일목록",
  status as "상태",
  error_message as "오류메시지",
  metadata as "메타데이터JSON",
  created_at as "생성일시",
  updated_at as "수정일시"
from public.translation_contents;

revoke all on public.translation_contents_ko from public;
revoke all on public.translation_contents_ko from anon;
revoke all on public.translation_contents_ko from authenticated;
grant select on public.translation_contents_ko to service_role;

drop view if exists public.translation_glossary_ko;
create view public.translation_glossary_ko
with (security_invoker = true) as
select
  id as "용어집ID",
  domain as "도메인",
  source_locale as "원본로케일",
  target_locale as "대상로케일",
  source_term as "원본용어",
  target_term as "대상용어",
  priority as "우선순위",
  version as "버전",
  notes as "메모",
  is_active as "활성여부",
  updated_by as "수정자",
  created_at as "생성일시",
  updated_at as "수정일시"
from public.translation_glossary;

revoke all on public.translation_glossary_ko from public;
revoke all on public.translation_glossary_ko from anon;
revoke all on public.translation_glossary_ko from authenticated;
grant select on public.translation_glossary_ko to service_role;

drop view if exists public.translation_versions_ko;
create view public.translation_versions_ko
with (security_invoker = true) as
select
  id as "번역버전ID",
  content_id as "콘텐츠ID",
  target_locale as "대상로케일",
  version as "버전",
  cache_key as "캐시키",
  source_hash as "원본해시",
  translation_engine as "번역엔진",
  glossary_version as "용어집버전",
  translated_text as "번역텍스트",
  translated_payload as "번역페이로드JSON",
  translated_fields as "번역필드JSON",
  fallback_used as "폴백사용여부",
  status as "상태",
  error_message as "오류메시지",
  metadata as "메타데이터JSON",
  created_at as "생성일시"
from public.translation_versions;

revoke all on public.translation_versions_ko from public;
revoke all on public.translation_versions_ko from anon;
revoke all on public.translation_versions_ko from authenticated;
grant select on public.translation_versions_ko to service_role;

drop view if exists public.visitor_logs_ko;
create view public.visitor_logs_ko
with (security_invoker = true) as
select
  id as "방문로그ID",
  visitor_id as "방문자ID",
  visit_date as "방문일",
  created_at as "생성일시"
from public.visitor_logs;

revoke all on public.visitor_logs_ko from public;
revoke all on public.visitor_logs_ko from anon;
revoke all on public.visitor_logs_ko from authenticated;
grant select on public.visitor_logs_ko to service_role;

commit;
