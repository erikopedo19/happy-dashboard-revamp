import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { addMinutes, format, parse } from 'date-fns';

// These types would ideally live in a central types file.
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
interface AppointmentCardProps {
  appointment: Appointment;
}
const getInitials = (name: string) => {
  if (!name) return '??';
  const names = name.split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.slice(0, 2).toUpperCase();
};
const AppointmentCard = ({
  appointment
}: AppointmentCardProps) => {
  const startTime = parse(appointment.appointment_time, 'HH:mm:ss', new Date());
  const endTime = addMinutes(startTime, appointment.service.duration);
  const formatTime = (date: Date) => format(date, 'p').toLowerCase();
  const timeRange = `${formatTime(startTime)} - ${formatTime(endTime)}`;

  // Provide sensible defaults for a more designed look
  const serviceColor = appointment.service.color || '#EFF6FF'; // tailwind blue-50
  const textColor = appointment.service.text_color || '#1E40AF'; // tailwind blue-800
  const borderColor = appointment.service.border_color || '#2563EB'; // tailwind blue-600

  return <div className="rounded-lg shadow w-full h-full flex transition-all hover:shadow-md overflow-hidden relative" style={{
    backgroundColor: serviceColor,
    color: textColor
  }}>
      {/* Vertical line */}
      <div 
        className="w-1 flex-shrink-0 rounded-l-lg" 
        style={{ backgroundColor: borderColor }}
      />
      <div className="flex flex-col flex-1 p-2 min-h-0">
        <div className="flex-grow py-[2px] px-[6px] min-h-0">
          <p className="font-bold text-sm leading-tight line-clamp-2">{appointment.service.name}</p>
          <p className="text-xs opacity-80 mt-1">{timeRange}</p>
        </div>
        
        <div className="flex items-center justify-between mt-1.5 px-[6px]">
          <div className="flex items-center">
              <Avatar className="h-5 w-5 border" style={{
            borderColor: 'rgba(255, 255, 255, 0.5)'
          }}>
                <AvatarFallback className="text-[10px] font-semibold" style={{
              backgroundColor: 'transparent',
              color: 'inherit'
            }}>{getInitials(appointment.customer.name)}</AvatarFallback>
              </Avatar>
          </div>
          {appointment.status && <Badge variant="outline" className="text-[10px] capitalize font-medium border-opacity-30 bg-white/20 px-1.5 py-0">{appointment.status}</Badge>}
        </div>
      </div>
    </div>;
};
export default AppointmentCard;