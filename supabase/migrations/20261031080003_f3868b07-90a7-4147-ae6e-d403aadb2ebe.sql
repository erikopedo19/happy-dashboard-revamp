ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS allowed_pages text[];
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS allowed_pages text[];
CREATE OR REPLACE FUNCTION public.accept_invitation(token_str text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i public.invitations%ROWTYPE; uid uuid := auth.uid(); recipient text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 SELECT email INTO recipient FROM auth.users WHERE id=uid;
 SELECT * INTO i FROM public.invitations WHERE token=token_str FOR UPDATE;
 IF NOT FOUND OR i.accepted_at IS NOT NULL OR i.expires_at IS NULL OR i.expires_at <= now() THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
 IF lower(i.email) IS DISTINCT FROM lower(recipient) THEN RAISE EXCEPTION 'Sign in with the invited email address'; END IF;
 IF i.role NOT IN ('member','admin') THEN RAISE EXCEPTION 'Invalid invitation role'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.memberships WHERE org_id=i.org_id AND user_id=uid) THEN
 INSERT INTO public.memberships(org_id,user_id,role,allowed_pages) VALUES(i.org_id,uid,i.role,CASE WHEN i.role='member' THEN coalesce(i.allowed_pages,ARRAY['/agenda','/customers']::text[]) ELSE NULL END);
 END IF;
 UPDATE public.profiles SET role='team_member' WHERE id=uid AND (role IS NULL OR role='');
 UPDATE public.invitations SET accepted_at=now() WHERE id=i.id;
 RETURN jsonb_build_object('success',true,'org_id',i.org_id);
END; $$;
REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';