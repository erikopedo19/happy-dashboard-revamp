GRANT EXECUTE ON FUNCTION public.is_org_creator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;
DO $$ BEGIN
IF NOT has_function_privilege('authenticated','public.is_org_creator(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Agenda organization creator permission regression'; END IF;
IF NOT has_function_privilege('authenticated','public.is_org_admin(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Agenda organization admin permission regression'; END IF;
END $$;