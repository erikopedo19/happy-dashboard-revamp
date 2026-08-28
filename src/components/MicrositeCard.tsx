import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, ExternalLink, Globe, Sparkles, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";

const spring = { type: "spring" as const, stiffness: 350, damping: 32 };

const cleanSlug = (raw: string) =>
  raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Microsite card — iOS-style panel with a radial gradient backdrop.
 * Shows the generated website for barbers who requested one, with copy /
 * open / customise actions, or a CTA to generate it.
 */
export function MicrositeCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["microsite-card", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const [{ data: prof }, { data: site }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("booking_link, business_name, full_name")
          .eq("id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("microsites")
          .select("published, headline, tagline, hero_url, logo_url")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      return { prof, site };
    },
  });

  const prof = data?.prof;
  const site = data?.site;
  const slug =
    prof?.booking_link || cleanSlug(String(prof?.business_name || prof?.full_name || ""));
  const url = slug ? `${window.location.origin}/site/${slug}` : "";
  const title = site?.headline || prof?.business_name || prof?.full_name || "Your barbershop";

  const copy = async () => {
    if (!url) return;
    haptic("light");
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Website link copied" });
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={spring}
      className="relative overflow-hidden rounded-[28px] bg-[#15151A] border border-white/[0.08]"
    >
      {/* Radial gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[320px] w-[320px] rounded-full blur-[70px] opacity-60 animate-aurora-drift"
        style={{ background: "radial-gradient(circle, rgba(10,132,255,0.55) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-[260px] w-[260px] rounded-full blur-[70px] opacity-45 animate-aurora-drift"
        style={{
          background: "radial-gradient(circle, rgba(255,45,111,0.5) 0%, transparent 70%)",
          animationDelay: "-6s",
        }}
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-[15px] bg-white/[0.08] border border-white/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[16px] font-bold text-white tracking-tight truncate">
                Your website
              </p>
              <span className="shrink-0 rounded-full bg-white/[0.1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {site ? (site.published ? "Live" : "Draft") : "Not set up"}
              </span>
            </div>
            <p className="text-[12px] text-[#8E8E93] mt-0.5 truncate">{title}</p>
          </div>
        </div>

        {/* Preview strip */}
        <div className="mt-4 rounded-[20px] overflow-hidden border border-white/[0.08] bg-black/30">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06]">
            <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
            <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
            <span className="h-2 w-2 rounded-full bg-[#28C840]" />
            <span className="ml-2 truncate text-[11px] text-white/45">
              {url || "cutzioo.com/site/your-name"}
            </span>
          </div>
          <div
            className="h-28 sm:h-32 w-full bg-cover bg-center"
            style={{
              backgroundImage: site?.hero_url
                ? `url(${site.hero_url})`
                : "radial-gradient(120% 120% at 20% 0%, rgba(10,132,255,0.45) 0%, transparent 60%), radial-gradient(120% 120% at 90% 100%, rgba(255,45,111,0.4) 0%, transparent 60%)",
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={copy}
            disabled={!url || isLoading}
            className="h-11 rounded-[14px] bg-white/[0.07] border border-white/[0.08] text-[13px] font-semibold text-white inline-flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40"
          >
            {copied ? <Check className="h-4 w-4 text-[#30D158]" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <a
            href={url || "#"}
            target="_blank"
            rel="noreferrer"
            className="h-11 rounded-[14px] bg-white/[0.07] border border-white/[0.08] text-[13px] font-semibold text-white inline-flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
        </div>

        <Link
          to="/microsite"
          onClick={() => haptic("light")}
          className="mt-2 h-12 w-full rounded-[16px] inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-white active:scale-[0.98] transition"
          style={{
            background:
              "radial-gradient(120% 200% at 0% 0%, #0A84FF 0%, #5E5CE6 45%, #FF2D6F 100%)",
          }}
        >
          {site ? <Wand2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {site ? "Customise website" : "Generate my website"}
        </Link>
      </div>
    </motion.div>
  );
}

export default MicrositeCard;
