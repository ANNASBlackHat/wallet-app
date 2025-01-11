import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkeletonChart } from "./skeleton-chart"
import { useEffect, useState } from "react"
import { fetchDashboardData, type CategoryTotal } from "@/lib/dashboard-helpers"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

interface CategoryBreakdownProps {
  userId: string
  selectedDate: Date
}

export function CategoryBreakdown({ userId, selectedDate }: CategoryBreakdownProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<CategoryTotal[]>([])

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const dashboardData = await fetchDashboardData(userId, selectedDate)
        setData(dashboardData.categoryTotals)
      } catch (error) {
        console.error('Error loading category breakdown:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId, selectedDate])

  if (isLoading) {
    return <SkeletonChart title="Category Breakdown" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total"
                nameKey="category"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => 
                  new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR'
                  }).format(value)
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 