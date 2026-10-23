BEGIN;
-- Preflight rejects case-insensitive duplicates; resolve explicitly before migration.
CREATE UNIQUE INDEX IF NOT EXISTS admin_roles_name_normalized ON public.admin_roles(lower(btrim(name)));
CREATE OR REPLACE FUNCTION public.admin_rbac_action(p_actor uuid,p_action text,p_id uuid DEFAULT NULL,p_input jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.admin_users; ar public.admin_roles; r public.admin_roles; t public.admin_users;
 v_id uuid; v_role uuid; v_super boolean; v_required text; v_permissions uuid[]; v_result jsonb; v_before jsonb;
BEGIN
 -- Serialize governance writes; permission reads and authorization occur after the lock.
 PERFORM pg_advisory_xact_lock(73401,1);
 SELECT * INTO a FROM public.admin_users WHERE user_id=p_actor AND is_active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active administrator required' USING ERRCODE='42501'; END IF;
 SELECT * INTO ar FROM public.admin_roles WHERE id=a.role_id;
 v_super := ar.is_system AND ar.name='Super Admin';
 v_required := CASE WHEN p_action LIKE 'role_%' THEN 'roles.manage' WHEN p_action='admin_create' THEN 'admins.create' ELSE 'admins.update' END;
 IF NOT v_super AND NOT EXISTS(SELECT 1 FROM public.admin_role_permissions rp JOIN public.admin_permissions p ON p.id=rp.permission_id WHERE rp.role_id=a.role_id AND p.code=v_required) THEN
 RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
 IF p_action IN ('role_create','role_update','role_delete') THEN
  IF p_action<>'role_create' THEN
   SELECT * INTO r FROM public.admin_roles WHERE id=p_id;
   IF NOT FOUND THEN RAISE EXCEPTION 'Role not found' USING ERRCODE='P0002'; END IF;
   IF r.is_system THEN RAISE EXCEPTION 'System roles are protected' USING ERRCODE='42501'; END IF;
   v_before:=to_jsonb(r) || jsonb_build_object('permissionIds',(SELECT coalesce(jsonb_agg(permission_id),'[]'::jsonb) FROM public.admin_role_permissions WHERE role_id=r.id));
   -- Cannot edit an existing role more privileged than the actor.
   IF NOT v_super AND EXISTS(SELECT 1 FROM public.admin_role_permissions rp WHERE rp.role_id=r.id AND NOT EXISTS(SELECT 1 FROM public.admin_role_permissions own WHERE own.role_id=a.role_id AND own.permission_id=rp.permission_id)) THEN RAISE EXCEPTION 'Role exceeds own permissions' USING ERRCODE='42501'; END IF;
  END IF;
  IF p_action='role_delete' THEN
   IF EXISTS(SELECT 1 FROM public.admin_users WHERE role_id=p_id) THEN RAISE EXCEPTION 'Reassign all administrators before deleting role'; END IF;
   DELETE FROM public.admin_roles WHERE id=p_id; v_id:=p_id;
  ELSE
   IF jsonb_typeof(p_input->'permissionIds') IS DISTINCT FROM 'array' OR length(btrim(p_input->>'name')) NOT BETWEEN 1 AND 50 OR p_input->>'name' IS NULL OR length(coalesce(p_input->>'description',''))>2000 THEN RAISE EXCEPTION 'Invalid role input' USING ERRCODE='22023'; END IF;
   SELECT coalesce(array_agg(DISTINCT value::uuid),'{}'::uuid[]) INTO v_permissions FROM jsonb_array_elements_text(p_input->'permissionIds');
   IF EXISTS(SELECT 1 FROM unnest(v_permissions) AS requested(id) WHERE NOT EXISTS(SELECT 1 FROM public.admin_permissions p WHERE p.id=id)) THEN RAISE EXCEPTION 'Unknown permission' USING ERRCODE='22023'; END IF;
   IF NOT v_super AND EXISTS(SELECT 1 FROM public.admin_permissions p WHERE p.id=ANY(v_permissions) AND
    (p.code IN ('roles.manage','admins.create','admins.update','system.manage') OR NOT EXISTS(SELECT 1 FROM public.admin_role_permissions rp WHERE rp.role_id=a.role_id AND rp.permission_id=p.id))) THEN RAISE EXCEPTION 'Cannot grant privileged or unowned permission' USING ERRCODE='42501'; END IF;
   IF p_action='role_create' THEN
    INSERT INTO public.admin_roles(name,description,is_system) VALUES(btrim(p_input->>'name'),coalesce(p_input->>'description',''),false) RETURNING id INTO v_id;
   ELSE
    v_id:=p_id;
    UPDATE public.admin_roles SET name=btrim(p_input->>'name'),description=coalesce(p_input->>'description',''),updated_at=now() WHERE id=v_id;
    DELETE FROM public.admin_role_permissions WHERE role_id=v_id;
   END IF;
   INSERT INTO public.admin_role_permissions(role_id,permission_id) SELECT v_id,unnest(v_permissions);
  END IF;
 ELSIF p_action IN ('admin_create','admin_update','admin_delete') THEN
  IF p_action<>'admin_create' THEN
   SELECT * INTO t FROM public.admin_users WHERE id=p_id;
   IF NOT FOUND THEN RAISE EXCEPTION 'Administrator not found' USING ERRCODE='P0002'; END IF;
   v_before:=to_jsonb(t);
   IF t.id=a.id THEN RAISE EXCEPTION 'Cannot modify own administrative assignment' USING ERRCODE='42501'; END IF;
   IF NOT v_super AND EXISTS(SELECT 1 FROM public.admin_roles WHERE id=t.role_id AND is_system AND name='Super Admin') THEN RAISE EXCEPTION 'Super Admin operation required' USING ERRCODE='42501'; END IF;
   IF NOT v_super AND EXISTS(SELECT 1 FROM public.admin_role_permissions rp WHERE rp.role_id=t.role_id AND NOT EXISTS(SELECT 1 FROM public.admin_role_permissions own WHERE own.role_id=a.role_id AND own.permission_id=rp.permission_id)) THEN RAISE EXCEPTION 'Target exceeds own permissions' USING ERRCODE='42501'; END IF;
  END IF;
  v_role:=coalesce((p_input->>'roleId')::uuid,t.role_id);
  IF p_action<>'admin_delete' THEN
   SELECT * INTO r FROM public.admin_roles WHERE id=v_role;
   IF NOT FOUND THEN RAISE EXCEPTION 'Role not found' USING ERRCODE='22023'; END IF;
   IF NOT v_super AND (r.name='Super Admin' OR EXISTS(SELECT 1 FROM public.admin_role_permissions rp JOIN public.admin_permissions p ON p.id=rp.permission_id WHERE rp.role_id=v_role AND (p.code IN ('roles.manage','admins.create','admins.update','system.manage') OR NOT EXISTS(SELECT 1 FROM public.admin_role_permissions own WHERE own.role_id=a.role_id AND own.permission_id=rp.permission_id)))) THEN RAISE EXCEPTION 'Cannot grant privileged or unowned role' USING ERRCODE='42501'; END IF;
  END IF;
  IF p_action='admin_create' THEN
   INSERT INTO public.admin_users(user_id,role_id,invited_by) VALUES((p_input->>'userId')::uuid,v_role,p_actor) RETURNING id INTO v_id;
  ELSIF p_action='admin_update' THEN
   UPDATE public.admin_users SET role_id=v_role,is_active=coalesce((p_input->>'isActive')::boolean,is_active),updated_at=now() WHERE id=p_id; v_id:=p_id;
  ELSE DELETE FROM public.admin_users WHERE id=p_id; v_id:=p_id;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.admin_users u JOIN public.admin_roles ro ON ro.id=u.role_id WHERE u.is_active AND ro.is_system AND ro.name='Super Admin') THEN RAISE EXCEPTION 'Last active Super Admin must remain'; END IF;
 ELSE RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023'; END IF;
 INSERT INTO public.admin_audit_logs(admin_id,admin_user_id,action,resource_type,resource_id,details)
 VALUES(a.id,p_actor,upper(p_action),CASE WHEN p_action LIKE 'role_%' THEN 'admin_role' ELSE 'admin_user' END,v_id::text,jsonb_build_object('before',v_before,'input',p_input));
 IF p_action LIKE 'role_%' THEN SELECT to_jsonb(ro) INTO v_result FROM public.admin_roles ro WHERE id=v_id;
 ELSE SELECT to_jsonb(u) INTO v_result FROM public.admin_users u WHERE id=v_id; END IF;
 RETURN coalesce(v_result,jsonb_build_object('id',v_id));
END $$;
REVOKE ALL ON FUNCTION public.admin_rbac_action(uuid,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rbac_action(uuid,text,uuid,jsonb) TO service_role;
REVOKE ALL ON public.admin_roles,public.admin_permissions,public.admin_role_permissions,public.admin_users,public.admin_audit_logs FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
