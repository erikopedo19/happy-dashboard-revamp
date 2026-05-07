import { MoreHorizontal, Calendar, Clock } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const db = supabase as any;

type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "pending" | "confirmed" | string;

interface AppointmentRow {
    id: string;
    appointment_date: string;
    appointment_time: string;
    status: AppointmentStatus | null;
    price: number | null;
    customer: { name: string | null } | null;
    service: { name: string | null } | null;
}

export function AppointmentsTable() {
    const { user } = useAuth();

    const { data: appointments = [], isLoading } = useQuery<AppointmentRow[]>({
        queryKey: ["dashboard_appointments", user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await db
                .from("appointments")
                .select(`id, appointment_date, appointment_time, status, price, customer:customers(name), service:services(name)`)
                .eq("user_id", user.id)
                .order("appointment_date", { ascending: false })
                .order("appointment_time", { ascending: false })
                .limit(20);

            if (error) throw error;
            return (data || []) as unknown as AppointmentRow[];
        },
        enabled: !!user,
    });

    return (
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="w-[250px] text-muted-foreground">Customer</TableHead>
                    <TableHead className="text-muted-foreground">Service</TableHead>
                    <TableHead className="text-muted-foreground">Date & Time</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-muted/50 border-border transition-colors">
                            <TableCell className="font-medium">
                                <div className="h-4 w-40 bg-muted rounded" />
                            </TableCell>
                            <TableCell><div className="h-4 w-28 bg-muted rounded" /></TableCell>
                            <TableCell><div className="h-4 w-36 bg-muted rounded" /></TableCell>
                            <TableCell><div className="h-6 w-20 bg-muted rounded-full" /></TableCell>
                            <TableCell className="text-right"><div className="h-4 w-20 bg-muted rounded ml-auto" /></TableCell>
                            <TableCell><div className="h-8 w-8 bg-muted rounded ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : appointments.length === 0 ? (
                    <TableRow className="border-border">
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            No appointments found
                        </TableCell>
                    </TableRow>
                ) : (
                    appointments.map((appointment) => {
                        const customerName = appointment.customer?.name?.trim() || `Customer #${appointment.id.slice(0, 8)}`;
                        const initials = customerName
                            .split(/\s+/)
                            .map((w) => w.charAt(0))
                            .filter(Boolean)
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();

                        const status = (appointment.status || "scheduled").toLowerCase();
                        const statusClass =
                            status === "completed"
                                ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                                : status === "cancelled"
                                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                  : status === "pending"
                                    ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                                    : status === "confirmed"
                                      ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                      : "bg-slate-500/10 text-slate-600 hover:bg-slate-500/20";

                        const dateTimeLabel = (() => {
                            const dt = appointment.appointment_date ? new Date(appointment.appointment_date) : null;
                            const dateLabel = dt && !Number.isNaN(dt.getTime()) ? format(dt, "yyyy-MM-dd") : "-";
                            const timeLabel = appointment.appointment_time || "-";
                            return { dateLabel, timeLabel };
                        })();

                        const amountLabel = typeof appointment.price === "number" ? `$${appointment.price.toFixed(2)}` : "$0.00";

                        return (
                            <TableRow key={appointment.id} className="hover:bg-muted/50 border-border transition-colors">
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {initials}
                                        </div>
                                        <span className="text-foreground">{customerName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-foreground">{appointment.service?.name || "Unknown Service"}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-sm">
                                        <span className="flex items-center gap-1 text-foreground">
                                            <Calendar className="w-3 h-3 text-muted-foreground" /> {dateTimeLabel.dateLabel}
                                        </span>
                                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                            <Clock className="w-3 h-3" /> {dateTimeLabel.timeLabel}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className={`${statusClass} capitalize border-0`}>
                                        {appointment.status || "scheduled"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium text-foreground">{amountLabel}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Open menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem className="focus:bg-muted focus:text-foreground">View details</DropdownMenuItem>
                                            <DropdownMenuItem className="focus:bg-muted focus:text-foreground">Edit appointment</DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-border" />
                                            <DropdownMenuItem className="text-red-500 focus:bg-red-500/10 focus:text-red-500">Cancel appointment</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })
                )}
            </TableBody>
        </Table>
    );
}
