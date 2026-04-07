
-- Function to handle comment count updates
CREATE OR REPLACE FUNCTION public.handle_comment_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.community_posts 
        SET comments = comments + 1 
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.community_posts 
        SET comments = GREATEST(0, comments - 1) 
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for inserting/deleting comments
CREATE TRIGGER on_comment_change
AFTER INSERT OR DELETE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_comment_stats();

-- Backfill: Update existing comment counts to ensure data integrity
UPDATE public.community_posts p
SET comments = (
    SELECT count(*)
    FROM public.community_comments c
    WHERE c.post_id = p.id
);
