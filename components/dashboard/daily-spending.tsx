import { ChartCard } from "@/components/dashboard/chart-card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface DailyTotal {
  day: number
  total: number
  avgAmount: number
}

interface DailySpendingProps {
  data: DailyTotal[]
}

export function DailySpending({ data }: DailySpendingProps) {
  return (
    <ChartCard 
      title="Daily Spending"
      description="Daily spending patterns with average line"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="day" />
          <YAxis 
            tickFormatter={(value) => 
              new Intl.NumberFormat('id-ID', {
                notation: 'compact',
                compactDisplay: 'short',
                currency: 'IDR'
              }).format(value)
            }
          />
          <Tooltip
            formatter={(value: number) => 
              new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR'
              }).format(value)
            }
          />
          <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" />
          <Line type="monotone" dataKey="avgAmount" stroke="#82ca9d" name="Average" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
} 