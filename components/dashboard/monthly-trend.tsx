import { ChartCard } from "@/components/dashboard/chart-card"
import { SkeletonChart } from "./skeleton-chart"
import { useEffect, useState } from "react"
import { fetchMonthlyComparison } from "@/lib/dashboard-helpers"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface MonthlyTrendProps {
  userId: string
  selectedDate: Date
}

export function MonthlyTrend({ userId, selectedDate }: MonthlyTrendProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<{ month: string; total: number }[]>([])

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const monthlyData = await fetchMonthlyComparison(userId)
        setData(monthlyData)
      } catch (error) {
        console.error('Error loading monthly trend:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId])  // Note: selectedDate not included as we always want 6 months of data

  if (isLoading) {
    return <SkeletonChart title="Monthly Trend" />
  }

  return (
    <ChartCard 
      title="Monthly Trend" 
      description="Monthly spending comparison"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="month" />
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
          <Bar dataKey="total" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
} 