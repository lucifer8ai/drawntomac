-- Block authenticated users from setting is_admin on their own profile.
-- Service-role scripts and migrations (role = service_role in the JWT) are allowed.
CREATE OR REPLACE FUNCTION public.block_admin_self_promotion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin
     AND coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'role'
         IS DISTINCT FROM 'service_role'
  THEN
    RAISE EXCEPTION 'is_admin cannot be changed by client requests';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_admin_self_promotion
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.block_admin_self_promotion();
