import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProductsHeader } from "@/components/products/ProductsHeader";
import { ProductsGrid } from "@/components/products/ProductsGrid";
import { ProductForm } from "@/components/products/ProductForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

export type Product = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  image_url?: string;
  category?: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const Products = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { user } = useAuth();

  const { data: products = [], isLoading, refetch } = useQuery<Product[], Error>({
    queryKey: ["products", user?.id ?? "no-user"],
    queryFn: async (): Promise<Product[]> => {
      if (!user?.id) {
        throw new Error("User not found");
      }
      
      const { data, error } = await (db
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as Product[];
    },
    enabled: !!user?.id,
    retry: 1,
  });

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseForm();
  };

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-white overflow-hidden">
        <AppSidebar />
        <main className="flex-1 bg-apple-gray-50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 md:p-8">
            <ProductsHeader onAddProduct={handleAddProduct} />
            <ProductsGrid 
              products={products}
              isLoading={isLoading}
              onEditProduct={handleEditProduct}
              onRefetch={refetch}
            />
          </div>
        </main>
      </div>

      <ProductForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        product={editingProduct}
        onSuccess={handleSuccess}
      />
    </SidebarProvider>
  );
};

export default Products;