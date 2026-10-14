"use client"

import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from "react"
import { Search, X } from "lucide-react"

import { BorderBeamInput, type BorderBeamInputProps } from "@/components/ui/border-beam-input"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"

type FixedBeamProps =
  | "active"
  | "beamSize"
  | "borderBeamClassName"
  | "borderBeamStyle"
  | "borderRadius"
  | "brightness"
  | "colorVariant"
  | "duration"
  | "hueRange"
  | "onActivate"
  | "onDeactivate"
  | "saturation"
  | "staticColors"
  | "strength"
  | "theme"
  | "pill"
  | "translucent"
  | "leadingSlot"
  | "trailingSlot"

export type SearchBarProps = Omit<BorderBeamInputProps, FixedBeamProps> & {
  leadingSlot?: ReactNode
  trailingSlot?: ReactNode
  onClear?: () => void
  tone?: "auto" | "dark"
  compact?: boolean
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      className,
      innerRowClassName,
      shellClassName,
      leadingSlot,
      trailingSlot,
      onClear,
      onFocus,
      onBlur,
      tone = "auto",
      compact = false,
      value,
      ...inputProps
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [focused, setFocused] = useState(false)

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, [])

    const handleFocus: BorderBeamInputProps["onFocus"] = (event) => {
      setFocused(true)
      onFocus?.(event)
    }

    const handleBlur: BorderBeamInputProps["onBlur"] = (event) => {
      setFocused(false)
      onBlur?.(event)
    }

    const clearButton =
      onClear && typeof value === "string" && value.length > 0 ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            haptic("light")
            onClear()
            inputRef.current?.focus()
          }}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition active:scale-90",
            tone === "dark"
              ? "bg-white/10 text-white/70"
              : "bg-muted text-muted-foreground"
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null

    return (
      <BorderBeamInput
        {...inputProps}
        ref={inputRef}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        active={focused}
        beamSize="md"
        colorVariant="sunset"
        staticColors
        pill
        borderBeamClassName="rounded-full"
        leadingSlot={
          leadingSlot === undefined ? (
            <Search
              className={cn(
                "h-4 w-4",
                tone === "dark" ? "text-white/45" : "text-muted-foreground"
              )}
            />
          ) : (
            leadingSlot
          )
        }
        trailingSlot={trailingSlot === undefined ? clearButton : trailingSlot}
        translucent={focused}
        className={cn(
          tone === "dark" && "text-white placeholder:text-white/35",
          compact && "min-h-0",
          className
        )}
        innerRowClassName={cn(
          tone === "dark" ? "bg-white/[0.05] px-4" : "bg-background",
          compact && "min-h-9 py-1",
          innerRowClassName
        )}
        shellClassName={cn(
          tone === "dark" &&
            "border-white/10 shadow-none focus-within:border-white/20",
          shellClassName
        )}
      />
    )
  }
)

SearchBar.displayName = "SearchBar"
