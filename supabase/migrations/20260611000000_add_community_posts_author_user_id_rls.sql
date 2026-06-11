
-- Add author_user_id to community_posts and tighten RLS so that
-- writes require authentication and are scoped to the post owner.
-- Existing rows keep author_user_id = NULL (no backfill in this migration).

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Remove the previous policy that allowed anyone (including anon) to insert.
DROP POLICY IF EXISTS "Enable insert for all users" ON public.community_posts;

-- Safety net for re-runs: drop the policies this migration creates if they already exist.
DROP POLICY IF EXISTS "Authenticated users can insert their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.community_posts;

-- Authenticated users may insert posts only as themselves.
CREATE POLICY "Authenticated users can insert their own posts"
  ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_user_id);

-- Authors may update only their own posts.
CREATE POLICY "Authors can update their own posts"
  ON public.community_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_user_id)
  WITH CHECK (auth.uid() = author_user_id);

-- Authors may delete only their own posts.
CREATE POLICY "Authors can delete their own posts"
  ON public.community_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_user_id);

-- "Enable read access for all users" (public SELECT) policy is left unchanged.
