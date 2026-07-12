-- Bridge function for scripted migration deployment.
-- Deploy this ONCE manually via Supabase SQL Editor.
-- All subsequent migrations then run via: npx tsx scripts/deploy-migrations.ts

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE query;
END;
$$;
