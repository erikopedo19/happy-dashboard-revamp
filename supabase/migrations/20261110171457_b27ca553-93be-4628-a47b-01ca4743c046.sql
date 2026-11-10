CREATE TABLE public.subscription_checkout_attempts (
 user_id uuid PRIMARY KEY,
 checkout_key uuid NOT NULL DEFAULT gen_random_uuid(),
 plan text NOT NULL,
 return_origin text NOT NULL,
 terms_version text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
 stripe_session_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_checkout_attempts TO authenticated;
GRANT ALL ON public.subscription_checkout_attempts TO service_role;
ALTER TABLE public.subscription_checkout_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own checkout agreement" ON public.subscription_checkout_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.claim_subscription_checkout(p_user_id uuid, p_plan text, p_origin text, p_terms_version text)
RETURNS public.subscription_checkout_attempts LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE result public.subscription_checkout_attempts;
BEGIN
 INSERT INTO public.subscription_checkout_attempts(user_id, plan, return_origin, terms_version)
 VALUES(p_user_id,p_plan,p_origin,p_terms_version)
 ON CONFLICT(user_id) DO UPDATE SET checkout_key=gen_random_uuid(),plan=excluded.plan,return_origin=excluded.return_origin,terms_version=excluded.terms_version,accepted_at=now(),expires_at=now()+interval '30 minutes',stripe_session_id=NULL,updated_at=now()
 WHERE subscription_checkout_attempts.expires_at <= now();
 SELECT * INTO result FROM public.subscription_checkout_attempts WHERE user_id=p_user_id;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.claim_subscription_checkout(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_subscription_checkout(uuid,text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.touch_subscription_checkout() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER touch_subscription_checkout BEFORE UPDATE ON public.subscription_checkout_attempts FOR EACH ROW EXECUTE FUNCTION public.touch_subscription_checkout();