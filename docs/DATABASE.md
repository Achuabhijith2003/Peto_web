INSERT INTO public.admin_users (user_id, role_id, is_active)
SELECT 
    p.id, 
    (SELECT id FROM public.admin_roles WHERE name = 'Super Admin'),
    TRUE
FROM public.profiles p
WHERE p.username = 'john_doe' -- Or change to your email / username
ON CONFLICT (user_id) DO UPDATE 
SET role_id = EXCLUDED.role_id, is_active = TRUE;

