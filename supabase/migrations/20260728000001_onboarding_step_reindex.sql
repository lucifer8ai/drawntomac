-- Reindex onboarding_step for 3-step flow (was 4-step).
-- Step 2 (SongTagger) was removed, so values > 1 decrement.
-- Only affects users who haven't completed onboarding.
UPDATE public.profiles
SET onboarding_step = onboarding_step - 1
WHERE onboarding_step > 1 AND onboarding_completed = false;
