-- Enforce a single admin. Idempotent: safe to run repeatedly.
UPDATE public.profiles SET is_admin = false;

UPDATE public.profiles
SET is_admin = true,
    onboarding_completed = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'yrkgkp1@gmail.com'
);
