ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS stripe_subscription_id text, ADD COLUMN IF NOT EXISTS billing_status text, ADD COLUMN IF NOT EXISTS payment_failed_at timestamptz;
CREATE TABLE public.billing_email_deliveries (delivery_key text PRIMARY KEY, user_id uuid NOT NULL, kind text NOT NULL, status text NOT NULL DEFAULT 'pending', claimed_at timestamptz, sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.billing_email_deliveries TO service_role;
ALTER TABLE public.billing_email_deliveries ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.claim_billing_email(p_key text, p_user_id uuid, p_kind text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
 INSERT INTO public.billing_email_deliveries(delivery_key,user_id,kind,status,claimed_at) VALUES(p_key,p_user_id,p_kind,'sending',now()) ON CONFLICT(delivery_key) DO NOTHING;
 IF FOUND THEN RETURN true; END IF;
 UPDATE public.billing_email_deliveries SET status='sending',claimed_at=now(),updated_at=now() WHERE delivery_key=p_key AND (status='pending' OR (status='sending' AND claimed_at < now()-interval '5 minutes'));
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.claim_billing_email(text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_billing_email(text,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.set_subscription_auto_renew(_enabled boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN jsonb_build_object('success',false,'error','use_payment_provider'); END; $$;
CREATE OR REPLACE FUNCTION public.cancel_subscription_at_period_end() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN jsonb_build_object('success',false,'error','use_payment_provider'); END; $$;