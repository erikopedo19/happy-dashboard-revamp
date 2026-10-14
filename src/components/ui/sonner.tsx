import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const isMobile = useIsMobile()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
      position={isMobile ? "top-center" : "bottom-right"}
      offset={isMobile ? "calc(env(safe-area-inset-top) + 8px)" : undefined}
      mobileOffset={
        isMobile
          ? {
              top: "calc(env(safe-area-inset-top) + 8px)",
              right: 12,
              bottom: 16,
              left: 12,
            }
          : undefined
      }
    />
  )
}

export { Toaster, toast }
