-- Create visitor_logs table to track unique daily visits
CREATE TABLE public.visitor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL, -- session_id or user_id
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure we only record one entry per visitor per day
CREATE UNIQUE INDEX idx_unique_visitor_per_day ON public.visitor_logs (visitor_id, visit_date);

-- RLS Policies
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (to track visits)
CREATE POLICY "Allow anonymous visit tracking" ON public.visitor_logs
    FOR INSERT WITH CHECK (true);

-- Allow only admins to read stats
CREATE POLICY "Allow admins to read visitor logs" ON public.visitor_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
        )
    );

-- Function to get visitor counts for the dashboard
CREATE OR REPLACE FUNCTION get_visitor_counts()
RETURNS TABLE (
    today_count BIGINT,
    total_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.visitor_logs WHERE visit_date = CURRENT_DATE) as today_count,
        (SELECT COUNT(DISTINCT visitor_id) FROM public.visitor_logs) as total_count;
END;
$$;
