import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkeletonChart } from "./skeleton-chart"
import { useEffect, useState } from "react"
import { fetchCategoryTrends } from "@/lib/dashboard-helpers"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

interface CategoryTrendsProps {
  userId: string
  selectedDate: Date
}

export function CategoryTrends({ userId, selectedDate }: CategoryTrendsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<{ [category: string]: { month: string; amount: number }[] }>({})

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const trendsData = await fetchCategoryTrends(userId)
        setData(trendsData)
      } catch (error) {
        console.error('Error loading category trends:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId])  // Note: selectedDate not included as we always want 3 months of data

  if (isLoading) {
    return <SkeletonChart title="Category Trends" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart>
              {Object.entries(data).map(([category, categoryData], index) => (
                <Line
                  key={category}
                  type="monotone"
                  data={categoryData}
                  dataKey="amount"
                  name={category}
                  stroke={COLORS[index % COLORS.length]}
                />
              ))}
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
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 