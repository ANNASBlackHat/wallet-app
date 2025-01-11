import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkeletonCard } from "./skeleton-card"
import { useEffect, useState } from "react"
import { fetchDashboardData } from "@/lib/dashboard-helpers"

interface TotalSpendingCardProps {
  userId: string
  selectedDate: Date
}

export function TotalSpendingCard({ userId, selectedDate }: TotalSpendingCardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<{ total: number; change: number } | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const dashboardData = await fetchDashboardData(userId, selectedDate)
        setData({
          total: dashboardData.currentMonthTotal,
          change: dashboardData.monthlyChange
        })
      } catch (error) {
        console.error('Error loading total spending:', error)
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
        <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
          }).format(data.total)}
        </div>
        <p className="text-xs text-muted-foreground">
          {data.change >= 0 ? '+' : ''}
          {data.change.toFixed(1)}% from last month
        </p>
      </CardContent>
    </Card>
  )
} 