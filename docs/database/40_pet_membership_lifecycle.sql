-- Visibility is self-contained: migration 36 helper functions are not required here.
-- Re-running replaces only lifecycle policies/triggers introduced by this migration.
BEGIN;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS purge_after timestamptz;
-- Fail rather than silently choosing an owner when legacy data is inconsistent.
CREATE UNIQUE INDEX IF NOT EXISTS pets_one_active_primary ON public.pet_parents(pet_id) WHERE is_primary AND status = 'ACTIVE';

CREATE OR REPLACE FUNCTION public.pet_membership_action(p_pet uuid,p_actor uuid,p_action text,p_target uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_pet public.pets; v_actor public.pet_parents; v_target public.pet_parents;
BEGIN
 SELECT * INTO v_pet FROM public.pets WHERE id=p_pet FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pet not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO v_actor FROM public.pet_parents WHERE pet_id=p_pet AND user_id=p_actor;
 IF p_action='delete' AND v_pet.deleted_at IS NOT NULL AND v_pet.deleted_by=p_actor THEN RETURN; END IF;
 IF v_pet.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Pet not found' USING ERRCODE='P0002'; END IF;
 IF p_action='remove' AND p_target=p_actor AND (v_actor.id IS NULL OR v_actor.status='REMOVED') THEN RETURN; END IF;
 IF v_actor.status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF p_action='delete' THEN
   IF v_actor.is_primary IS DISTINCT FROM true THEN RAISE EXCEPTION 'Only primary owner may delete' USING ERRCODE='42501'; END IF;
   UPDATE public.pets SET deleted_at=now(),deleted_by=p_actor,purge_after=now()+interval '90 days',status='ARCHIVED',updated_at=now() WHERE id=p_pet;
   UPDATE public.pet_parents SET status='REMOVED',updated_at=now() WHERE pet_id=p_pet;
 ELSIF p_action='transfer' THEN
   IF v_actor.is_primary IS DISTINCT FROM true THEN RAISE EXCEPTION 'Only primary owner may transfer' USING ERRCODE='42501'; END IF;
   SELECT * INTO v_target FROM public.pet_parents WHERE pet_id=p_pet AND user_id=p_target AND status='ACTIVE';
   IF NOT FOUND THEN RAISE EXCEPTION 'Recipient must be an active member'; END IF;
   IF p_target=p_actor THEN RETURN; END IF;
   UPDATE public.pet_parents SET is_primary=false,updated_at=now() WHERE id=v_actor.id;
   UPDATE public.pet_parents SET is_primary=true,relationship='OWNER',updated_at=now() WHERE id=v_target.id;
 ELSIF p_action='remove' THEN
   IF p_target IS NULL THEN RAISE EXCEPTION 'Target required'; END IF;
   IF p_target<>p_actor AND NOT (v_actor.is_primary OR 'MANAGE_PARENTS'=ANY(v_actor.permissions)) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
   SELECT * INTO v_target FROM public.pet_parents WHERE pet_id=p_pet AND user_id=p_target;
   IF v_target.is_primary AND v_target.status='ACTIVE' THEN RAISE EXCEPTION 'Transfer primary ownership before leaving'; END IF;
   UPDATE public.pet_parents SET status='REMOVED',updated_at=now() WHERE pet_id=p_pet AND user_id=p_target;
 ELSE RAISE EXCEPTION 'Invalid action'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.pet_membership_action(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pet_membership_action(uuid,uuid,text,uuid) TO service_role;
-- Direct clients cannot bypass transactional lifecycle authorization.
REVOKE INSERT,UPDATE,DELETE ON public.pet_parents FROM PUBLIC,anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.pets FROM PUBLIC,anon,authenticated;
DROP POLICY IF EXISTS pets_live_only ON public.pets;
CREATE POLICY pets_live_only ON public.pets AS RESTRICTIVE FOR SELECT USING(deleted_at IS NULL);
DROP POLICY IF EXISTS pet_media_live_only ON public.pet_media;
CREATE POLICY pet_media_live_only ON public.pet_media AS RESTRICTIVE FOR ALL USING(EXISTS(SELECT 1 FROM public.pets p WHERE p.id=pet_id AND p.deleted_at IS NULL));
CREATE OR REPLACE FUNCTION public.can_view_pet(p_pet_id uuid,p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.pets p WHERE p.id=p_pet_id AND p.deleted_at IS NULL AND
 (p.profile_visibility='PUBLIC'
 OR EXISTS(SELECT 1 FROM public.pet_parents pp WHERE pp.pet_id=p.id AND pp.user_id=p_user_id AND pp.status='ACTIVE')
 OR (p.profile_visibility='CONNECTIONS' AND EXISTS(
   SELECT 1 FROM public.pet_parents pp JOIN public.follows f
   ON (f.follower_id=p_user_id AND f.following_id=pp.user_id)
   OR (f.following_id=p_user_id AND f.follower_id=pp.user_id)
   WHERE pp.pet_id=p.id AND pp.status='ACTIVE'))));
$$;

-- Explicit grants also cover installations where migration 36 never created this function.
REVOKE ALL ON FUNCTION public.can_view_pet(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_pet(uuid,uuid) TO anon,authenticated,service_role;

-- Serialize all legacy invitation/media mutations against lifecycle transitions.
CREATE OR REPLACE FUNCTION public.pet_live_write_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_deleted timestamptz;
BEGIN
 IF TG_OP='DELETE' THEN
   PERFORM 1 FROM public.pets WHERE id=OLD.pet_id FOR UPDATE;
   RETURN OLD;
 END IF;
 SELECT deleted_at INTO v_deleted FROM public.pets WHERE id=NEW.pet_id FOR UPDATE;
 IF NOT FOUND OR v_deleted IS NOT NULL THEN
   -- Deletion itself may revoke existing memberships, but never reactivate one.
   IF TG_TABLE_NAME='pet_parents' THEN
     IF TG_OP='UPDATE' AND NEW.status='REMOVED' THEN RETURN NEW; END IF;
   END IF;
   RAISE EXCEPTION 'Pet is deleted or missing' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS pet_parents_live_write ON public.pet_parents;
CREATE TRIGGER pet_parents_live_write BEFORE INSERT OR UPDATE OR DELETE ON public.pet_parents FOR EACH ROW EXECUTE FUNCTION public.pet_live_write_guard();
DROP TRIGGER IF EXISTS pet_media_live_write ON public.pet_media;
CREATE TRIGGER pet_media_live_write BEFORE INSERT OR UPDATE ON public.pet_media FOR EACH ROW EXECUTE FUNCTION public.pet_live_write_guard();

-- Deferred invariant also catches stale legacy invitation upserts that could demote a primary.
CREATE OR REPLACE FUNCTION public.pet_primary_invariant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_pet uuid := coalesce(NEW.pet_id,OLD.pet_id);
BEGIN
 IF EXISTS(SELECT 1 FROM public.pets WHERE id=v_pet AND deleted_at IS NULL)
 AND (SELECT count(*) FROM public.pet_parents WHERE pet_id=v_pet AND is_primary AND status='ACTIVE')<>1 THEN
   RAISE EXCEPTION 'A live pet must retain exactly one active primary owner';
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS pet_primary_required ON public.pet_parents;
CREATE CONSTRAINT TRIGGER pet_primary_required AFTER INSERT OR UPDATE OR DELETE ON public.pet_parents
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.pet_primary_invariant();

-- Retention hold is explicit; purge removes pet metadata/associations, never media or posts.
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS deletion_hold boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.purge_expired_pets(p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_count integer;
BEGIN
 WITH due AS (SELECT id FROM public.pets WHERE deleted_at IS NOT NULL AND purge_after<=now() AND NOT deletion_hold ORDER BY purge_after FOR UPDATE SKIP LOCKED LIMIT least(greatest(p_limit,1),1000)),
 removed AS (DELETE FROM public.pets p USING due WHERE p.id=due.id RETURNING p.id)
 SELECT count(*) INTO v_count FROM removed;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.purge_expired_pets(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_pets(integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
