-- Kello (고객 앱) <-> Kello Partner 제휴 매장 연동: Phase 1
-- 제휴 매장(stores)의 영업시간(business_hours), 휴무일(closed_dates), 슬롯 간격
-- (slot_interval_minutes), 준비 시간(lead_time_hours), 동시 처리 가능 인원(capacity)을
-- 기준으로 특정 날짜에 예약 가능한 시간(time) 목록을 계산한다.
--
-- service_role(서버)에서만 호출되므로 SECURITY DEFINER로 생성하여
-- stores/business_hours/closed_dates의 owner-only RLS를 우회할 수 있도록 한다.
-- (해당 테이블들의 RLS 정책 자체는 변경하지 않는다.)

CREATE OR REPLACE FUNCTION public.get_partner_available_slots(
  p_store_id uuid,
  p_date date,
  p_duration_min int
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week     int;
  v_hours           record;
  v_slot_interval   int;
  v_lead_time_hours int;
  v_capacity        int;
  v_slot_time       time;
  v_slot_end        time;
  v_slot_datetime   timestamp;
  v_earliest        timestamp;
  v_booked_count    int;
  v_slots           text[] := array[]::text[];
BEGIN
  -- 휴무일이면 빈 배열 반환
  IF EXISTS (
    SELECT 1 FROM public.closed_dates
    WHERE store_id = p_store_id AND closed_date = p_date
  ) THEN
    RETURN v_slots;
  END IF;

  SELECT slot_interval_minutes, lead_time_hours, capacity
  INTO v_slot_interval, v_lead_time_hours, v_capacity
  FROM public.stores
  WHERE id = p_store_id;

  IF NOT FOUND THEN
    RETURN v_slots;
  END IF;

  IF v_slot_interval IS NULL OR v_slot_interval <= 0 THEN
    v_slot_interval := 30;
  END IF;
  IF v_lead_time_hours IS NULL THEN
    v_lead_time_hours := 0;
  END IF;
  IF v_capacity IS NULL OR v_capacity <= 0 THEN
    v_capacity := 1;
  END IF;

  -- Postgres EXTRACT(DOW): 0 = 일요일 ... 6 = 토요일 (business_hours.day_of_week과 동일 규약 가정)
  v_day_of_week := EXTRACT(DOW FROM p_date)::int;

  SELECT * INTO v_hours
  FROM public.business_hours
  WHERE store_id = p_store_id AND day_of_week = v_day_of_week;

  IF NOT FOUND OR v_hours.is_open IS NOT TRUE
     OR v_hours.start_time IS NULL OR v_hours.end_time IS NULL THEN
    RETURN v_slots;
  END IF;

  v_earliest := now() + (v_lead_time_hours || ' hours')::interval;
  v_slot_time := v_hours.start_time;

  WHILE (v_slot_time + (p_duration_min || ' minutes')::interval) <= v_hours.end_time LOOP
    v_slot_end := v_slot_time + (p_duration_min || ' minutes')::interval;

    -- 휴게시간과 겹치는 슬롯은 제외
    IF v_hours.break_start_time IS NOT NULL AND v_hours.break_end_time IS NOT NULL
       AND v_slot_time < v_hours.break_end_time AND v_slot_end > v_hours.break_start_time THEN
      NULL;
    ELSE
      v_slot_datetime := p_date + v_slot_time;

      -- 준비 시간(lead_time_hours) 이전 슬롯은 제외
      IF v_slot_datetime >= v_earliest THEN
        SELECT count(*) INTO v_booked_count
        FROM public.beauty_booking_requests
        WHERE store_id = p_store_id::text
          AND store_source = 'partner'
          AND booking_date = p_date
          AND booking_time = to_char(v_slot_time, 'HH24:MI')
          AND status NOT IN ('canceled', 'failed');

        IF v_booked_count < v_capacity THEN
          v_slots := array_append(v_slots, to_char(v_slot_time, 'HH24:MI'));
        END IF;
      END IF;
    END IF;

    v_slot_time := v_slot_time + (v_slot_interval || ' minutes')::interval;
  END LOOP;

  RETURN v_slots;
END;
$$;

COMMENT ON FUNCTION public.get_partner_available_slots(uuid, date, int) IS
  'Kello Partner 제휴 매장의 특정 날짜 예약 가능 시간(HH:MM) 목록 계산. service_role에서만 호출.';
