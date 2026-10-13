import { useRef, useState } from 'react';
import { format, addMinutes } from 'date-fns';
import { Calendar, Clock, DollarSign, User, Phone, Mail, Check, RefreshCw, Trash2, FileText, History } from 'lucide-react';
import { BottomSheet } from '@/components/arc/bottom-sheet/bottom-sheet';
import { CandyButton } from '@/components/ui/candy-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmMorph } from '@/components/arc/confirm-morph/confirm-morph';
import type { ConfirmMorphState } from '@/components/arc/confirm-morph/confirm-morph';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { haptic } from '@/lib/haptics';

interface Service {
  id: string;
  name: string;
  duration: number;
  color?: string;
  text_color?: string;
  border_color?: string;
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
}

export interface DetailsAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  customer: Customer;
  service: Service;
  status: string;
  price?: number;
  notes?: string;
  stylist?: Stylist;
  totalDurationMinutes?: number;
}

const GRADIENT_MAP: Record<string, string> = {
  'bg-blue-50': 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'bg-blue-500': 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'bg-emerald-50': 'linear-gradient(135deg, #14b8a6, #0d9488)',
  'bg-purple-50': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'bg-purple-500': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'bg-teal-50': 'linear-gradient(135deg, #14b8a6, #0f766e)',
  'bg-pink-50': 'linear-gradient(135deg, #e57373, #dc2626)',
  'bg-pink-500': 'linear-gradient(135deg, #e57373, #dc2626)',
  'bg-red-50': 'linear-gradient(135deg, #ef4444, #dc2626)',
  'bg-red-500': 'linear-gradient(135deg, #ef4444, #dc2626)',
  'bg-orange-50': 'linear-gradient(135deg, #f97316, #ea580c)',
  'bg-orange-500': 'linear-gradient(135deg, #f97316, #ea580c)',
  'bg-yellow-50': 'linear-gradient(135deg, #eab308, #ca8a04)',
  'bg-yellow-500': 'linear-gradient(135deg, #eab308, #ca8a04)',
  'bg-indigo-50': 'linear-gradient(135deg, #6366f1, #4f46e5)',
  'bg-green-50': 'linear-gradient(135deg, #22c55e, #16a34a)',
  'bg-green-500': 'linear-gradient(135deg, #22c55e, #16a34a)',
  'bg-cyan-500': 'linear-gradient(135deg, #06b6d4, #0891b2)',
};

function serviceGradient(color?: string) {
  if (!color) return 'linear-gradient(135deg, #6b7280, #4b5563)';
  if (color.startsWith('#')) return `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 65%, black))`;
  return GRADIENT_MAP[color] || 'linear-gradient(135deg, #6b7280, #4b5563)';
}

function endTime(time: string, durationMinutes: number) {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return format(addMinutes(new Date(2000, 0, 1, h, m), durationMinutes), 'HH:mm');
}

export interface AppointmentDetailsDrawerProps {
  appointment: DetailsAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after an appointment is marked completed — used to chain the rating flow. */
  onCompleted?: (appointment: DetailsAppointment) => void;
}

export function AppointmentDetailsDrawer({ appointment, open, onOpenChange, onCompleted }: AppointmentDetailsDrawerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const lastMorphState = useRef<ConfirmMorphState>('idle');

  const { data: recentBookings = [] } = useQuery({
    queryKey: ['customer-recent-appointments', appointment?.customer.id, appointment?.id],
    enabled: open && !!appointment?.customer.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('appointments')
        .select('id, appointment_date, appointment_time, status, price, service:services(name)')
        .eq('customer_id', appointment!.customer.id)
        .neq('id', appointment!.id)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id as string,
        date: row.appointment_date as string,
        time: (row.appointment_time as string).slice(0, 5),
        status: row.status as string,
        price: row.price as number | null,
        serviceName: (Array.isArray(row.service) ? row.service[0]?.name : row.service?.name) ?? 'Appointment',
      })) as { id: string; date: string; time: string; status: string; price: number | null; serviceName: string }[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
    window.dispatchEvent(new Event('appointmentUpdated'));
  };

  const close = () => {
    onOpenChange(false);
    setRescheduling(false);
  };

  const completeAppointment = async () => {
    if (!appointment || isCompleting) return;
    haptic('light');
    setIsCompleting(true);
    try {
      const { error } = await (supabase as any)
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointment.id);
      if (error) throw error;
      toast({ title: 'Appointment Completed', description: 'The appointment has been marked as completed.' });
      close();
      refresh();
      onCompleted?.(appointment);
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast({ title: 'Error', description: 'Failed to complete appointment', variant: 'destructive' });
    } finally {
      setIsCompleting(false);
    }
  };

  const startReschedule = () => {
    if (!appointment) return;
    setRescheduleDate(appointment.appointment_date);
    setRescheduleTime(appointment.appointment_time.slice(0, 5));
    setRescheduling(true);
  };

  const saveReschedule = async () => {
    if (!appointment || !rescheduleDate || !rescheduleTime) return;
    if (new Date(`${rescheduleDate}T${rescheduleTime}:00`) <= new Date()) {
      toast({ title: 'Cannot reschedule to the past', description: 'Please choose a future date and time.', variant: 'destructive' });
      return;
    }
    setIsSavingReschedule(true);
    try {
      const { error } = await (supabase as any)
        .from('appointments')
        .update({ appointment_date: rescheduleDate, appointment_time: rescheduleTime, updated_at: new Date().toISOString() })
        .eq('id', appointment.id);
      if (error) throw error;
      toast({ title: 'Appointment Rescheduled', description: `Moved to ${format(new Date(rescheduleDate), 'MMM d')} at ${rescheduleTime}` });
      close();
      refresh();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast({ title: 'Error', description: 'Failed to reschedule appointment', variant: 'destructive' });
    } finally {
      setIsSavingReschedule(false);
    }
  };

  const removeAppointment = async () => {
    if (!appointment) throw new Error('No appointment');
    const { error } = await (supabase as any).from('appointments').delete().eq('id', appointment.id);
    if (error) throw error;
    refresh();
  };

  const restoreAppointment = async () => {
    if (!appointment || !user) throw new Error('No appointment');
    const { error } = await (supabase as any).from('appointments').insert({
      id: appointment.id,
      user_id: user.id,
      customer_id: appointment.customer.id,
      service_id: appointment.service.id,
      stylist_id: appointment.stylist?.id ?? null,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      price: appointment.price ?? null,
      notes: appointment.notes ?? null,
      status: appointment.status,
    });
    if (error) throw error;
    refresh();
  };

  const onMorphStateChange = (state: ConfirmMorphState) => {
    // Once the result face settles back to rest, the appointment is gone — close.
    if (state === 'idle' && lastMorphState.current === 'done') close();
    lastMorphState.current = state;
  };

  const duration = appointment ? appointment.totalDurationMinutes || appointment.service.duration : 0;

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => { if (!o) setRescheduling(false); onOpenChange(o); }}
      title="Appointment Details"
      description={appointment ? `${appointment.service.name} · ${appointment.customer.name}` : undefined}
      detents={[0.62, 0.94]}
    >
      {appointment && (
        <div className="px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-1">
            {/* Service card */}
            <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08] p-4">
              <div className="absolute inset-0" style={{ background: serviceGradient(appointment.service.color) }} />
              <div className="absolute inset-0 bg-black/25" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-white">{appointment.service.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/80">
                    <User className="h-3.5 w-3.5" />
                    {appointment.customer.name}
                  </p>
                </div>
                <Badge className="shrink-0 border-white/20 bg-white/15 capitalize text-white backdrop-blur-sm hover:bg-white/15">
                  {appointment.status}
                </Badge>
              </div>
            </div>

            {/* Info rows */}
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5 text-[#3C3C43] dark:text-white/70">
                <Calendar className="h-4 w-4 text-[#8E8E93] dark:text-white/40" />
                <span>{format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#3C3C43] dark:text-white/70">
                <Clock className="h-4 w-4 text-[#8E8E93] dark:text-white/40" />
                <span>{appointment.appointment_time.slice(0, 5)} – {endTime(appointment.appointment_time, duration)}</span>
                <span className="text-[#8E8E93] dark:text-white/40">({duration} min)</span>
              </div>
              {appointment.price != null && (
                <div className="flex items-center gap-2.5 text-[#3C3C43] dark:text-white/70">
                  <DollarSign className="h-4 w-4 text-[#8E8E93] dark:text-white/40" />
                  <span>${appointment.price}</span>
                </div>
              )}
              {appointment.notes && (
                <div className="flex items-start gap-2.5 text-[#3C3C43] dark:text-white/70">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#8E8E93] dark:text-white/40" />
                  <span className="text-[13px] leading-relaxed">{appointment.notes}</span>
                </div>
              )}
            </div>

            {/* Contact */}
            {(appointment.customer.phone || appointment.customer.email) && (
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93] dark:text-white/40">Contact</p>
                <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.02] dark:border-white/[0.08] dark:bg-white/[0.04]">
                  {appointment.customer.phone && (
                    <a
                      href={`tel:${appointment.customer.phone}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[#3C3C43] transition-colors hover:bg-black/[0.03] dark:text-white/80 dark:hover:bg-white/[0.06]"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Phone className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{appointment.customer.phone}</span>
                      <span className="text-[11px] font-medium text-[#8E8E93] dark:text-white/40">Call</span>
                    </a>
                  )}
                  {appointment.customer.email && (
                    <a
                      href={`mailto:${appointment.customer.email}`}
                      className="flex items-center gap-3 border-t border-black/[0.05] px-4 py-3 text-sm text-[#3C3C43] transition-colors hover:bg-black/[0.03] dark:border-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.06]"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                        <Mail className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{appointment.customer.email}</span>
                      <span className="text-[11px] font-medium text-[#8E8E93] dark:text-white/40">Email</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Latest bookings from this client */}
            {recentBookings.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93] dark:text-white/40">
                  <History className="h-3.5 w-3.5" />
                  Latest bookings
                </p>
                <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.02] dark:border-white/[0.08] dark:bg-white/[0.04]">
                  {recentBookings.map((booking, index) => (
                    <div
                      key={booking.id}
                      className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-black/[0.05] dark:border-white/[0.06]' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1C1C1E] dark:text-white/90">{booking.serviceName}</p>
                        <p className="mt-0.5 text-xs text-[#8E8E93] dark:text-white/45">
                          {format(new Date(booking.date), 'MMM d, yyyy')} · {booking.time}
                        </p>
                      </div>
                      {booking.price != null && (
                        <span className="shrink-0 text-sm font-medium text-[#3C3C43] dark:text-white/70">${booking.price}</span>
                      )}
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        booking.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : booking.status === 'cancelled'
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                            : 'bg-black/[0.05] text-[#8E8E93] dark:bg-white/[0.08] dark:text-white/50'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {rescheduling ? (
              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-[#8E8E93] dark:text-white/50">New date</label>
                    <Input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="h-11 border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.05]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-[#8E8E93] dark:text-white/50">New time</label>
                    <Input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      min={rescheduleDate === format(new Date(), 'yyyy-MM-dd') ? format(new Date(), 'HH:mm') : undefined}
                      className="h-11 border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.05]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <CandyButton
                    variant="obsidian"
                    className="flex-1"
                    onClick={() => setRescheduling(false)}
                  >
                    Back
                  </CandyButton>
                  <CandyButton
                    variant="emerald"
                    className="flex-1"
                    leftIcon={<RefreshCw size={16} strokeWidth={1.75} />}
                    onClick={saveReschedule}
                    disabled={!rescheduleDate || !rescheduleTime || isSavingReschedule}
                  >
                    {isSavingReschedule ? 'Saving…' : 'Reschedule'}
                  </CandyButton>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                <CandyButton
                  variant="emerald"
                  className="min-w-[140px] flex-1"
                  leftIcon={<Check size={16} strokeWidth={1.75} />}
                  onClick={completeAppointment}
                  disabled={isCompleting || appointment.status === 'completed'}
                >
                  {appointment.status === 'completed' ? 'Completed' : 'Complete'}
                </CandyButton>
                <CandyButton
                  variant="obsidian"
                  className="min-w-[140px] flex-1"
                  leftIcon={<RefreshCw size={16} strokeWidth={1.75} />}
                  onClick={startReschedule}
                >
                  Reschedule
                </CandyButton>
                <ConfirmMorph
                  className="[--control-height-sm:48px] [--text-sm:15px]"
                  label="Cancel appointment"
                  icon={<Trash2 size={16} strokeWidth={1.75} />}
                  prompt="Cancel this appointment?"
                  confirmLabel="Yes, cancel"
                  pendingLabel="Cancelling"
                  doneLabel="Cancelled"
                  undoLabel="Undo"
                  undoingLabel="Restoring"
                  confirmMode="hold"
                  onConfirm={removeAppointment}
                  onUndo={restoreAppointment}
                  onStateChange={onMorphStateChange}
                />
              </div>
            )}
          </div>
      )}
    </BottomSheet>
  );
}

export default AppointmentDetailsDrawer;
