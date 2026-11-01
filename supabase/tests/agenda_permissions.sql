-- Read-only regression check: each assertion must return true.
SELECT
  has_function_privilege('authenticated', 'public.is_org_creator(uuid,uuid)', 'EXECUTE') AS signed_in_creator_check_available,
  has_function_privilege('authenticated', 'public.is_org_admin(uuid,uuid)', 'EXECUTE') AS signed_in_admin_check_available,
  NOT has_function_privilege('anon', 'public.is_org_creator(uuid,uuid)', 'EXECUTE') AS anonymous_creator_check_blocked,
  NOT has_function_privilege('anon', 'public.is_org_admin(uuid,uuid)', 'EXECUTE') AS anonymous_admin_check_blocked,
  NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid IN ('public.is_org_creator(uuid,uuid)'::regprocedure, 'public.is_org_admin(uuid,uuid)'::regprocedure) AND prosecdef) AS public_checks_not_elevated;