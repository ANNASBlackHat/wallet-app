'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkeletonChart } from "./skeleton-chart"
import { useEffect, useState, useMemo } from "react"
import { fetchCategoryTrends } from "@/lib/dashboard-helpers"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Button } from "@/components/ui/button"
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const COLORS = {
  up: '#4ade80',    // green
  down: '#f87171',  // red
  stable: '#94a3b8', // slate
  line: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']
}

interface CategoryTrendsProps {
  userId: string
  selectedDate: Date
}

interface CategoryTrendSummary {
  category: string
  currentAmount: number
  previousAmount: number
  changePercentage: number
  trend: 'up' | 'down' | 'stable'
}

interface TrendCardProps {
  title: string
  category: string
  amount: number
  change: number
  trend: 'up' | 'down' | 'stable'
}

function TrendCard({ title, category, amount, change, trend }: TrendCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUpIcon : trend === 'down' ? ArrowDownIcon : ArrowRightIcon
  const trendColor = COLORS[trend]

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold mt-1">{category}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              maximumFractionDigits: 0,
              notation: 'compact'
            }).format(amount)}
          </p>
          <div className="flex items-center" style={{ color: trendColor }}>
            <TrendIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CategoryTrends({ userId, selectedDate }: CategoryTrendsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<{ [category: string]: { month: string; amount: number }[] }>({})
  const [timeRange, setTimeRange] = useState<'3' | '6' | '12'>('3')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Calculate trend summaries
  const trendSummaries = useMemo(() => {
    const summaries: CategoryTrendSummary[] = []
    
    Object.entries(data).forEach(([category, values]) => {
      if (values.length >= 2) {
        const currentAmount = values[values.length - 1].amount
        const previousAmount = values[values.length - 2].amount
        const changePercentage = previousAmount === 0 ? 0 : 
          ((currentAmount - previousAmount) / previousAmount) * 100
        
        summaries.push({
          category,
          currentAmount,
          previousAmount,
          changePercentage,
          trend: changePercentage > 1 ? 'up' : changePercentage < -1 ? 'down' : 'stable'
        })
      }
    })

    return summaries.sort((a, b) => b.currentAmount - a.currentAmount)
  }, [data])

  // Get top categories and insights
  const insights = useMemo(() => {
    if (trendSummaries.length === 0) return null

    const highestSpending = trendSummaries[0]
    const fastestGrowing = [...trendSummaries].sort((a, b) => b.changePercentage - a.changePercentage)[0]
    const highestSaving = [...trendSummaries].sort((a, b) => a.changePercentage - b.changePercentage)[0]

    return {
      highestSpending,
      fastestGrowing,
      highestSaving
    }
  }, [trendSummaries])

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const trendsData = await fetchCategoryTrends(userId, Number(timeRange))
        setData(trendsData)
        
        // Auto-select top 5 categories by current amount
        const topCategories = Object.entries(trendsData)
          .map(([category, values]) => ({
            category,
            amount: values[values.length - 1]?.amount || 0
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
          .map(item => item.category)
        
        setSelectedCategories(topCategories)
      } catch (error) {
        console.error('Error loading category trends:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId, timeRange])

  if (isLoading) {
    return <SkeletonChart title="Category Trends" />
  }

  // Filter data for selected categories
  const chartData = Object.entries(data)
    .filter(([category]) => selectedCategories.includes(category))
    .reduce((acc, [category, values]) => {
      values.forEach(value => {
        const monthIndex = acc.findIndex(item => item.month === value.month)
        if (monthIndex === -1) {
          acc.push({
            month: value.month,
            [category]: value.amount
          })
        } else {
          acc[monthIndex][category] = value.amount
        }
      })
      return acc
    }, [] as any[])
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

  return (
    <div className="space-y-4">
      {insights && (
        <div className="grid gap-4 md:grid-cols-3">
          <TrendCard
            title="Highest Spending"
            category={insights.highestSpending.category}
            amount={insights.highestSpending.currentAmount}
            change={insights.highestSpending.changePercentage}
            trend={insights.highestSpending.trend}
          />
          <TrendCard
            title="Fastest Growing"
            category={insights.fastestGrowing.category}
            amount={insights.fastestGrowing.currentAmount}
            change={insights.fastestGrowing.changePercentage}
            trend={insights.fastestGrowing.trend}
          />
          <TrendCard
            title="Highest Saving"
            category={insights.highestSaving.category}
            amount={insights.highestSaving.currentAmount}
            change={insights.highestSaving.changePercentage}
            trend={insights.highestSaving.trend}
          />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Category Trends</CardTitle>
          <Select
            value={timeRange}
            onValueChange={(value: '3' | '6' | '12') => setTimeRange(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {trendSummaries.map(({ category, trend }) => (
              <Button
                key={category}
                variant={selectedCategories.includes(category) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedCategories(prev => 
                    prev.includes(category)
                      ? prev.filter(c => c !== category)
                      : [...prev, category]
                  )
                }}
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                {selectedCategories.map((category, index) => (
                  <Line
                    key={category}
                    type="monotone"
                    dataKey={category}
                    name={category}
                    stroke={COLORS.line[index % COLORS.line.length]}
                    strokeWidth={2}
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
    </div>
  )
} 