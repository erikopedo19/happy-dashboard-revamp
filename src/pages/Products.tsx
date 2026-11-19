import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, Eye, EyeOff, Package, Plus, Search } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProductEditor } from "@/components/products/ProductEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const db = supabase as any;
export const LOW_STOCK = 3;

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  stock: number | null;
  is_active: boolean | null;
  created_at: string | null;
};

/** Whole amounts without decimals (€18), everything else with two (€14.50). */
export const productMoney = (currency: string) => {
  const make = (code: string, digits: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: code, minimumFractionDigits: digits, maximumFractionDigits: digits });
  let whole: Intl.NumberFormat, cents: Intl.NumberFormat;
  try { whole = make(currency, 0); cents = make(currency, 2); } catch { whole = make("EUR", 0); cents = make("EUR", 2); }
  return {
    format: (n: number) => (Number.isInteger(n) ? whole : cents).format(n),
    symbol: whole.formatToParts(0).find((p) => p.type === "currency")?.value ?? "€",
  };
};

function StockPill({ stock }: { stock: number }) {
  const tone = stock === 0 ? "bg-[#FF2D46]/15 text-[#FF5A6E]" : stock <= LOW_STOCK ? "bg-[#FF9F0A]/15 text-[#FF9F0A]" : "bg-white/[0.07] text-white/55";
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", tone)}>{stock === 0 ? "Sold out" : stock <= LOW_STOCK ? `${stock} left` : `${stock} in stock`}</span>;
}

const Products = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const uid = user?.id;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await db.from("products")
        .select("id, name, description, price, image_url, category, stock, is_active, created_at")
        .eq("user_id", uid).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Product[];
    },
  });
  const { data: profile } = useQuery<{ currency: string | null; booking_link: string | null } | null>({
    queryKey: ["products-profile", uid],
    enabled: !!uid,
    staleTime: 5 * 60_000,
    queryFn: async () => (await db.from("profiles").select("currency, booking_link").eq("id", uid).maybeSingle()).data ?? null,
  });
  const fmt = useMemo(() => productMoney(profile?.currency || "EUR"), [profile?.currency]);
  const symbol = fmt.symbol;

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category?.trim()).filter(Boolean) as string[])).sort(), [products]);
  const stats = useMemo(() => {
    let visible = 0, low = 0, value = 0;
    for (const p of products) {
      if (p.is_active !== false) visible += 1;
      if ((p.stock ?? 0) <= LOW_STOCK) low += 1;
      value += (p.price || 0) * (p.stock ?? 0);
    }
    return { visible, low, value };
  }, [products]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (!category || p.category?.trim() === category) && (!q || `${p.name} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase().includes(q)));
  }, [products, query, category]);

  const openEditor = (product: Product | null) => { haptic("light"); setEditing(product); setEditorOpen(true); };
  const refresh = () => qc.invalidateQueries({ queryKey: ["products", uid] });
  const toggleVisible = async (p: Product) => {
    haptic("light");
    const next = p.is_active === false;
    qc.setQueryData<Product[]>(["products", uid], (rows = []) => rows.map((r) => (r.id === p.id ? { ...r, is_active: next } : r)));
    const { error } = await db.from("products").update({ is_active: next }).eq("id", p.id);
    if (error) { refresh(); toast({ title: "Couldn't update the product", variant: "destructive" }); }
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0A0A0C] font-geist">
        <AppSidebar />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden text-white">
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-[1320px] px-4 pb-40 pt-5 md:px-8 md:pb-12 md:pt-7">
              <header className="flex items-end justify-between gap-4 pr-14 md:pr-16">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Shop</p>
                  <h1 className="mt-0.5 text-[32px] font-bold leading-none tracking-[-0.03em]">Products</h1>
                </div>
                <button type="button" onClick={() => openEditor(null)}
                  className="hidden h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-black transition-transform duration-150 ease-out active:scale-[0.97] md:inline-flex">
                  <Plus className="h-4 w-4" strokeWidth={2.6} />Add product
                </button>
              </header>

              <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.06] md:grid-cols-4">
                {[
                  ["Products", String(products.length), "in your list"],
                  ["Visible", String(stats.visible), "shown to clients"],
                  ["Low stock", String(stats.low), `${LOW_STOCK} or fewer left`],
                  ["Stock value", fmt.format(Math.round(stats.value)), "at list price"],
                ].map(([k, v, sub]) => (
                  <div key={k} className="bg-[#121215] px-4 py-3.5 md:px-5 md:py-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">{k}</dt>
                    <dd className="mt-1 text-[22px] font-bold leading-none tracking-tight tabular-nums">{v}</dd>
                    <dd className="mt-1.5 truncate text-[12px] text-white/40">{sub}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                <label className="flex h-11 w-full shrink-0 items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#121215] px-4 focus-within:border-white/25 md:w-[340px]">
                  <Search className="h-4 w-4 shrink-0 text-white/40" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" aria-label="Search products"
                    className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-white/35 md:text-[14px]" />
                </label>
                {categories.length > 0 && (
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
                    {[null, ...categories].map((c) => (
                      <button key={c ?? "all"} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}
                        className={cn("h-10 shrink-0 rounded-full px-4 text-[13.5px] font-medium transition-colors duration-150",
                          category === c ? "bg-white text-black" : "bg-white/[0.07] text-white/70 hover:bg-white/[0.11]")}>
                        {c ?? "All"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
                  {Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-[22px] bg-white/[0.05]" />)}
                </div>
              ) : products.length === 0 ? (
                <div className="mt-5 flex flex-col items-center rounded-[26px] border border-dashed border-white/[0.12] px-6 py-14 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-white/60"><Package className="h-6 w-6" strokeWidth={1.8} /></span>
                  <h2 className="mt-4 text-[20px] font-semibold tracking-tight">Sell what's on your shelf</h2>
                  <p className="mt-1.5 max-w-[340px] text-[14px] text-white/50">Add the clay, oils and tools you sell in the chair. Visible products show on your personal website.</p>
                  <button type="button" onClick={() => openEditor(null)}
                    className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-[#FF2D46] px-6 text-[15px] font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]">
                    <Plus className="h-4 w-4" strokeWidth={2.6} />Add your first product
                  </button>
                </div>
              ) : shown.length === 0 ? (
                <p className="mt-10 text-center text-[14px] text-white/45">No products match that search.</p>
              ) : (
                <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
                  {shown.map((p) => {
                    const hidden = p.is_active === false;
                    return (
                      <li key={p.id} className="group relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#121215] transition-colors duration-200 hover:border-white/[0.16]">
                        <button type="button" onClick={() => openEditor(p)} aria-label={`Edit ${p.name}`} className="block w-full text-left">
                          <div className="relative aspect-square overflow-hidden bg-white/[0.03]">
                            {p.image_url
                              ? <img src={p.image_url} alt="" loading="lazy" decoding="async" className={cn("h-full w-full object-cover", hidden && "opacity-40 grayscale")} />
                              : <span className="flex h-full w-full items-center justify-center text-white/15"><Package className="h-10 w-10" strokeWidth={1.4} /></span>}
                            {p.category && <span className="absolute left-2.5 top-2.5 max-w-[70%] truncate rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur-md">{p.category}</span>}
                          </div>
                          <div className="p-3.5 md:p-4">
                            <p className="truncate text-[15px] font-semibold">{p.name}</p>
                            <p className="mt-0.5 line-clamp-1 min-h-[18px] text-[12.5px] text-white/45">{p.description}</p>
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="text-[16px] font-bold tabular-nums">{p.price ? fmt.format(p.price) : "Free"}</span>
                              <StockPill stock={p.stock ?? 0} />
                            </div>
                          </div>
                        </button>
                        <button type="button" onClick={() => toggleVisible(p)} aria-label={hidden ? `Show ${p.name} to clients` : `Hide ${p.name} from clients`} aria-pressed={!hidden}
                          className={cn("absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-[transform,background-color] duration-150 ease-out active:scale-[0.92]",
                            hidden ? "bg-black/60 text-white/60" : "bg-black/45 text-white")}>
                          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {products.length > 0 && (
                <Link to="/microsite" className="mt-6 flex items-center justify-between gap-4 rounded-[22px] border border-white/[0.08] bg-[#121215] px-5 py-4 transition-colors duration-150 hover:border-white/[0.16]">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">On your personal website</p>
                    <p className="mt-0.5 text-[13px] text-white/50">{stats.visible} visible {stats.visible === 1 ? "product shows" : "products show"} in a Shop section. Use the eye on a product to hide it.</p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-white/50" />
                </Link>
              )}
            </div>
          </div>

          <button type="button" onClick={() => openEditor(null)} aria-label="Add product"
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+104px)] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF2D46] text-white transition-transform duration-150 ease-out active:scale-[0.94] md:hidden">
            <Plus className="h-6 w-6" strokeWidth={2.6} />
          </button>
        </main>
      </div>

      <ProductEditor open={editorOpen} product={editing} userId={uid} categories={categories} currencySymbol={symbol}
        onClose={() => setEditorOpen(false)} onSaved={() => { setEditorOpen(false); refresh(); }} />
    </SidebarProvider>
  );
};

export default Products;
