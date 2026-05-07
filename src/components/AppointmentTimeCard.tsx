import { Clock, User } from 'lucide-react';
import { memo } from 'react';

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

interface Stylist {
  id: string;
  name: string;
  email?: string;
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
  stylist?: Stylist;
}

interface AppointmentTimeCardProps {
  appointment: Appointment;
  totalStylists?: number;
}

export const AppointmentTimeCard = memo(({ appointment, totalStylists = 1 }: AppointmentTimeCardProps) => {
  const getServiceColors = (service: Service) => {
    const colorMap: { [key: string]: { bg: string; border: string; text: string; tag: string; hex: string } } = {
      'bg-blue-500': { 
        bg: 'bg-gradient-to-br from-blue-50 to-blue-100/80', 
        border: 'border-l-blue-500', 
        text: 'text-blue-700',
        tag: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-200',
        hex: '#3b82f6'
      },
      'bg-purple-500': { 
        bg: 'bg-gradient-to-br from-purple-50 to-purple-100/80', 
        border: 'border-l-purple-500', 
        text: 'text-purple-700',
        tag: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-purple-200',
        hex: '#a855f7'
      },
      'bg-green-500': { 
        bg: 'bg-gradient-to-br from-green-50 to-green-100/80', 
        border: 'border-l-green-500', 
        text: 'text-green-700',
        tag: 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-200',
        hex: '#22c55e'
      },
      'bg-orange-500': { 
        bg: 'bg-gradient-to-br from-orange-50 to-orange-100/80', 
        border: 'border-l-orange-500', 
        text: 'text-orange-700',
        tag: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-200',
        hex: '#f97316'
      },
      'bg-red-500': { 
        bg: 'bg-gradient-to-br from-red-50 to-red-100/80', 
        border: 'border-l-red-500', 
        text: 'text-red-700',
        tag: 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-red-200',
        hex: '#ef4444'
      },
      'bg-pink-500': { 
        bg: 'bg-gradient-to-br from-pink-50 to-pink-100/80', 
        border: 'border-l-pink-500', 
        text: 'text-pink-700',
        tag: 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700 border-pink-200',
        hex: '#ec4899'
      },
      'bg-yellow-500': { 
        bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/80', 
        border: 'border-l-yellow-500', 
        text: 'text-yellow-700',
        tag: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 border-yellow-200',
        hex: '#eab308'
      },
      'bg-cyan-500': { 
        bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/80', 
        border: 'border-l-cyan-500', 
        text: 'text-cyan-700',
        tag: 'bg-gradient-to-r from-cyan-100 to-cyan-200 text-cyan-700 border-cyan-200',
        hex: '#06b6d4'
      },
    };
    
    return colorMap[service.color] || {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/80',
      border: 'border-l-blue-500',
      text: 'text-blue-700',
      tag: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-200',
      hex: '#3b82f6'
    };
  };

  const colors = getServiceColors(appointment.service);

  return (
    <div className={`
      ${colors.bg} ${colors.border} border-l-4 rounded-xl p-3.5 cursor-pointer
      hover:scale-[1.02] hover:shadow-xl hover:shadow-black/10 transition-all duration-300
      group animate-fade-in border border-white/60 backdrop-blur-sm
      shadow-md hover:shadow-lg will-change-transform
    `}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-foreground mb-2 truncate">
              {appointment.customer.name}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs px-3 py-1.5 rounded-full border ${colors.tag} font-semibold shadow-sm`}>
                {appointment.service.name}
              </span>
              {totalStylists > 2 && appointment.stylist && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-medium">
                  {appointment.stylist.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-3">
            <div className="text-xs font-bold text-gray-700 bg-white/90 px-3 py-2 rounded-lg border border-gray-200/60 shadow-md backdrop-blur-sm">
              {appointment.service.duration}min
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center border border-gray-200/60 shadow-md backdrop-blur-sm">
              <Clock className="w-3.5 h-3.5 text-gray-700" />
            </div>
            <div className="text-xs font-bold text-gray-900">
              {appointment.appointment_time.slice(0, 5)}
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-gray-500" />
            <div 
              className="w-5 h-5 rounded-full border-2 border-white shadow-lg ring-2 ring-black/5"
              style={{ backgroundColor: colors.hex }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});