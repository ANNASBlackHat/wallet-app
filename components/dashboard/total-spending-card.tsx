import { MetricCard } from "@/components/dashboard/metric-card"

interface TotalSpendingCardProps {
  total: number
  previousTotal: number
  change: number
}

export function TotalSpendingCard({ total, previousTotal, change }: TotalSpendingCardProps) {
  return (
    <MetricCard title="Total Spending">
      <div className="text-2xl font-bold">
        {new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR'
        }).format(total)}
      </div>
      <p className="text-xs text-muted-foreground">
        {change >= 0 ? '+' : ''}{change}% from previous period
      </p>
    </MetricCard>
  )
} 