import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton } from "./ProductCardSkeleton";
import { EmptyState } from "./EmptyState";
import type { Product } from "@/pages/Products";

interface ProductsGridProps {
  products: Product[];
  isLoading: boolean;
  onEditProduct: (product: Product) => void;
  onRefetch: () => void;
}

export const ProductsGrid = ({ 
  products, 
  isLoading, 
  onEditProduct, 
  onRefetch 
}: ProductsGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEditProduct}
          onRefetch={onRefetch}
        />
      ))}
    </div>
  );
};