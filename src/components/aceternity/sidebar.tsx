import { cn } from "@/lib/utils";
import { Link, type LinkProps } from "react-router-dom";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide";
import { MorphIcon } from "morphicons/react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const AceternitySidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useAceternitySidebar = () => {
  const context = useContext(AceternitySidebarContext);
  if (!context) {
    throw new Error("useAceternitySidebar must be used within a AceternitySidebarProvider");
  }
  return context;
};

export const AceternitySidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <AceternitySidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </AceternitySidebarContext.Provider>
  );
};

export const AceternitySidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <AceternitySidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </AceternitySidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as unknown as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({ className, children, ...props }: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useAceternitySidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-sidebar text-sidebar-foreground w-[260px] shrink-0 border-r border-sidebar-border",
        className
      )}
      animate={{
        width: animate ? (open ? "260px" : "64px") : "260px",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({ className, children, ...props }: React.ComponentProps<"div">) => {
  const { open, setOpen } = useAceternitySidebar();
  return (
    <>
      <div
        className={cn("h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-sidebar w-full")}
        {...props}
      >
        <div className="relative z-[110] flex w-full justify-end">
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-full text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <MorphIcon icon={open ? X : Menu} size={22} strokeWidth={2} color="currentColor" />
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={cn(
                "fixed h-full w-full inset-0 bg-sidebar p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  active,
  ...props
}: {
  link: Links;
  className?: string;
  active?: boolean;
  props?: LinkProps;
}) => {
  const { open, animate } = useAceternitySidebar();
  return (
    <Link
      to={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md transition-colors",
        active
          ? "bg-sidebar-ring/80 text-white"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className
      )}
      {...props}
    >
      <span className="shrink-0">{link.icon}</span>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.15 }}
        className="text-sm font-medium whitespace-pre inline-block !p-0 !m-0 truncate"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};
