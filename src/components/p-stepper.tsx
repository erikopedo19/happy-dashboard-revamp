"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface Step {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface PStepperProps {
  steps: Step[]
  currentStep: number
  className?: string
  onStepClick?: (step: number) => void
  variant?: "dark" | "light"
}

export function PStepper({ steps, currentStep, className, onStepClick, variant = "light" }: PStepperProps) {
  const isLight = variant === "light"
  
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className={cn(
          "absolute top-5 left-0 w-full h-0.5 -z-10",
          isLight ? "bg-gray-200" : "bg-gray-800"
        )} />
        
        {/* Active line */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 -z-10"
          style={{ width: `${((Math.min(currentStep, steps.length) - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isActive = currentStep >= stepNumber
          const isCurrent = currentStep === stepNumber
          const isCompleted = currentStep > stepNumber
          const Icon = step.icon

          return (
            <div key={index} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => onStepClick?.(stepNumber)}
                disabled={!isActive || isCurrent}
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  isCompleted
                    ? "bg-gradient-to-r from-blue-500 to-cyan-400 border-transparent text-white shadow-lg shadow-blue-500/30"
                    : isCurrent
                      ? isLight
                        ? "bg-white border-blue-500 text-blue-600 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/20"
                        : "bg-gray-900 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/20"
                      : isLight
                        ? "bg-white border-gray-300 text-gray-600"
                        : "bg-gray-900 border-gray-700 text-gray-400"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : Icon ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{stepNumber}</span>
                )}
              </button>
              
              <div className="mt-3 text-center">
                <p className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  isActive 
                    ? isLight ? "text-gray-900" : "text-white"
                    : "text-gray-400"
                )}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
