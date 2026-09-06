
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referral code" ON public.referral_codes FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  code TEXT NOT NULL,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_referral CHECK (referrer_id <> referred_id)
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_id);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see my referrals" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_uid;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    BEGIN
      INSERT INTO public.referral_codes(user_id, code) VALUES (v_uid, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_uid;
      IF v_code IS NOT NULL THEN RETURN v_code; END IF;
    END;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_referral(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_referrer UUID;
  v_created TIMESTAMPTZ;
  v_ref_email TEXT;
  v_end TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email, created_at INTO v_email, v_created FROM auth.users WHERE id = v_uid;

  -- only brand new accounts (first 7 days) can be attributed
  IF v_created < now() - interval '7 days' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'account_too_old');
  END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  SELECT user_id INTO v_referrer FROM public.referral_codes WHERE code = upper(trim(p_code));
  IF v_referrer IS NULL OR v_referrer = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  INSERT INTO public.referrals(referrer_id, referred_id, code, rewarded_at)
  VALUES (v_referrer, v_uid, upper(trim(p_code)), now());

  SELECT email INTO v_ref_email FROM auth.users WHERE id = v_referrer;

  SELECT subscription_end INTO v_end FROM public.subscribers WHERE user_id = v_referrer
  ORDER BY updated_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE public.subscribers
      SET subscribed = true,
          subscription_tier = COALESCE(subscription_tier, 'Referral'),
          subscription_end = GREATEST(COALESCE(subscription_end, now()), now()) + interval '30 days',
          updated_at = now()
      WHERE user_id = v_referrer;
  ELSE
    INSERT INTO public.subscribers(user_id, email, subscribed, subscription_tier, subscription_start, subscription_end)
    VALUES (v_referrer, COALESCE(v_ref_email, ''), true, 'Referral', now(), now() + interval '30 days');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_referral(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(TEXT) TO authenticated;
