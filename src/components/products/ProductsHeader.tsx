import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

interface ProductsHeaderProps {
  onAddProduct: () => void;
}

export const ProductsHeader = ({ onAddProduct }: ProductsHeaderProps) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>
        </div>
        <Button onClick={onAddProduct} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>
    </div>
  );
};