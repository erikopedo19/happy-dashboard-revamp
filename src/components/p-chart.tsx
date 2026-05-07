"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  TooltipProps
} from "recharts"

interface AppointmentData {
  period: string
  booked: number
  cancelled?: number
}

interface PChartProps {
  data: AppointmentData[]
  className?: string
  showCancellations?: boolean
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-gray-500 text-xs mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function PChart({ data, className, showCancellations = false }: PChartProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="fillBooked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fillCancelled" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <CartesianGrid vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
          
          <XAxis 
            dataKey="period" 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8}
            tick={{ fill: '#6b7280', fontSize: 11 }} 
          />
          
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={false} />
          
          {showCancellations && (
            <Area
              dataKey="cancelled"
              name="Cancelled"
              type="natural"
              fill="url(#fillCancelled)"
              fillOpacity={0.4}
              stroke="#ef4444"
              strokeWidth={2}
              stackId="a"
            />
          )}
          
          <Area
            dataKey="booked"
            name="Booked"
            type="natural"
            fill="url(#fillBooked)"
            fillOpacity={0.4}
            stroke="#3b82f6"
            strokeWidth={2}
            stackId="a"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Pre-configured chart for appointments with gradient fill
export function AppointmentsChart({ 
  data, 
  className,
  showCancellations = false
}: { 
  data: AppointmentData[]
  className?: string 
  showCancellations?: boolean
}) {
  return (
    <PChart 
      data={data} 
      className={className} 
      showCancellations={showCancellations}
    />
  )
}
