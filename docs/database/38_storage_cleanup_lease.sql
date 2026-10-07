-- Apply only after the existing schema. The worker is a separately scheduled job.
CREATE TABLE IF NOT EXISTS public.storage_cleanup_lease (
  name text PRIMARY KEY,
  owner uuid NOT NULL,
  expires_at timestamptz NOT NULL
);
REVOKE ALL ON public.storage_cleanup_lease FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.acquire_storage_cleanup_lease(p_owner uuid, p_minutes integer DEFAULT 120)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_minutes < 1 OR p_minutes > 240 THEN RETURN false; END IF;
  INSERT INTO public.storage_cleanup_lease(name, owner, expires_at)
  VALUES ('weekly', p_owner, now() + make_interval(mins => p_minutes))
  ON CONFLICT (name) DO UPDATE SET owner = EXCLUDED.owner, expires_at = EXCLUDED.expires_at
  WHERE public.storage_cleanup_lease.expires_at < now();
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.release_storage_cleanup_lease(p_owner uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  DELETE FROM public.storage_cleanup_lease WHERE name = 'weekly' AND owner = p_owner;
$$;
REVOKE ALL ON FUNCTION public.acquire_storage_cleanup_lease(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_storage_cleanup_lease(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_storage_cleanup_lease(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_storage_cleanup_lease(uuid) TO service_role;
