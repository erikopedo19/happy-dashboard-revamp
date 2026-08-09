import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, Info, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

type AlertStatus = "default" | "accent" | "danger" | "success" | "warning";

interface PhoneAlertItem {
  id: string;
  status: AlertStatus;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  persistent?: boolean;
}

interface PhoneAlertsContextValue {
  alerts: PhoneAlertItem[];
  addAlert: (alert: Omit<PhoneAlertItem, "id">) => string;
  removeAlert: (id: string) => void;
}

const PhoneAlertsContext = createContext<PhoneAlertsContextValue | null>(null);

export function usePhoneAlerts() {
  const ctx = useContext(PhoneAlertsContext);
  if (!ctx) throw new Error("usePhoneAlerts must be used inside PhoneAlertsProvider");
  return ctx;
}

export function PhoneAlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<PhoneAlertItem[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addAlert = useCallback((alert: Omit<PhoneAlertItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setAlerts((prev) => [...prev, { ...alert, id }]);
    if (!alert.persistent) {
      setTimeout(() => removeAlert(id), 6000);
    }
    return id;
  }, [removeAlert]);

  return (
    <PhoneAlertsContext.Provider value={{ alerts, addAlert, removeAlert }}>
      {children}
    </PhoneAlertsContext.Provider>
  );
}

const statusStyles: Record<AlertStatus, string> = {
  default: "bg-[#1C1C1E] border-white/10 text-white",
  accent: "bg-[#0A84FF]/15 border-[#0A84FF]/30 text-white",
  danger: "bg-red-500/15 border-red-500/30 text-white",
  success: "bg-green-500/15 border-green-500/30 text-white",
  warning: "bg-amber-500/15 border-amber-500/30 text-white",
};

const StatusIcon = ({ status }: { status: AlertStatus }) => {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    case "danger":
      return <XCircle className="w-5 h-5 text-red-400" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    case "accent":
      return <Info className="w-5 h-5 text-[#0A84FF]" />;
    default:
      return <Info className="w-5 h-5 text-white/70" />;
  }
};

function SwipeAlert({
  alert,
  onClose,
}: {
  alert: PhoneAlertItem;
  onClose: () => void;
}) {
  const controls = useRef<any>(null);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    if (info.offset.y < -80 || (info.velocity.y < -500 && info.offset.y < 0)) {
      onClose();
    } else {
      controls.current?.start?.({ y: 0, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  };

  return (
    <motion.div
      ref={controls}
      layout
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.96 }}
      drag="y"
      dragConstraints={{ top: -200, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className={cn(
        "w-full rounded-[22px] border p-4 shadow-lg backdrop-blur-xl",
        statusStyles[alert.status]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-0.5">
          {alert.icon ?? <StatusIcon status={alert.status} />}
        </div>
        <div className="flex-1 min-w-0">
          {typeof alert.title === "string" ? (
            <p className="text-sm font-semibold leading-tight">{alert.title}</p>
          ) : (
            alert.title
          )}
          {alert.description && (
            <div className="mt-1 text-sm text-white/70 leading-snug">
              {typeof alert.description === "string" ? (
                <p>{alert.description}</p>
              ) : (
                alert.description
              )}
            </div>
          )}
          {alert.actions && <div className="mt-2 flex flex-wrap gap-2">{alert.actions}</div>}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function PhoneAlerts() {
  const ctx = useContext(PhoneAlertsContext);
  if (!ctx) return null;
  const { alerts, removeAlert } = ctx;

  return (
    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-0 right-0 z-[100] pointer-events-none px-4 flex flex-col gap-3 items-center">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <div key={alert.id} className="w-full max-w-md pointer-events-auto">
            <SwipeAlert alert={alert} onClose={() => removeAlert(alert.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Compound Alert components for inline / advanced usage
interface AlertProps {
  status?: AlertStatus;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

export function Alert({ status = "default", children, className, onClose }: AlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-[18px] border p-4 flex items-start gap-3",
        statusStyles[status],
        className
      )}
    >
      {children}
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

export function AlertIndicator({ children }: { children?: ReactNode }) {
  return <div className="shrink-0 pt-0.5">{children ?? <Info className="w-5 h-5 text-white/70" />}</div>;
}

export function AlertContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex-1 min-w-0", className)}>{children}</div>;
}

export function AlertTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm font-semibold leading-tight", className)}>{children}</p>;
}

export function AlertDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-1 text-sm text-white/70 leading-snug", className)}>{children}</div>;
}

export { Loader2 };
