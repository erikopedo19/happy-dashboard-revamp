import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Search, Calendar, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AppointmentTimeCard } from './AppointmentTimeCard';
import { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
interface Service {
  id: string;
  name: string;
  duration: number;
  color: string;
  text_color: string;
  border_color: string;
}
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}
interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  customer: Customer;
  service: Service;
  status: string;
  price?: number;
  notes?: string;
}
interface TimeSlotGridProps {
  appointments: Appointment[];
  onDateTimeClick: (date: string, time: string) => void;
  services?: Service[];
  selectedServiceId?: string | null;
  onServiceSelect?: (serviceId: string | null) => void;
}
const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
export const TimeSlotGrid = ({
  appointments,
  onDateTimeClick,
  services = [],
  selectedServiceId,
  onServiceSelect
}: TimeSlotGridProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const isMobile = useIsMobile();
  const startOfCurrentWeek = startOfWeek(currentWeek, {
    weekStartsOn: 1
  });
  const endOfCurrentWeek = endOfWeek(currentWeek, {
    weekStartsOn: 1
  });
  const weekDays = useMemo(() => eachDayOfInterval({
    start: startOfCurrentWeek,
    end: endOfCurrentWeek
  }), [startOfCurrentWeek, endOfCurrentWeek]);
  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };
  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  // Filter appointments based on search query
  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const query = searchQuery.toLowerCase();
    return appointments.filter(apt => apt.customer.name.toLowerCase().includes(query) || apt.service.name.toLowerCase().includes(query) || apt.status.toLowerCase().includes(query));
  }, [appointments, searchQuery]);

  // Build a fast lookup map: 'YYYY-MM-DD|HH:MM' -> appointments[]
  const appointmentMap = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of filteredAppointments) {
      const key = `${apt.appointment_date}|${apt.appointment_time.slice(0, 5)}`;
      const arr = map.get(key);
      if (arr) arr.push(apt);else map.set(key, [apt]);
    }
    return map;
  }, [filteredAppointments]);
  const getAppointmentsForDateTime = (date: Date, time: string) => {
    const key = `${format(date, 'yyyy-MM-dd')}|${time.slice(0, 5)}`;
    return appointmentMap.get(key) || [];
  };
  if (isMobile) {
    return <div className="flex-1 bg-background">
        {/* Mobile Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search appointments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-0 focus-visible:ring-1" />
          </div>
          
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="text-sm font-semibold">{format(startOfCurrentWeek, 'MMM d')} - {format(endOfCurrentWeek, 'MMM d, yyyy')}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Day Cards */}
        <div className="p-4 space-y-4 pb-24">
          {weekDays.map(day => {
          const dayAppointments = timeSlots.flatMap(time => getAppointmentsForDateTime(day, time));
          return <div key={day.toISOString()} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                {/* Day Header */}
                <div className={`p-4 border-b border-border ${isSameDay(day, new Date()) ? 'bg-primary/5' : 'bg-muted/30'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{format(day, 'EEEE')}</h3>
                        {isSameDay(day, new Date()) && <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">Today</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{format(day, 'MMMM d, yyyy')}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dayAppointments.length} {dayAppointments.length === 1 ? 'booking' : 'bookings'}
                    </div>
                  </div>
                </div>

                {/* Appointments or Empty State */}
                <div className="p-4 space-y-3">
                  {dayAppointments.length > 0 ? dayAppointments.map(apt => <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{apt.appointment_time.slice(0, 5)}</span>
                            <span className="w-2 h-2 rounded-full border border-white shadow-sm" style={{
                      backgroundColor: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-pink-500', 'bg-yellow-500', 'bg-cyan-500'].includes(apt.service.color) ? {
                        'bg-blue-500': '#3b82f6',
                        'bg-purple-500': '#a855f7',
                        'bg-green-500': '#22c55e',
                        'bg-orange-500': '#f97316',
                        'bg-red-500': '#ef4444',
                        'bg-pink-500': '#ec4899',
                        'bg-yellow-500': '#eab308',
                        'bg-cyan-500': '#06b6d4'
                      }[apt.service.color] : '#3b82f6'
                    }} />
                          </div>
                          <p className="text-sm text-foreground truncate">{apt.customer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{apt.service.name}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {apt.service.duration}min
                        </div>
                      </div>) : <div className="text-center py-8">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No bookings</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => onDateTimeClick(format(day, 'yyyy-MM-dd'), '09:00')}>
                        Add Booking
                      </Button>
                    </div>}
                </div>
              </div>;
        })}
        </div>
      </div>;
  }
  return <div className="flex-1 bg-white min-h-screen relative">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-6 py-4 space-y-4">
          {/* Top Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{format(startOfCurrentWeek, 'EEEE, MMMM d')}</h1>
                <p className="text-xs text-gray-500 mt-0.5">UTC +2 • Week {format(startOfCurrentWeek, 'w')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(new Date())} className="text-xs font-medium px-3 py-1.5">
                Today
              </Button>
              <div className="flex items-center border border-gray-200 rounded-md">
                <Button variant="ghost" size="icon" onClick={handlePreviousWeek} className="h-20 w-20">
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-20 w-20">
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Search and Actions Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search appointments, customers, services..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Mini Tabs */}
              <div className="flex items-center bg-gray-50 rounded-lg p-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('day')}
                  className={`h-7 px-3 text-xs transition-all ${viewMode === 'day' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Day
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('week')}
                  className={`h-7 px-3 text-xs transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Week
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('month')}
                  className={`h-7 px-3 text-xs transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Month
                </Button>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 px-3">
                    <Filter className="h-4 w-4 mr-1" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onServiceSelect?.(null)}>
                    All Services
                  </DropdownMenuItem>
                  {services.map(service => (
                    <DropdownMenuItem 
                      key={service.id} 
                      onClick={() => onServiceSelect?.(service.id)}
                      className="flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: service.color }}
                      />
                      {service.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button size="sm" className="h-10 px-4">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Calendar Grid */}
      <div className="p-4">
        <div className="bg-white rounded-lg overflow-hidden border border-gray-100">
          {/* Days Header */}
          <div className="grid grid-cols-8 bg-gray-50/50">
            <div className="p-4 border-r border-gray-100">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Time</span>
            </div>
            {weekDays.map((day, index) => <div key={index} className="p-4 text-center border-r border-gray-100 last:border-r-0">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-xl font-light ${isSameDay(day, new Date()) ? 'text-blue-600 font-medium' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                  {isSameDay(day, new Date()) && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mx-auto" />}
                </div>
              </div>)}
          </div>

          {/* Time Grid */}
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {timeSlots.map(time => <div key={time} className="grid grid-cols-8 border-b border-gray-50 last:border-b-0 min-h-[100px]">
                <div className="p-4 border-r border-gray-100 bg-gray-50/30 flex items-start">
                  <span className="text-sm font-medium text-gray-600">{time}</span>
                </div>
                {weekDays.map((day, dayIndex) => {
              const dayAppointments = getAppointmentsForDateTime(day, time);
              return <div key={`${dayIndex}-${time}`} className="border-r border-gray-100 last:border-r-0 p-3 relative group hover:bg-gray-50/50 transition-colors">
                      <div className="space-y-2">
                        {dayAppointments.map(appointment => <div key={appointment.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900 leading-tight">
                                {appointment.service.name}
                              </h4>
                              <div className="w-3 h-3 rounded-full flex-shrink-0 ml-2" style={{
                        backgroundColor: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-pink-500', 'bg-yellow-500', 'bg-cyan-500'].includes(appointment.service.color) ? {
                          'bg-blue-500': '#3b82f6',
                          'bg-purple-500': '#a855f7',
                          'bg-green-500': '#22c55e',
                          'bg-orange-500': '#f97316',
                          'bg-red-500': '#ef4444',
                          'bg-pink-500': '#ec4899',
                          'bg-yellow-500': '#eab308',
                          'bg-cyan-500': '#06b6d4'
                        }[appointment.service.color] : '#3b82f6'
                      }} />
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{appointment.customer.name}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">{appointment.appointment_time.slice(0, 5)}</span>
                              <span className="text-xs text-gray-500">{appointment.service.duration}min</span>
                            </div>
                            
                            {/* Customer Avatar */}
                            <div className="flex items-center mt-2">
                              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {appointment.customer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>)}
                      </div>
                      
                      {/* Add Button */}
                      <button type="button" onClick={() => onDateTimeClick(format(day, 'yyyy-MM-dd'), time)} className={`absolute inset-2 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center transition-all duration-200 ${dayAppointments.length === 0 ? 'opacity-60 hover:opacity-100 hover:border-blue-300 hover:bg-blue-50/30' : 'opacity-0 group-hover:opacity-60 hover:opacity-100 hover:border-blue-300 hover:bg-blue-50/30'}`}>
                        <Plus className="w-5 h-5 text-gray-400 hover:text-blue-500 transition-colors" />
                      </button>
                    </div>;
            })}
              </div>)}
          </div>
        </div>
      </div>

      {/* Bottom Booking Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {[
            { icon: '🍽️', label: 'Lunch Break', duration: '30 min' },
            { icon: '🛍️', label: 'Shopping Time', duration: '60 min' },
            { icon: '💊', label: 'Doctor Visit', duration: '45 min' },
            { icon: '🏃', label: 'Gym Session', duration: '90 min' },
            { icon: '☕', label: 'Coffee Meet', duration: '20 min' },
            { icon: '📞', label: 'Phone Call', duration: '15 min' }
          ].map((item, index) => (
            <button
              key={index}
              onClick={() => onDateTimeClick(format(new Date(), 'yyyy-MM-dd'), '12:00')}
              className="flex-shrink-0 group relative"
            >
              {/* Active Line Indicator */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors min-w-[80px]">
                <div className="text-lg">{item.icon}</div>
                <div className="text-xs font-medium text-gray-900 leading-tight text-center">
                  {item.label}
                </div>
                <div className="text-xs text-gray-500">{item.duration}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom padding to account for fixed tab bar */}
      <div className="h-24" />
    </div>;
};