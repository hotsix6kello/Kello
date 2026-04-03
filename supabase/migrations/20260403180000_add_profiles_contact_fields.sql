ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sns TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT;
