import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DailyTotal {
  day: number
  total: number
  avgAmount: number
  lastMonthTotal: number
}

interface DailyAverageCardProps {
  data: DailyTotal[]
}

export function DailyAverageCard({ data }: DailyAverageCardProps) {
  // Calculate the average daily spending
  const totalSpending = data.reduce((sum, day) => sum + day.total, 0)
  const averageDaily = data.length > 0 ? totalSpending / data.length : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
          }).format(averageDaily)}
        </div>
        <p className="text-xs text-muted-foreground">
          Average daily spending for the period
        </p>
      </CardContent>
    </Card>
  )
} 