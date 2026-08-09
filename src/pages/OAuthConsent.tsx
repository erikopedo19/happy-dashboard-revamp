import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type AuthDetails = {
  client?: { name?: string; client_uri?: string } | null;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};

// Beta namespace; type it locally.
const authOAuth = (supabase.auth as any).oauth as {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthDetails | null; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthDetails | null; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthDetails | null; error: any }>;
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await authOAuth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await authOAuth.approveAuthorization(authorizationId)
      : await authOAuth.denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("No redirect returned by the authorization server."); }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0c0c0c] text-[#F2F2F7] p-6">
      <div className="w-full max-w-md rounded-3xl bg-[#15151A] border border-white/5 p-8 shadow-2xl">
        {error ? (
          <>
            <h1 className="text-xl font-semibold mb-2">Connection error</h1>
            <p className="text-sm text-white/70">{error}</p>
          </>
        ) : !details ? (
          <p className="text-sm text-white/70">Loading…</p>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-2">
              Connect {details.client?.name ?? "an app"} to Cutzio
            </h1>
            <p className="text-sm text-white/70 mb-6">
              This lets {details.client?.name ?? "the client"} act on your Cutzio data as you.
              You can revoke access anytime from settings.
            </p>
            {details.scopes && details.scopes.length > 0 && (
              <ul className="text-xs text-white/60 mb-6 list-disc pl-5 space-y-1">
                {details.scopes.map((s) => <li key={s}>{s}</li>)}
              </ul>
            )}
            <div className="flex gap-3">
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-medium py-3 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 disabled:opacity-50"
              >
                Deny
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
