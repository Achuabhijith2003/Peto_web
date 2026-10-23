BEGIN;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS purge_after timestamptz;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS deletion_hold boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS community_deleted_at timestamptz;
-- Reconcile any pre-existing tombstones without deleting retained content.
UPDATE public.posts p SET community_deleted_at=c.deleted_at FROM public.communities c
WHERE c.id=p.community_id AND c.deleted_at IS NOT NULL AND p.community_deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS communities_live_lookup ON public.communities(id) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.community_is_live(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p_id IS NULL OR EXISTS(SELECT 1 FROM public.communities WHERE id=p_id AND deleted_at IS NULL);
$$;
CREATE OR REPLACE FUNCTION public.community_can_view(p_id uuid,p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.communities c WHERE c.id=p_id AND c.deleted_at IS NULL AND
 (c.visibility='public' OR c.owner_id=p_user OR EXISTS(SELECT 1 FROM public.community_members m WHERE m.community_id=c.id AND m.user_id=p_user AND m.status='active')));
$$;
CREATE OR REPLACE FUNCTION public.post_community_is_live(p_post uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.posts WHERE id=p_post AND public.community_is_live(community_id));
$$;
REVOKE ALL ON FUNCTION public.community_is_live(uuid),public.community_can_view(uuid,uuid),public.post_community_is_live(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_is_live(uuid),public.community_can_view(uuid,uuid),public.post_community_is_live(uuid) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.community_owner_action(p_id uuid,p_actor uuid,p_action text,p_target uuid DEFAULT NULL,p_confirmation text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.communities; m public.community_members; v_days integer; v_result jsonb;
BEGIN
 SELECT * INTO c FROM public.communities WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Community not found' USING ERRCODE='P0002'; END IF;
 IF c.owner_id<>p_actor OR p_actor IS NULL THEN RAISE EXCEPTION 'Only the current community owner may perform this action' USING ERRCODE='42501'; END IF;
 IF p_action='delete' AND c.deleted_at IS NOT NULL AND c.deleted_by=p_actor THEN RETURN jsonb_build_object('success',true); END IF;
 IF c.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Community not found' USING ERRCODE='P0002'; END IF;
 IF p_action='delete' THEN
  IF p_confirmation IS DISTINCT FROM c.name THEN RAISE EXCEPTION 'Type the current community name to confirm deletion' USING ERRCODE='22023'; END IF;
  SELECT max(retention_days) INTO v_days FROM public.compliance_retention_policies WHERE category IN ('DELETED_POSTS','REPORTS','MODERATION_RECORDS');
  v_days:=greatest(coalesce(v_days,90),1);
  -- Hide, but retain original posts, comments, media, memberships, rules and reports.
  UPDATE public.posts SET community_deleted_at=now() WHERE community_id=p_id;
  UPDATE public.communities SET deleted_at=now(),deleted_by=p_actor,purge_after=now()+make_interval(days=>v_days),is_archived=true,updated_at=now() WHERE id=p_id;
  v_result:=jsonb_build_object('success',true);
 ELSE
  SELECT * INTO m FROM public.community_members WHERE community_id=p_id AND user_id=p_target AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active existing member' USING ERRCODE='22023'; END IF;
  IF p_target=c.owner_id THEN RAISE EXCEPTION 'Cannot change the current owner membership' USING ERRCODE='22023'; END IF;
  IF p_action='owner' THEN
   IF EXISTS(SELECT 1 FROM public.community_bans WHERE community_id=p_id AND user_id=p_target AND (expires_at IS NULL OR expires_at>now())) THEN RAISE EXCEPTION 'Recipient is banned' USING ERRCODE='22023'; END IF;
   UPDATE public.community_members SET role='member',updated_at=now() WHERE community_id=p_id AND role='owner';
   INSERT INTO public.community_members(community_id,user_id,role,status) VALUES(p_id,p_actor,'member','active') ON CONFLICT(community_id,user_id) DO UPDATE SET role='member',status='active',updated_at=now();
   UPDATE public.community_members SET role='owner',updated_at=now() WHERE id=m.id;
   UPDATE public.communities SET owner_id=p_target,updated_at=now() WHERE id=p_id;
  ELSIF p_action IN ('moderator','member') THEN
   UPDATE public.community_members SET role=p_action,updated_at=now() WHERE id=m.id;
  ELSE RAISE EXCEPTION 'Invalid community action' USING ERRCODE='22023'; END IF;
  SELECT to_jsonb(cm) INTO v_result FROM public.community_members cm WHERE id=m.id;
 END IF;
 INSERT INTO public.admin_audit_logs(admin_user_id,action,resource_type,resource_id,details)
 VALUES(p_actor,CASE WHEN p_action='delete' THEN 'COMMUNITY_DELETED' WHEN p_action='owner' THEN 'COMMUNITY_OWNERSHIP_TRANSFERRED' ELSE 'COMMUNITY_ROLE_UPDATED' END,'community',p_id::text,
 jsonb_build_object('previous_owner_id',c.owner_id,'target_user_id',p_target,'role',p_action,'name',c.name,'previous_role',m.role,'retention_days',v_days));
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.community_owner_action(uuid,uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.community_owner_action(uuid,uuid,text,uuid,text) TO service_role;
-- Force privileged ownership/membership changes through authenticated server APIs.
REVOKE INSERT,UPDATE,DELETE ON public.communities,public.community_members FROM PUBLIC,anon,authenticated;

-- Lock descendant writes against deletion. Do not allow content to be moved out of a deleted community.
CREATE OR REPLACE FUNCTION public.community_live_write_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid; v_old uuid; v_deleted timestamptz; v_owner uuid; v_archived boolean;
BEGIN
 IF TG_OP='DELETE' THEN
  SELECT owner_id,deleted_at,is_archived INTO v_owner,v_deleted,v_archived FROM public.communities WHERE id=OLD.community_id FOR UPDATE;
  IF FOUND AND v_deleted IS NULL AND NOT v_archived AND v_owner=OLD.user_id THEN RAISE EXCEPTION 'Transfer ownership before removing the owner membership' USING ERRCODE='22023'; END IF;
  RETURN OLD;
 END IF;
 IF TG_TABLE_NAME='comments' THEN
  SELECT community_id INTO v_id FROM public.posts WHERE id=NEW.post_id;
  IF TG_OP='UPDATE' THEN SELECT community_id INTO v_old FROM public.posts WHERE id=OLD.post_id; END IF;
 ELSE
  v_id:=NEW.community_id;
  IF TG_OP='UPDATE' THEN v_old:=OLD.community_id; END IF;
 END IF;
 FOR v_id IN SELECT DISTINCT x FROM unnest(ARRAY[v_id,v_old]) x WHERE x IS NOT NULL ORDER BY x LOOP
  SELECT deleted_at INTO v_deleted FROM public.communities WHERE id=v_id FOR UPDATE;
  IF NOT FOUND OR v_deleted IS NOT NULL THEN RAISE EXCEPTION 'Community not found' USING ERRCODE='P0002'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.community_live_write_guard() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['community_members','community_rules','community_bans','community_reports','posts','comments'] LOOP
  EXECUTE format('CREATE TRIGGER community_live_write BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.community_live_write_guard()',t);
 END LOOP;
END $$;
CREATE TRIGGER community_member_delete_guard BEFORE DELETE ON public.community_members FOR EACH ROW EXECUTE FUNCTION public.community_live_write_guard();
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
-- Security-definer visibility helpers avoid recursion in the existing community/member policies.
DROP POLICY IF EXISTS "Public communities are viewable by everyone" ON public.communities;
CREATE POLICY "Public communities are viewable by everyone" ON public.communities FOR SELECT USING(public.community_can_view(id,auth.uid()));
DROP POLICY IF EXISTS "Members viewable if community is public or viewer is active member" ON public.community_members;
CREATE POLICY "Members viewable if community is public or viewer is active member" ON public.community_members FOR SELECT USING(public.community_can_view(community_id,auth.uid()));
CREATE POLICY communities_live_only ON public.communities AS RESTRICTIVE FOR ALL USING(deleted_at IS NULL);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['community_members','community_rules','community_bans','community_reports','posts'] LOOP
  EXECUTE format('CREATE POLICY community_live_only ON public.%I AS RESTRICTIVE FOR ALL USING(public.community_is_live(community_id))',t);
 END LOOP;
END $$;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comment_community_live_only ON public.comments AS RESTRICTIVE FOR ALL USING(public.post_community_is_live(post_id));
NOTIFY pgrst,'reload schema';
COMMIT;
