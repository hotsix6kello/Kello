
-- Create community_comments table
CREATE TABLE IF NOT EXISTS public.community_comments (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    post_id BIGINT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    author_user_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
-- Allow anyone to read
CREATE POLICY "Allow public read access" ON public.community_comments
    FOR SELECT TO public USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert" ON public.community_comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_user_id);
