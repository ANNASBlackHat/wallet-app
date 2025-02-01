import { MetricCard } from "@/components/dashboard/metric-card"

interface DailyTotal {
  day: number
  total: number
  avgAmount: number
}

interface DailyAverageCardProps {
  data: DailyTotal[]
}

export function DailyAverageCard({ data }: DailyAverageCardProps) {
  // Calculate the average daily spending
  const totalSpending = data.reduce((sum, day) => sum + day.total, 0)
  const averageDaily = data.length > 0 ? totalSpending / data.length : 0

  return (
    <MetricCard title="Daily Average">
      <div className="text-2xl font-bold">
        {new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR'
        }).format(averageDaily)}
      </div>
      <p className="text-xs text-muted-foreground">
        Average daily spending for the period
      </p>
    </MetricCard>
  )
} 