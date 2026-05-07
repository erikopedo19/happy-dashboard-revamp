'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

// Revenue data by category
const revenueData = {
  '7d': [
    { period: 'Mon', barbers: 1200, products: 450, treatments: 380 },
    { period: 'Tue', barbers: 1350, products: 520, treatments: 420 },
    { period: 'Wed', barbers: 980, products: 380, treatments: 290 },
    { period: 'Thu', barbers: 1500, products: 580, treatments: 450 },
    { period: 'Fri', barbers: 1800, products: 680, treatments: 520 },
    { period: 'Sat', barbers: 2100, products: 780, treatments: 580 },
    { period: 'Sun', barbers: 1100, products: 420, treatments: 320 },
  ],
  '30d': [
    { period: 'Week 1', barbers: 8900, products: 3200, treatments: 2500 },
    { period: 'Week 2', barbers: 10200, products: 3800, treatments: 2900 },
    { period: 'Week 3', barbers: 7200, products: 2800, treatments: 2100 },
    { period: 'Week 4', barbers: 9400, products: 3500, treatments: 2700 },
  ],
  '90d': [
    { period: 'Jan', barbers: 37000, products: 14500, treatments: 11200 },
    { period: 'Feb', barbers: 39500, products: 15200, treatments: 12100 },
    { period: 'Mar', barbers: 28500, products: 11000, treatments: 8500 },
    { period: 'Apr', barbers: 35500, products: 13800, treatments: 10500 },
  ],
  '12m': [
    { period: 'Q1', barbers: 112000, products: 42000, treatments: 32000 },
    { period: 'Q2', barbers: 128000, products: 48000, treatments: 37000 },
    { period: 'Q3', barbers: 82000, products: 31000, treatments: 24000 },
    { period: 'Q4', barbers: 138000, products: 52000, treatments: 40000 },
  ],
};

// Fetch data from Supabase
const useRevenueData = (period: PeriodKey) => {
  const { data: appointments } = useQuery({
    queryKey: ['revenue_data', period],
    queryFn: async () => {
      let { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          price,
          service:services(
            id,
            name,
            category
          ),
          created_at
        `)
        .eq('status', 'completed');

      if (error) throw error;

      // Group by category and date
      const grouped = (appointments || []).reduce((acc: any, apt: any) => {
        const date = new Date(apt.created_at);
        const category = apt.service?.category || 'other';
        const dateKey = format(date, getPeriodFormat(period));
        
        if (!acc[dateKey]) acc[dateKey] = { barbers: 0, products: 0, treatments: 0 };
        acc[dateKey][category] = (acc[dateKey][category] || 0) + (apt.price || 0);
        
        return acc;
      }, {});

      // Convert to array format
      return Object.entries(grouped).map(([date, values]: [string, any]) => ({
        period: date,
        ...values
      }));
    }
  });

  return appointments || [];
};

// Helper to get date format based on period
const getPeriodFormat = (period: PeriodKey) => {
  switch (period) {
    case '7d': return 'EEE';
    case '30d': return 'MMM dd';
    case '90d': return 'MMM';
    case '12m': return 'MMM yyyy';
    default: return 'MMM dd';
  }
};

interface CategoryConfig {
  label: string;
  color: string;
  glowColor: string;
}

const chartConfig: Record<string, CategoryConfig> = {
  barbers: {
    label: 'Barber Services',
    color: 'var(--color-blue-500)',
    glowColor: '#60a5fa',
  },
  products: {
    label: 'Product Sales',
    color: 'var(--color-violet-500)',
    glowColor: '#a78bfa',
  },
  treatments: {
    label: 'Treatments',
    color: 'var(--color-emerald-500)',
    glowColor: '#6ee7b7',
  },
} satisfies Record<string, CategoryConfig>;

// Period configuration
const PERIODS = {
  '7d': { key: '7d', label: 'Last 7 days' },
  '30d': { key: '30d', label: 'Last 30 days' },
  '90d': { key: '90d', label: 'Last 90 days' },
  '12m': { key: '12m', label: 'Last 12 months' },
} as const;

type PeriodKey = keyof typeof PERIODS;

// Define category metrics
const categoryMetrics = [
  { key: 'barbers', label: 'Barber Services', color: chartConfig.barbers.color, glowColor: chartConfig.barbers.glowColor },
  { key: 'products', label: 'Product Sales', color: chartConfig.products.color, glowColor: chartConfig.products.glowColor },
  { key: 'treatments', label: 'Treatments', color: chartConfig.treatments.color, glowColor: chartConfig.treatments.glowColor },
];

// Custom Tooltip Component
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-zinc-900 text-white p-3 shadow-lg">
        <div className="text-xs font-medium mb-2 text-zinc-400">{label}</div>
        <div className="space-y-1.5">
          {payload.map((entry) => {
            const category = categoryMetrics.find((c) => c.key === entry.dataKey);
            return (
              <div key={entry.dataKey} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs">{category?.label}</span>
                </div>
                <span className="text-sm font-semibold">${entry.value.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function RevenueChart() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('30d');
  const data = useRevenueData(selectedPeriod);
  
  // Filter data based on selected category
  const filteredData = selectedCategory === 'all'
    ? data
    : data.map(item => ({
        period: item.period,
        [selectedCategory]: item[selectedCategory as keyof typeof item],
      }));

  // Get data for selected period
  const currentData = revenueData[selectedPeriod];

  // Calculate current totals and changes
  const latestData = currentData[currentData.length - 1];
  const previousData = currentData[currentData.length - 2];

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    return previous ? ((current - previous) / previous) * 100 : 0;
  };

  const metrics = categoryMetrics.map((category) => ({
    ...category,
    value: latestData[category.key as keyof typeof latestData] as number,
    change: calculateChange(
      latestData[category.key as keyof typeof latestData] as number,
      previousData[category.key as keyof typeof previousData] as number
    ),
  }));

  return (
    <Card className="w-full bg-white/5 backdrop-blur-sm border-2 border-gray-200 shadow-lg">
      <CardHeader className="border-0 min-h-auto pt-6 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Revenue by Category</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="barbers">Barber Services</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="treatments">Treatments</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodKey)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PERIODS).map((period) => (
                    <SelectItem key={period.key} value={period.key}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {/* Stats Section */}
        <div className="px-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.map((metric) => (
              <div key={metric.key} className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">{metric.label}</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold">${metric.value.toLocaleString()}</span>
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-medium',
                      metric.change >= 0 ? 'text-emerald-500' : 'text-red-500'
                    )}
                  >
                    {metric.change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="relative">
          <ChartContainer config={chartConfig} className="h-[300px] w-full ps-1.5 pe-2.5">
            <ComposedChart
              data={filteredData.length > 0 ? filteredData : currentData}
              margin={{
                top: 25,
                right: 25,
                left: 0,
                bottom: 25,
              }}
            >
              <defs>
                {categoryMetrics.map((category) => (
                  <linearGradient key={category.key} id={`gradient-${category.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={category.color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={category.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />

              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickMargin={12}
                dy={10}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value / 1000}k`}
                tickMargin={12}
              />

              <ChartTooltip content={<CustomTooltip />} />

              {categoryMetrics.map((category) => (
                <React.Fragment key={category.key}>
                  <Area
                    type="monotone"
                    dataKey={category.key}
                    fill={`url(#gradient-${category.key})`}
                    stroke="transparent"
                    stackId="stack"
                  />
                  <Line
                    type="monotone"
                    dataKey={category.key}
                    stroke={category.color}
                    strokeWidth={2}
                    dot={false}
                    className="transition-all duration-300 hover:opacity-90"
                    style={{
                      filter: `drop-shadow(0 0 6px ${category.glowColor})`
                    }}
                    activeDot={{
                      r: 6,
                      fill: category.color,
                      stroke: 'white',
                      strokeWidth: 2,
                      style: {
                        filter: `drop-shadow(0 0 12px ${category.glowColor})`,
                        transition: 'all 0.3s ease'
                      },
                    }}
                  />
                </React.Fragment>
              ))}
            </ComposedChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
