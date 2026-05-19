# Kello 예약 저장/어드민 확인 테스트

## 1. 일반 유저 예약 테스트 순서

- 로그인
- 홈 예약 시작
- 예약 정보 입력
- 현재 사진 첨부
- 스타일 사진 첨부
- 예약 제출

## 2. Supabase 확인 테이블

- `beauty_booking_requests`
- `beauty_booking_request_images`

## 3. 확인할 컬럼

- 예약 row 확인 컬럼
  - `id`
  - `status`
  - `store_name`
  - `booking_date`
  - `booking_time`
  - `primary_service_name`
  - `customer_name`
  - `customer_email`
  - `customer_phone`
  - `customer_request`
  - `created_from_flow`
  - `payload_json`
- 이미지 row 확인 컬럼
  - `request_id`
  - `user_id`
  - `image_type`
  - `bucket_name`
  - `storage_path`
  - `original_file_name`

## 4. 어드민 확인

- `/admin/bookings/beauty` 접속
- 예약 목록 확인
- 고객 정보 확인
- 이미지 보기 버튼 확인

## 5. 이미지가 안 보일 때 확인할 것

- `beauty_booking_request_images.storage_path`
- `bucket_name`
- signed-url API 응답
- 어드민 권한
- Storage bucket 권한
