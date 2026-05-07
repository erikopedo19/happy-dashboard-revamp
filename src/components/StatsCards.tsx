
import { Calendar, DollarSign, TrendingUp, Star, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function StatsCards() {
  // Fetch stylists data
  const { data: stylists = [] } = useQuery({
    queryKey: ['dashboard_stylists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stylists')
        .select('*');
      
      if (error) throw error;
      return data || [];
    },
  });
  // Fetch all appointments with services
  const { data: allAppointments = [] } = useQuery({
    queryKey: ['dashboard_appointments_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          service:services(price)
        `);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch previous month's appointments for comparison
  const { data: lastMonthAppointments = [] } = useQuery({
    queryKey: ['dashboard_appointments_last_month'],
    queryFn: async () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          service:services(price)
        `)
        .gte('appointment_date', lastMonth.toISOString().split('T')[0])
        .lt('appointment_date', thisMonth.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data;
    },
  });


  // Calculate current month stats
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthAppointments = allAppointments.filter(apt => 
    new Date(apt.appointment_date) >= thisMonth
  );
  const completedAppointments = allAppointments.filter(apt => apt.status === 'completed');
  const currentMonthCompleted = currentMonthAppointments.filter(apt => apt.status === 'completed');

  // Calculate last month stats for comparison
  const lastMonthCompleted = lastMonthAppointments.filter(apt => apt.status === 'completed');
  
  const totalRevenue = completedAppointments.reduce((sum, apt) => {
    const price = apt.price || apt.service?.price || 0;
    return sum + Number(price);
  }, 0);

  const lastMonthRevenue = lastMonthCompleted.reduce((sum, apt) => {
    const price = apt.price || apt.service?.price || 0;
    return sum + Number(price);
  }, 0);

  const totalAppointments = allAppointments.length;

  // Calculate additional metrics
  const stylistsCount = stylists.length;
  const availableStylists = stylists.filter(s => s.status === 'available').length;
  const averageSatisfaction = stylists.reduce((sum, s) => sum + (s.satisfaction || 0), 0) / (stylistsCount || 1);
  
  const currentMonthRevenue = currentMonthCompleted.reduce((sum, apt) => {
    const price = apt.price || apt.service?.price || 0;
    return sum + Number(price);
  }, 0);

  const revenueChange = lastMonthRevenue > 0
    ? (((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
    : 0;

  const currentMonthAppointmentsCount = currentMonthAppointments.length;
  const lastMonthAppointmentsCount = lastMonthAppointments.length;

  const appointmentsChange = lastMonthAppointmentsCount > 0
    ? (((currentMonthAppointmentsCount - lastMonthAppointmentsCount) / lastMonthAppointmentsCount) * 100).toFixed(1)
    : 0;

  const stats = [
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      change: `${Number(revenueChange) >= 0 ? '+' : ''}${revenueChange}%`,
      changeLabel: "vs last month",
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      positive: Number(revenueChange) >= 0
    },
    {
      title: "Total Bookings",
      value: totalAppointments.toString(),
      change: `${Number(appointmentsChange) >= 0 ? '+' : ''}${appointmentsChange}%`,
      changeLabel: "vs last month",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      positive: Number(appointmentsChange) >= 0
    },
    {
      title: "Active Stylists",
      value: stylistsCount.toString(),
      change: `${availableStylists} available`,
      changeLabel: "right now",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      positive: true
    },
    {
      title: "Client Satisfaction",
      value: `${averageSatisfaction.toFixed(1)}/5`,
      change: `${Math.round(averageSatisfaction * 20)}%`,
      changeLabel: "positive reviews",
      icon: Star,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      positive: true
    }
  ];


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className="group relative overflow-hidden rounded-3xl backdrop-blur-md bg-white/40 border border-gray-200 transition-all duration-500 p-4 hover:bg-white/50 hover:border-gray-300"
        >
          {/* Subtle color background based on icon color */}
          <div className={`absolute inset-0 ${stat.color.replace('text-', 'bg-')}/5 backdrop-blur-sm pointer-events-none`} />
          
          {/* Light border glow on hover */}
          <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-gray-200/20 blur-sm transition-all duration-500 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-widest letter-spacing">{stat.title}</p>
                <p className="text-3xl lg:text-4xl font-medium text-gray-800">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl backdrop-blur-md ${stat.bgColor} border border-gray-100 transition-all duration-300`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border transition-all duration-300 ${stat.positive ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' : 'bg-red-500/10 text-red-700 border-red-200'}`}>
              {stat.positive ? '↑' : '↓'} <span className="font-medium">{stat.change}</span> <span className="text-xs opacity-80">{stat.changeLabel}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}
