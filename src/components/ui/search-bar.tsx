"use client"

import { forwardRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react"
import { BorderBeam } from "border-beam"

import { SearchField } from "@/components/arc/search-field/search-field"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"

export type SearchBarProps = InputHTMLAttributes<HTMLInputElement> & {
  leadingSlot?: ReactNode
  trailingSlot?: ReactNode
  onClear?: () => void
  tone?: "auto" | "dark"
  compact?: boolean
  /** Deprecated shell hooks kept for API compatibility — the arc field styles itself. */
  innerRowClassName?: string
  shellClassName?: string
}

/**
 * uiarc SearchField wrapped in the app's border-beam glow — the new default
 * search input everywhere. Slots are ignored: the field renders its own
 * search icon and animated clear button.
 */
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
      onChange,
      tone = "auto",
      compact = false,
      value,
      placeholder,
      ...inputProps
    },
    ref
  ) {
    const [focused, setFocused] = useState(false)

    const handleFocus: SearchBarProps["onFocus"] = (event) => {
      setFocused(true)
      onFocus?.(event)
    }

    const handleBlur: SearchBarProps["onBlur"] = (event) => {
      setFocused(false)
      onBlur?.(event)
    }

    const handleValueChange = (next: string) => {
      if (next === "" && typeof value === "string" && value.length > 0) {
        haptic("light")
        onClear?.()
      }
      onChange?.({ target: { value: next } } as React.ChangeEvent<HTMLInputElement>)
    }

    const shellStyle = {
      "--radius-control": "999px",
      ...(compact ? { "--control-height-md": "36px" } : {}),
    } as CSSProperties

    return (
      <BorderBeam
        active={focused}
        borderRadius={9999}
        className="flex w-full min-w-0 max-w-full flex-col items-stretch !overflow-visible rounded-full"
        colorVariant="sunset"
        size="md"
        staticColors
      >
        <div
          className="arc-scope [&_label]:sr-only"
          data-arc-theme={tone === "dark" ? "dark" : undefined}
          style={shellStyle}
        >
          <SearchField
            {...inputProps}
            ref={ref}
            label={typeof placeholder === "string" && placeholder ? placeholder : "Search"}
            value={typeof value === "string" ? value : ""}
            onValueChange={handleValueChange}
            placeholder={placeholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            readOnly={!onChange || undefined}
            className={className}
          />
        </div>
      </BorderBeam>
    )
  }
)

SearchBar.displayName = "SearchBar"
