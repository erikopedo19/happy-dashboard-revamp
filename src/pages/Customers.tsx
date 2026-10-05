/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Mail, Phone, MoreHorizontal, Edit, Trash2, Users, Sparkles, Repeat, X, ChevronRight } from "lucide-react";
import { format, formatDistanceToNowStrict, parseISO, subDays } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useVirtualRows } from "@/lib/useVirtualRows";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

interface CustomerStats {
  visits: number;
  lastVisit: string | null;
  nextVisit: string | null;
  spent: number;
}

type Segment = "all" | "regulars" | "new" | "inactive";
type SortKey = "name" | "recent" | "visits";

const customerFormSchema = z.object({
  name: z.string().trim().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).nullable().or(z.literal("")),
  phone: z.string().nullable().or(z.literal("")),
  notes: z.string().nullable().or(z.literal("")),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

const ROW_HEIGHT = 80;
const REGULAR_VISITS = 3;
const INACTIVE_DAYS = 60;
const NEW_DAYS = 30;

const AVATAR_TONES = [
  ["#FB7185", "#3B1420"],
  ["#60A5FA", "#0F2340"],
  ["#34D399", "#0E2A20"],
  ["#FBBF24", "#3A2A08"],
  ["#A78BFA", "#22173F"],
  ["#F472B6", "#3A1230"],
  ["#2DD4BF", "#0B2B29"],
  ["#FB923C", "#3A1E0B"],
];

function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const EMPTY_STATS: CustomerStats = { visits: 0, lastVisit: null, nextVisit: null, spent: 0 };

const Customers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const { data: customers, isLoading, error } = useQuery<Customer[]>({
    queryKey: ["customers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("customers")
        .select("id, name, email, phone, notes, created_at")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const { data: statsById = {} } = useQuery<Record<string, CustomerStats>>({
    queryKey: ["customer-stats", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("customer_id, appointment_date, status, price, paid_amount")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      const today = format(new Date(), "yyyy-MM-dd");
      const out: Record<string, CustomerStats> = {};
      for (const a of data ?? []) {
        if (!a.customer_id || a.status === "cancelled") continue;
        const s = (out[a.customer_id] ??= { ...EMPTY_STATS });
        if (a.appointment_date <= today) {
          s.visits += 1;
          s.spent += Number(a.paid_amount ?? a.price ?? 0) || 0;
          if (!s.lastVisit || a.appointment_date > s.lastVisit) s.lastVisit = a.appointment_date;
        } else if (!s.nextVisit || a.appointment_date < s.nextVisit) {
          s.nextVisit = a.appointment_date;
        }
      }
      return out;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const statsFor = (id: string) => statsById[id] ?? EMPTY_STATS;

  const segmentCounts = useMemo(() => {
    const list = customers ?? [];
    const newCutoff = subDays(new Date(), NEW_DAYS).toISOString();
    const inactiveCutoff = format(subDays(new Date(), INACTIVE_DAYS), "yyyy-MM-dd");
    const isRegular = (c: Customer) => (statsById[c.id]?.visits ?? 0) >= REGULAR_VISITS;
    const isNew = (c: Customer) => c.created_at >= newCutoff;
    const isInactive = (c: Customer) => {
      const s = statsById[c.id];
      return !s?.nextVisit && (!s?.lastVisit || s.lastVisit < inactiveCutoff) && !isNew(c);
    };
    return {
      predicates: { all: () => true, regulars: isRegular, new: isNew, inactive: isInactive } as Record<Segment, (c: Customer) => boolean>,
      counts: {
        all: list.length,
        regulars: list.filter(isRegular).length,
        new: list.filter(isNew).length,
        inactive: list.filter(isInactive).length,
      } as Record<Segment, number>,
    };
  }, [customers, statsById]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const list = (customers ?? []).filter((c) => {
      if (!segmentCounts.predicates[segment](c)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (digits.length > 2 && (c.phone ?? "").replace(/\D/g, "").includes(digits))
      );
    });
    if (sort === "recent") {
      list.sort((a, b) => (statsById[b.id]?.lastVisit ?? "").localeCompare(statsById[a.id]?.lastVisit ?? ""));
    } else if (sort === "visits") {
      list.sort((a, b) => (statsById[b.id]?.visits ?? 0) - (statsById[a.id]?.visits ?? 0));
    }
    return list;
  }, [customers, query, segment, sort, statsById, segmentCounts]);

  const rows = useVirtualRows({ count: filtered.length, rowHeight: ROW_HEIGHT });
  const visible = filtered.slice(rows.start, rows.end);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["customers", user?.id] });

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await (supabase as any).from("customers").delete().eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Customer deleted" });
      setCustomerToDelete(null);
      setSelected(null);
    },
    onError: (error: Error) => toast({ title: "Error deleting customer", description: error.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CustomerFormData & { id?: string }) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        name: values.name.trim(),
        email: values.email || null,
        phone: values.phone || null,
        notes: values.notes || null,
      };
      const { error } = values.id
        ? await (supabase as any).from("customers").update(payload).eq("id", values.id)
        : await (supabase as any).from("customers").insert({ ...payload, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: (_d, values) => {
      invalidate();
      toast({ title: values.id ? "Customer updated" : "Customer added" });
      setEditing(null);
      setSelected(null);
    },
    onError: (error: Error) => toast({ title: "Couldn't save customer", description: error.message, variant: "destructive" }),
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: "", email: "", phone: "", notes: "" },
  });

  useEffect(() => {
    if (!editing) return;
    form.reset(
      editing === "new"
        ? { name: "", email: "", phone: "", notes: "" }
        : { name: editing.name, email: editing.email || "", phone: editing.phone || "", notes: editing.notes || "" },
    );
  }, [editing, form]);

  function onSubmit(values: CustomerFormData) {
    saveMutation.mutate({ ...values, id: editing && editing !== "new" ? editing.id : undefined });
  }

  const segments: Array<{ key: Segment; label: string; icon: typeof Users }> = [
    { key: "all", label: "All", icon: Users },
    { key: "regulars", label: "Regulars", icon: Repeat },
    { key: "new", label: "New", icon: Sparkles },
    { key: "inactive", label: "Inactive", icon: X },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F2F2F7] dark:bg-black">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Compact sticky header */}
          <header className="relative z-20 shrink-0 bg-[#F2F2F7] px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] dark:bg-black md:px-8 md:pt-6">
            <div className="mx-auto flex max-w-4xl items-center gap-3">
              <SidebarTrigger className="hidden text-[#8E8E93] md:flex" />
              <div className="min-w-0 flex-1">
                <h1 className="text-[26px] font-bold leading-tight tracking-[-0.03em] text-[#1C1C1E] dark:text-white md:text-[30px]">Customers</h1>
                <p className="text-[13px] text-[#8E8E93]">
                  {isLoading ? "Loading…" : `${customers?.length ?? 0} ${customers?.length === 1 ? "person" : "people"} in your book`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="btn-soft-dark flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
            </div>

            <div className="mx-auto mt-3 flex max-w-4xl gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customers"
                  className="h-11 w-full rounded-2xl border border-black/5 bg-white pl-10 pr-9 text-[15px] text-[#1C1C1E] outline-none placeholder:text-[#8E8E93] focus:ring-2 focus:ring-[#FB7185]/50 dark:border-white/10 dark:bg-[#1C1C1E] dark:text-white"
                />
                {query && (
                  <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/10 text-[#3A3A3C] dark:bg-white/15 dark:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Sort customers"
                className="h-11 rounded-2xl border border-black/5 bg-white px-3 text-[14px] font-medium text-[#1C1C1E] outline-none dark:border-white/10 dark:bg-[#1C1C1E] dark:text-white"
              >
                <option value="name">A–Z</option>
                <option value="recent">Recent</option>
                <option value="visits">Most visits</option>
              </select>
            </div>

            <div className="mx-auto mt-3 flex max-w-4xl gap-2 overflow-x-auto scrollbar-hide">
              {segments.map(({ key, label, icon: Icon }) => {
                const active = segment === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSegment(key)}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                      active ? "btn-soft-dark" : "bg-white text-[#3A3A3C] ring-1 ring-black/5 dark:bg-[#1C1C1E] dark:text-white/80 dark:ring-white/10",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", active ? "text-[#FB7185]" : "text-[#8E8E93]")} />
                    {label}
                    <span className={cn("tabular-nums", active ? "text-white/60" : "text-[#8E8E93]")}>{segmentCounts.counts[key]}</span>
                  </button>
                );
              })}
            </div>
          </header>

          <div className="relative min-h-0 flex-1">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-[#F2F2F7] to-transparent dark:from-black" />
            <div ref={rows.containerRef} className="h-full overflow-y-auto overscroll-contain px-4 pb-32 pt-2 md:px-8">
              <div className="mx-auto max-w-4xl">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex h-[72px] items-center gap-3 rounded-[20px] bg-white px-4 dark:bg-[#1C1C1E]">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="rounded-[20px] bg-white p-6 text-center text-[14px] text-red-500 dark:bg-[#1C1C1E]">
                    Couldn't load customers: {(error as Error).message}
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    searching={!!query || segment !== "all"}
                    onReset={() => { setQuery(""); setSegment("all"); }}
                    onAdd={() => setEditing("new")}
                  />
                ) : (
                  <div style={{ paddingTop: rows.paddingTop, paddingBottom: rows.paddingBottom }}>
                    {visible.map((c) => (
                      <CustomerRow
                        key={c.id}
                        customer={c}
                        stats={statsFor(c.id)}
                        onOpen={() => setSelected(c)}
                        onEdit={() => setEditing(c)}
                        onDelete={() => setCustomerToDelete(c)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Customer detail sheet */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-[420px]">
          {selected && (
            <CustomerDetail
              customer={selected}
              stats={statsFor(selected.id)}
              onEdit={() => { setEditing(selected); setSelected(null); }}
              onDelete={() => setCustomerToDelete(selected)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add / edit */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New customer" : "Edit customer"}</DialogTitle>
            <DialogDescription>{editing === "new" ? "Add someone to your customer book." : "Update their contact details."}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" autoComplete="off" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input type="tel" placeholder="+1 234 567 890" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="john@example.com" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Preferred cut, allergies, anything to remember…" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="gap-2 pt-2 sm:gap-0">
                <button type="button" onClick={() => setEditing(null)} className="h-11 rounded-full px-5 text-[14px] font-semibold text-[#3A3A3C] ring-1 ring-black/10 dark:text-white/80 dark:ring-white/15">
                  Cancel
                </button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-soft-dark h-11 rounded-full px-6 text-[14px] font-semibold disabled:opacity-60">
                  {saveMutation.isPending ? "Saving…" : editing === "new" ? "Add customer" : "Save changes"}
                </button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {customerToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone. Their contact details will be removed from your customer book.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-[#e11d48] hover:bg-[#be123c]"
              onClick={() => customerToDelete && deleteMutation.mutate(customerToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

function Avatar({ customer, size = 44 }: { customer: Customer; size?: number }) {
  const [fg, bg] = toneFor(customer.id);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.36, boxShadow: `inset 0 0 0 1px ${fg}33` }}
    >
      {initials(customer.name)}
    </div>
  );
}

function lastVisitLabel(stats: CustomerStats) {
  if (stats.nextVisit) return `Next ${format(parseISO(stats.nextVisit), "MMM d")}`;
  if (stats.lastVisit) return `Last ${formatDistanceToNowStrict(parseISO(stats.lastVisit), { addSuffix: true })}`;
  return "No visits yet";
}

function CustomerRow({
  customer,
  stats,
  onOpen,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  stats: CustomerStats;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const regular = stats.visits >= REGULAR_VISITS;
  return (
    <div style={{ height: ROW_HEIGHT }} className="pb-2">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
        className="flex h-full items-center gap-3 rounded-[20px] bg-white px-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] transition-transform active:scale-[0.99] dark:bg-[#1C1C1E] dark:ring-white/[0.06]"
      >
        <Avatar customer={customer} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold text-[#1C1C1E] dark:text-white">{customer.name}</p>
            {regular && (
              <span className="shrink-0 rounded-full bg-[#FB7185]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#E11D48] dark:text-[#FDA4AF]">
                Regular
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-[#8E8E93]">
            {stats.visits} {stats.visits === 1 ? "visit" : "visits"} · {lastVisitLabel(stats)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {customer.phone && (
            <a href={`tel:${customer.phone}`} aria-label={`Call ${customer.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-[#1C1C1E] dark:bg-white/[0.08] dark:text-white">
              <Phone className="h-4 w-4" />
            </a>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More actions" className="flex h-9 w-9 items-center justify-center rounded-full text-[#8E8E93] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              {customer.email && (
                <DropdownMenuItem asChild>
                  <a href={`mailto:${customer.email}`}><Mail className="mr-2 h-4 w-4" />Email</a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({
  customer,
  stats,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  stats: CustomerStats;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center pt-2 text-center">
        <Avatar customer={customer} size={72} />
        <DialogTitle className="mt-3 text-[22px] font-bold tracking-[-0.02em]">{customer.name}</DialogTitle>
        <DialogDescription className="text-[13px]">
          Customer since {format(parseISO(customer.created_at), "MMM yyyy")}
        </DialogDescription>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Visits" value={String(stats.visits)} />
        <Stat label="Spent" value={`€${Math.round(stats.spent)}`} />
        <Stat label={stats.nextVisit ? "Next" : "Last"} value={stats.nextVisit ? format(parseISO(stats.nextVisit), "MMM d") : stats.lastVisit ? format(parseISO(stats.lastVisit), "MMM d") : "—"} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-black/[0.03] dark:bg-white/[0.05]">
        <ContactLine icon={Phone} label="Phone" value={customer.phone} href={customer.phone ? `tel:${customer.phone}` : undefined} />
        <ContactLine icon={Mail} label="Email" value={customer.email} href={customer.email ? `mailto:${customer.email}` : undefined} />
      </div>

      {customer.notes && (
        <div className="rounded-2xl bg-black/[0.03] p-3.5 text-[14px] text-[#3A3A3C] dark:bg-white/[0.05] dark:text-white/80">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">Notes</p>
          <p className="whitespace-pre-wrap">{customer.notes}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onDelete} className="flex h-11 w-11 items-center justify-center rounded-full text-red-500 ring-1 ring-red-500/25" aria-label="Delete customer">
          <Trash2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={onEdit} className="btn-soft-dark flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold">
          <Edit className="h-4 w-4" />
          Edit details
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.03] py-3 dark:bg-white/[0.05]">
      <p className="text-[17px] font-bold tabular-nums text-[#1C1C1E] dark:text-white">{value}</p>
      <p className="text-[11px] text-[#8E8E93]">{label}</p>
    </div>
  );
}

function ContactLine({ icon: Icon, label, value, href }: { icon: typeof Phone; label: string; value: string | null; href?: string }) {
  const content = (
    <>
      <Icon className="h-4 w-4 text-[#8E8E93]" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-[#8E8E93]">{label}</p>
        <p className={cn("truncate text-[14px]", value ? "text-[#1C1C1E] dark:text-white" : "text-[#8E8E93]")}>{value || "Not added"}</p>
      </div>
      {href && <ChevronRight className="h-4 w-4 text-[#C7C7CC]" />}
    </>
  );
  const cls = "flex items-center gap-3 px-4 py-3 [&+&]:border-t [&+&]:border-black/5 dark:[&+&]:border-white/10";
  return href ? <a href={href} className={cls}>{content}</a> : <div className={cls}>{content}</div>;
}

function EmptyState({ searching, onReset, onAdd }: { searching: boolean; onReset: () => void; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[24px] bg-white px-6 py-12 text-center dark:bg-[#1C1C1E]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FB7185]/15 text-[#E11D48] dark:text-[#FDA4AF]">
        {searching ? <Search className="h-6 w-6" /> : <Users className="h-6 w-6" />}
      </div>
      <p className="mt-4 text-[17px] font-semibold text-[#1C1C1E] dark:text-white">{searching ? "No matches" : "No customers yet"}</p>
      <p className="mt-1 max-w-xs text-[14px] text-[#8E8E93]">
        {searching ? "Try a different name, number or filter." : "Customers appear here when they book, or you can add them yourself."}
      </p>
      <button type="button" onClick={searching ? onReset : onAdd} className="btn-soft-dark mt-5 h-11 rounded-full px-5 text-[14px] font-semibold">
        {searching ? "Clear filters" : "Add customer"}
      </button>
    </div>
  );
}

export default Customers;
