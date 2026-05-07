
import { User, Plus, Search, Mail, Phone, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";


interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

const customerFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).nullable().or(z.literal('')),
  phone: z.string().nullable().or(z.literal('')),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

const Customers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const { data: customers, isLoading, error } = useQuery<Customer[]>({
    queryKey: ['customers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('id, name, email, phone')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await (supabase as any).from('customers').delete().eq('id', customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', user?.id] });
      toast({
        title: "Customer deleted",
        description: "The customer has been successfully deleted.",
      });
      setCustomerToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting customer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: CustomerFormData & { id: string }) => {
      const { id, ...updateData } = values;
      const { error } = await (supabase as any).from('customers').update({ 
        ...updateData, 
        email: updateData.email || null, 
        phone: updateData.phone || null 
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', user?.id] });
      toast({
        title: "Customer updated",
        description: "The customer details have been successfully updated.",
      });
      setCustomerToEdit(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating customer",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (customerToEdit) {
      form.reset({
        name: customerToEdit.name,
        email: customerToEdit.email || '',
        phone: customerToEdit.phone || '',
      });
    }
  }, [customerToEdit, form]);

  function onSubmit(values: CustomerFormData) {
    if (customerToEdit) {
      updateMutation.mutate({ ...values, id: customerToEdit.id });
    }
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />
        <main className="flex-1 bg-[#f8f9fa] flex flex-col overflow-hidden">
          <header className="bg-white border-b border-apple-gray-200 px-4 md:px-6 py-3 md:py-4 glass-effect flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-apple-gray-600 hover:text-apple-gray-900 transition-all duration-200" />
                <div>
                  <h1 className="text-lg md:text-xl font-semibold text-apple-gray-900">Customers</h1>
                  <p className="text-xs md:text-sm text-apple-gray-600 hidden sm:block">Manage your customer database</p>
                </div>
              </div>
              <div className="flex gap-2 md:gap-3">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
                <Button size="sm" className="bg-gradient-blue hover:opacity-90 text-white">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Customer</span>
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-3 md:p-6">
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-apple-gray-50">
                    <TableHead className="w-[35%] text-apple-gray-600 font-semibold">Name</TableHead>
                    <TableHead className="text-apple-gray-600 font-semibold hidden md:table-cell">Email</TableHead>
                    <TableHead className="text-apple-gray-600 font-semibold hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="text-right text-apple-gray-600 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index} className="hover:bg-apple-gray-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <Skeleton className="h-5 w-32" />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                           <div className="flex items-center gap-2">
                             <Skeleton className="w-4 h-4" />
                             <Skeleton className="h-5 w-48" />
                           </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-4 h-4" />
                            <Skeleton className="h-5 w-24" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-red-500">
                        Error fetching customers: {(error as Error).message}
                      </TableCell>
                    </TableRow>
                  ) : customers && customers.length > 0 ? (
                    customers.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-apple-gray-50/50 transition-colors">
                        <TableCell className="font-medium text-apple-gray-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-blue rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <span>{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-apple-gray-600">
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-apple-gray-600">
                              <Phone className="w-4 h-4 flex-shrink-0" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-10 w-10 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setCustomerToEdit(customer)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-500 focus:text-red-500 focus:bg-red-50"
                                onClick={() => setCustomerToDelete(customer)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <p className="text-apple-gray-600 text-lg">No customers found.</p>
                        <p className="text-sm text-apple-gray-500 mt-2">You can add new customers when creating an appointment on the Agenda page.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={!!customerToEdit} onOpenChange={(open) => !open && setCustomerToEdit(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Make changes to the customer's profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 234 567 890" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCustomerToEdit(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer
              and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => customerToDelete && deleteMutation.mutate(customerToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default Customers;
