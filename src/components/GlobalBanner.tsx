"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Banner } from "@/components/Banner";

interface BannerRecord {
  id: string;
  title: string;
  description?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  variant: string;
  gradient_colors?: string[] | null;
  dismissable: boolean;
  auto_dismiss?: number | null;
}

const DISMISS_KEY = "cutzio:dismissed-banner-id";

export function GlobalBanner() {
  const [banner, setBanner] = useState<BannerRecord | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setDismissedId(localStorage.getItem(DISMISS_KEY));
    } catch {}

    (async () => {
      const { data } = await (supabase as any)
        .from("banners")
        .select("*")
        .eq("active", true)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setBanner(data ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading || !banner || dismissedId === banner.id) return null;

  return (
    <Banner
      title={banner.title}
      description={banner.description ?? undefined}
      buttonText={banner.button_text ?? undefined}
      buttonLink={banner.button_link ?? undefined}
      variant={banner.variant as any}
      dismissable={banner.dismissable}
      autoDismiss={banner.auto_dismiss ?? undefined}
      gradientColors={banner.gradient_colors ?? undefined}
      onDismiss={() => {
        try { localStorage.setItem(DISMISS_KEY, banner.id); } catch {}
      }}
    />
  );
}
