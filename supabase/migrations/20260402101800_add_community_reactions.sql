
-- Add likes_count and dislikes_count to community_posts
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- Create community_reactions table to track who liked/disliked what
CREATE TABLE IF NOT EXISTS public.community_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id BIGINT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for community_reactions
CREATE POLICY "Allow public read access" ON public.community_reactions
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated users to insert reactions" ON public.community_reactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own reactions" ON public.community_reactions
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own reactions" ON public.community_reactions
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Simple function to handle reaction counts if needed via triggers, 
-- but for "minimal" implementation, we'll handle increments/decrements via code initially 
-- or provide the trigger here for robustness.

CREATE OR REPLACE FUNCTION public.handle_reaction_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.reaction_type = 'like') THEN
            UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        ELSIF (NEW.reaction_type = 'dislike') THEN
            UPDATE public.community_posts SET dislikes_count = dislikes_count + 1 WHERE id = NEW.post_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.reaction_type = 'like') THEN
            UPDATE public.community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        ELSIF (OLD.reaction_type = 'dislike') THEN
            UPDATE public.community_posts SET dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = OLD.post_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.reaction_type = 'like' AND NEW.reaction_type = 'dislike') THEN
            UPDATE public.community_posts SET likes_count = GREATEST(0, likes_count - 1), dislikes_count = dislikes_count + 1 WHERE id = NEW.post_id;
        ELSIF (OLD.reaction_type = 'dislike' AND NEW.reaction_type = 'like') THEN
            UPDATE public.community_posts SET dislikes_count = GREATEST(0, dislikes_count - 1), likes_count = likes_count + 1 WHERE id = NEW.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_reaction_change
AFTER INSERT OR DELETE OR UPDATE ON public.community_reactions
FOR EACH ROW EXECUTE FUNCTION public.handle_reaction_stats();
