import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Package className="h-12 w-12 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No products yet
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Start building your product catalog by adding your first product. 
        You can include images, descriptions, pricing, and inventory tracking.
      </p>
      <Button className="gap-2">
        <Plus className="h-4 w-4" />
        Add Your First Product
      </Button>
    </div>
  );
};