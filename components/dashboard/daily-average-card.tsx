import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkeletonCard } from "./skeleton-card"
import { useEffect, useState } from "react"
import { fetchDashboardData } from "@/lib/dashboard-helpers"

interface DailyAverageCardProps {
  userId: string
  selectedDate: Date
}

export function DailyAverageCard({ userId, selectedDate }: DailyAverageCardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<{ average: number; count: number } | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const dashboardData = await fetchDashboardData(userId, selectedDate)
        setData({
          average: dashboardData.monthlySummary?.avgPerDay || 0,
          count: dashboardData.monthlySummary?.expenseCount || 0
        })
      } catch (error) {
        console.error('Error loading daily average:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId, selectedDate])

  if (isLoading || !data) {
    return <SkeletonCard />
  }

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
          }).format(data.average)}
        </div>
        <p className="text-xs text-muted-foreground">
          {data.count} expenses this month
        </p>
      </CardContent>
    </Card>
  )
} 