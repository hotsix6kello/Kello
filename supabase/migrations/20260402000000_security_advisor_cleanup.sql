-- Migration: Supabase Security Advisor Cleanup
-- Goal: Principle of Least Privilege, addressing 5 types of security notices.

--------------------------------------------------------------------------------
-- Phase 1: Enable RLS on public tables to block unrestricted API access
--------------------------------------------------------------------------------
ALTER TABLE public.booking_concierge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interpreter_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interpreter_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beauty_raw ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- Phase 2: Tighten Permissive RLS Policies
--------------------------------------------------------------------------------

-- Table: partners (Sensitive: only admins should manage)
DROP POLICY IF EXISTS "partners_insert_all" ON public.partners;
DROP POLICY IF EXISTS "partners_select_all" ON public.partners;
DROP POLICY IF EXISTS "partners_update_all" ON public.partners;

CREATE POLICY "Admins can manage partners"
ON public.partners
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin'::app_role, 'super_admin'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin'::app_role, 'super_admin'::app_role)
  )
);

-- Table: beauty_booking_notifications (Restrict INSERT to system/service role)
DROP POLICY IF EXISTS "System can insert notifications" ON public.beauty_booking_notifications;

-- Table: partner_applications (Public insert for form, Admin select)
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.partner_applications;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.partner_applications;

CREATE POLICY "Anyone can submit partner application"
ON public.partner_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view partner applications"
ON public.partner_applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin'::app_role, 'super_admin'::app_role)
  )
);

-- Table: partner_surveys (Public insert for form, Admin select)
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.partner_surveys;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.partner_surveys;

CREATE POLICY "Anyone can submit partner survey"
ON public.partner_surveys
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view partner surveys"
ON public.partner_surveys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin'::app_role, 'super_admin'::app_role)
  )
);

--------------------------------------------------------------------------------
-- Phase 3: Function Search Path Security
--------------------------------------------------------------------------------
ALTER FUNCTION public.set_updated_at() SET search_path = public;
