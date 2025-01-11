import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkeletonChart } from "./skeleton-chart"
import { useEffect, useState } from "react"
import { fetchDashboardData } from "@/lib/dashboard-helpers"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface DailySpendingProps {
  userId: string
  selectedDate: Date
}

export function DailySpending({ userId, selectedDate }: DailySpendingProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<{ day: number; total: number; avgAmount: number }[]>([])

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const dashboardData = await fetchDashboardData(userId, selectedDate)
        setData(dashboardData.dailyTotals)
      } catch (error) {
        console.error('Error loading daily spending:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId, selectedDate])

  if (isLoading) {
    return <SkeletonChart title="Daily Spending" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
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
        </div>
      </CardContent>
    </Card>
  )
} 