import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Product } from "@/pages/Products";

const db = supabase as any;
const MAX_PHOTO_MB = 2;
const label = "text-[12px] font-semibold uppercase tracking-[0.08em] text-white/45";
const field = "w-full rounded-[14px] border border-white/10 bg-white/[0.05] px-3.5 text-[16px] text-white outline-none transition-colors duration-150 placeholder:text-white/30 focus:border-white/30";

type Draft = { name: string; description: string; price: string; category: string; stock: number; image_url: string; is_active: boolean };
const blank: Draft = { name: "", description: "", price: "", category: "", stock: 0, image_url: "", is_active: true };

export function ProductEditor({ open, product, userId, categories, currencySymbol, onClose, onSaved }: {
  open: boolean; product: Product | null; userId?: string; categories: string[]; currencySymbol: string;
  onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState<"save" | "delete" | "photo" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setDraft(product ? {
      name: product.name, description: product.description ?? "", price: product.price ? String(product.price) : "",
      category: product.category ?? "", stock: product.stock ?? 0, image_url: product.image_url ?? "", is_active: product.is_active !== false,
    } : blank);
  }, [open, product]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const price = Number(draft.price.replace(",", ".") || 0);
  const valid = draft.name.trim().length > 0 && Number.isFinite(price) && price >= 0;

  const pickPhoto = async (file?: File) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !userId) return;
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return toast({ title: "Photo too large", description: `Pick one under ${MAX_PHOTO_MB} MB.`, variant: "destructive" });
    setBusy("photo");
    const path = `${userId}/product_${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("brand-images").upload(path, file, { upsert: true });
    setBusy(null);
    if (error) return toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    set("image_url", supabase.storage.from("brand-images").getPublicUrl(path).data.publicUrl);
  };

  const save = async () => {
    if (!valid) return;
    if (!userId) return toast({ title: "Sign in to save products", description: "Create a free account to keep this product." });
    setBusy("save");
    const row = {
      name: draft.name.trim(), description: draft.description.trim() || null, price, category: draft.category.trim() || null,
      stock: Math.max(0, Math.round(draft.stock)), image_url: draft.image_url || null, is_active: draft.is_active,
    };
    const { error } = product
      ? await db.from("products").update(row).eq("id", product.id)
      : await db.from("products").insert({ ...row, user_id: userId });
    setBusy(null);
    if (error) return toast({ title: "Couldn't save the product", description: error.message, variant: "destructive" });
    toast({ title: product ? "Product updated" : "Product added" });
    onSaved();
  };

  const remove = async () => {
    if (!product) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy("delete");
    const { error } = await db.from("products").delete().eq("id", product.id);
    setBusy(null);
    if (error) return toast({ title: "Couldn't delete the product", description: error.message, variant: "destructive" });
    toast({ title: "Product deleted" });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-24px)] max-w-[480px] overflow-y-auto rounded-[26px] border-white/10 bg-[#121215] p-5 text-white sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[20px] font-semibold tracking-tight text-white">{product ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription className="text-[13.5px] text-white/50">Shown on your personal website while it's visible.</DialogDescription>
        </DialogHeader>

        <div className="mt-1 space-y-4">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy === "photo"} aria-label={draft.image_url ? "Change photo" : "Add photo"}
              className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-white/20 bg-white/[0.04] text-white/50 transition-transform duration-150 ease-out active:scale-[0.97]">
              {draft.image_url ? <img src={draft.image_url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" strokeWidth={1.8} />}
              {busy === "photo" && <span className="absolute inset-0 flex items-center justify-center bg-black/60"><Loader2 className="h-5 w-5 animate-spin text-white" /></span>}
            </button>
            <div className="min-w-0 text-[13px] text-white/50">
              <p className="text-[14.5px] font-medium text-white">{draft.image_url ? "Photo added" : "Add a photo"}</p>
              <p>Square photos look best. Up to {MAX_PHOTO_MB} MB.</p>
              {draft.image_url && <button type="button" onClick={() => set("image_url", "")} className="mt-1 font-semibold text-[#FF5A6E]">Remove</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </div>

          <label className="block">
            <span className={label}>Name</span>
            <input className={cn(field, "mt-1.5 h-12")} value={draft.name} maxLength={80} placeholder="Matte clay" onChange={(e) => set("name", e.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>Price</span>
              <span className={cn(field, "mt-1.5 flex h-12 items-center gap-2 focus-within:border-white/30")}>
                <span className="text-white/40">{currencySymbol}</span>
                <input className="h-full min-w-0 flex-1 bg-transparent text-[16px] tabular-nums outline-none" value={draft.price} inputMode="decimal" placeholder="0"
                  onChange={(e) => set("price", e.target.value.replace(/[^\d.,]/g, ""))} />
              </span>
            </label>
            <div>
              <span className={label}>In stock</span>
              <div className="mt-1.5 flex h-12 items-center justify-between rounded-[14px] border border-white/10 bg-white/[0.05] px-1.5">
                <button type="button" aria-label="One less" disabled={draft.stock <= 0} onClick={() => set("stock", draft.stock - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-white/70 transition-transform duration-150 ease-out active:scale-[0.92] disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                <input aria-label="Stock" className="w-12 bg-transparent text-center text-[16px] font-semibold tabular-nums outline-none" inputMode="numeric" value={draft.stock}
                  onChange={(e) => set("stock", Math.min(99999, Number(e.target.value.replace(/\D/g, "")) || 0))} />
                <button type="button" aria-label="One more" onClick={() => set("stock", draft.stock + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-white/70 transition-transform duration-150 ease-out active:scale-[0.92]"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          <label className="block">
            <span className={label}>Category</span>
            <input className={cn(field, "mt-1.5 h-12")} value={draft.category} maxLength={40} placeholder="Styling, beard, tools" list="product-categories" onChange={(e) => set("category", e.target.value)} />
            <datalist id="product-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </label>

          <label className="block">
            <span className={label}>Description</span>
            <textarea className={cn(field, "mt-1.5 min-h-[84px] resize-none py-3")} value={draft.description} maxLength={300} placeholder="What it does and who it's for" onChange={(e) => set("description", e.target.value)} />
          </label>

          <div className="flex items-center justify-between gap-4 rounded-[14px] bg-white/[0.05] px-3.5 py-3">
            <div>
              <p className="text-[14.5px] font-medium">Visible to clients</p>
              <p className="text-[12.5px] text-white/45">Hidden products stay in your list only.</p>
            </div>
            <Switch checked={draft.is_active} onCheckedChange={(v) => set("is_active", v)} aria-label="Visible to clients" />
          </div>

          <div className="flex gap-2 pt-1">
            {product && (
              <button type="button" onClick={remove} disabled={!!busy}
                className={cn("inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[14px] px-4 text-[14.5px] font-semibold transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:opacity-50",
                  confirmDelete ? "bg-[#FF2D46] text-white" : "bg-white/[0.07] text-[#FF5A6E]")}>
                {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {confirmDelete ? "Tap again to delete" : null}
              </button>
            )}
            <button type="button" onClick={save} disabled={!valid || !!busy}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-white text-[15px] font-semibold text-black transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-40">
              {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
              {product ? "Save changes" : "Add product"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
