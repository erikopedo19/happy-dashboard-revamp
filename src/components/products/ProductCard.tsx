import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Edit, Trash2, Package, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/pages/Products";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onRefetch: () => void;
}

export const ProductCard = ({ product, onEdit, onRefetch }: ProductCardProps) => {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!confirm("Delete this product?")) return;
    setBusy(true);
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    setBusy(false);
    if (error) return toast({ title: "Couldn't delete", variant: "destructive" });
    toast({ title: "Product deleted" });
    onRefetch();
  };

  const toggleActive = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);
    setBusy(false);
    if (error) return toast({ title: "Couldn't update", variant: "destructive" });
    onRefetch();
  };

  const price = product.price
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(product.price)
    : "Free";

  return (
    <div className="group relative rounded-3xl overflow-hidden bg-[#15151A] border border-white/5 hover:border-rose-500/30 transition-all duration-200">
      <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-white/[0.03] to-white/[0.01]">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-10 w-10 text-white/20" />
          </div>
        )}

        {!product.is_active && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
            <Badge className="bg-white/10 text-white/80 border-white/10">Inactive</Badge>
          </div>
        )}

        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleActive} disabled={busy}>
                {product.is_active ? (
                  <><EyeOff className="h-4 w-4 mr-2" /> Deactivate</>
                ) : (
                  <><Eye className="h-4 w-4 mr-2" /> Activate</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} disabled={busy} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-3.5 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight text-white line-clamp-1 flex-1">
            {product.name}
          </h3>
        </div>

        {product.description && (
          <p className="text-xs text-white/50 line-clamp-1">{product.description}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold bg-gradient-to-r from-rose-400 to-rose-300 bg-clip-text text-transparent">
            {price}
          </span>
          <span className="text-[10px] text-white/40 uppercase tracking-wide">
            {product.stock_quantity} in stock
          </span>
        </div>
      </div>
    </div>
  );
};
