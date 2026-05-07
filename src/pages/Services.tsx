import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Clock, Palette, AlertTriangle, Calendar } from "lucide-react";
import { IconPicker, getIconByName } from "@/components/IconPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const db = supabase as any;

interface Appointment {
  id: string;
  service_id: string;
  status: string;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  color: string;
  text_color: string;
  border_color: string;
  user_id: string;
  price?: number;
  icon?: string;
}

const Services = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    duration: 30,
    color: "bg-blue-50",
    price: 0,
    icon: "Scissors"
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const colorOptions = [
    { value: "bg-blue-50", label: "Blue", gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
    { value: "bg-emerald-50", label: "Emerald", gradient: "linear-gradient(135deg, #14b8a6, #0d9488)" },
    { value: "bg-purple-50", label: "Purple", gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
    { value: "bg-teal-50", label: "Teal", gradient: "linear-gradient(135deg, #14b8a6, #0f766e)" },
    { value: "bg-pink-50", label: "Pink", gradient: "linear-gradient(135deg, #e57373, #dc2626)" },
    { value: "bg-red-50", label: "Red", gradient: "linear-gradient(135deg, #ef4444, #dc2626)" },
    { value: "bg-orange-50", label: "Orange", gradient: "linear-gradient(135deg, #f97316, #ea580c)" },
    { value: "bg-yellow-50", label: "Yellow", gradient: "linear-gradient(135deg, #eab308, #ca8a04)" },
    { value: "bg-indigo-50", label: "Indigo", gradient: "linear-gradient(135deg, #6366f1, #4f46e5)" },
    { value: "bg-green-50", label: "Green", gradient: "linear-gradient(135deg, #22c55e, #16a34a)" },
  ];

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['services', user?.id],
    queryFn: async (): Promise<Service[]> => {
      if (!user) return [];
      const { data, error } = await (db
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('name') as any);
      
      if (error) throw error;
      return (data || []) as Service[];
    },
    enabled: !!user,
  });

  // Fetch appointments to calculate count per service
  // Using lightweight query - only fetching id and service_id for fast aggregation
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments-count', user?.id],
    queryFn: async (): Promise<Appointment[]> => {
      if (!user) return [];
      const { data, error } = await (db
        .from('appointments')
        .select('id, service_id, status')
        .eq('user_id', user.id)
        .neq('status', 'cancelled') as any); // Exclude cancelled appointments
      
      if (error) throw error;
      return (data || []) as Appointment[];
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds for real-time performance
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const durationNumber = Number(formData.duration);
      const duration = Number.isFinite(durationNumber) && durationNumber > 0 ? durationNumber : 30;
      const priceNumber = Number(formData.price);
      const priceValue = Number.isFinite(priceNumber) && priceNumber >= 0 ? priceNumber : null;
      const serviceData = {
        name: formData.name,
        duration,
        price: priceValue,
        color: formData.color,
        icon: formData.icon,
        text_color: 'text-foreground',
        border_color: 'border-border',
        user_id: user.id,
      };

      if (editingService) {
        const { error } = await db
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);
        
        if (error) throw error;
        toast({ title: "Service updated successfully!" });
      } else {
        const { error } = await db
          .from('services')
          .insert([serviceData]);
        
        if (error) throw error;
        toast({ title: "Service created successfully!" });
      }

      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsDialogOpen(false);
      setEditingService(null);
      setFormData({ name: "", duration: 30, color: "bg-blue-50", price: 0, icon: "Scissors" });
    } catch (error) {
      console.error('Error saving service:', error);
      const description =
        typeof (error as any)?.message === 'string'
          ? (error as any).message
          : "Failed to save service. Please try again.";
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      duration: service.duration,
      color: service.color,
      price: service.price || 0,
      icon: service.icon || 'Scissors'
    });
    setIsDialogOpen(true);
  };
// for deleting services
  const handleDeleteClick = (serviceId: string) => {
    setServiceToDelete(serviceId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;

    try {
      const { error } = await db
        .from('services')
        .delete()
        .eq('id', serviceToDelete);

      if (error) throw error;

      toast({ title: "Service deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setServiceToDelete(null);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingService(null);
    setFormData({ name: "", duration: 30, color: "bg-blue-50", price: 0, icon: "Scissors" });
  };

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-white overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Services</h1>
                <p className="text-muted-foreground text-sm md:text-base mt-1 md:mt-2">
                  Manage your salon services
                </p>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingService(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingService ? "Edit Service" : "Add New Service"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingService 
                        ? "Update your service details below."
                        : "Create a new service for your salon."
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Service Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Haircut, Color, Beard Trim"
                          required
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          min="5"
                          max="480"
                          step="5"
                          value={formData.duration}
                          onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          placeholder="e.g., 25.00"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="icon">Icon</Label>
                        <IconPicker 
                          value={formData.icon}
                          onChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="color">Color Theme</Label>
                        <Select 
                          value={formData.color} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a color" />
                          </SelectTrigger>
                          <SelectContent>
                            {colorOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded-full border"
                                    style={{ background: option.gradient }}
                                  />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={closeDialog}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingService ? "Update Service" : "Create Service"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-3 bg-muted rounded w-full mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => {
                  const colorOption = colorOptions.find(c => c.value === service.color);
                  const ServiceIcon = getIconByName(service.icon || 'Scissors');
                  
                  // Fast aggregation: count appointments for this service
                  // Using filter instead of reduce for better performance with small arrays
                  const appointmentCount = appointments.filter(
                    (apt) => apt.service_id === service.id
                  ).length;
                  
                  return (
                    <Card key={service.id} className="relative group hover:shadow-lg transition-all duration-200 border-l-4 overflow-hidden" style={{ borderLeftColor: colorOption?.gradient?.match(/#[0-9a-f]{6}/i)?.[0] || '#3b82f6' }}>
                      {/* Appointment count badge - shows on card */}
                      {appointmentCount > 0 && (
                        <div 
                          className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                          style={{ background: colorOption?.gradient || 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                        >
                          <Calendar className="h-3 w-3" />
                          {appointmentCount}
                        </div>
                      )}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ background: colorOption?.gradient || 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                      />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ background: colorOption?.gradient || 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                            >
                              <ServiceIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{service.name}</CardTitle>
                              <CardDescription className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {service.duration} minutes
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(service)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(service.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Color Theme</span>
                          <span className="capitalize">{colorOption?.label || 'Blue'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {!isLoading && services.length === 0 && (
              <div className="text-center py-12">
                <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No services yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first service
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Service
                </Button>
              </div>
            )}
          </div>
          </div>
        </main>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Service
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this service? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
};

export default Services;

