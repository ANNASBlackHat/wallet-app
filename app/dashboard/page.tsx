'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedDateRangePicker } from '@/components/enhanced-date-range-picker'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, XAxis, YAxis, Bar, LineChart, Line } from 'recharts'
import { AddExpenseDialog } from '@/components/add-expense-dialog'
import { AuthGuard } from '@/components/auth-guard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { fetchDashboardData, fetchMonthlyComparison, fetchCategoryTrends, type DashboardData } from '@/lib/dashboard-helpers'

// Import dashboard components
import { TotalSpendingCard } from '@/components/dashboard/total-spending-card'
import { DailyAverageCard } from '@/components/dashboard/daily-average-card'
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown'
import { MonthlyTrend } from '@/components/dashboard/monthly-trend'
import { DailySpending } from '@/components/dashboard/daily-spending'
import { CategoryTrends } from '@/components/dashboard/category-trends'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'

export default function DashboardPage() {
  const { userId, user } = useAuth()
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  console.log('📊 Dashboard Page - Mounted', { 
    hasUserId: !!userId,
    userEmail: user?.email,
    currentDateRange: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    }
  })

  async function loadDashboardData() {
    console.log('📊 Dashboard Page - Loading data...', { userId })
    if (!userId) {
      console.log('📊 Dashboard Page - No userId available, skipping data load')
      return
    }
    setIsLoading(true)
    try {
      const data = await fetchDashboardData(userId, dateRange)
      console.log('📊 Dashboard Page - Data loaded successfully')
      setDashboardData(data)
    } catch (error) {
      console.error('📊 Dashboard Page - Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [userId, dateRange])

  return (
    <AuthGuard>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <EnhancedDateRangePicker
            value={dateRange}
            onChange={(newDate) => {
              if (newDate?.from) {
                setDateRange({
                  from: newDate.from,
                  to: newDate.to || newDate.from
                })
              }
            }}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : dashboardData ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <TotalSpendingCard 
                total={dashboardData.currentMonthTotal}
                previousTotal={dashboardData.previousMonthTotal}
                change={dashboardData.monthlyChange}
              />
              <DailyAverageCard 
                data={dashboardData.dailyTotals}
              />
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <div className="col-span-4">
                <CategoryBreakdown data={dashboardData.categoryTotals} />
              </div>
              <div className="col-span-3">
                {userId && (
                  <MonthlyTrend userId={userId} selectedDate={dateRange.from} />
                )}
              </div>
              <div className="col-span-4">
                <DailySpending data={dashboardData.dailyTotals} />
              </div>
              <div className="col-span-3">
                {userId && (
                  <CategoryTrends userId={userId} selectedDate={dateRange.from} />
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <RecentTransactions 
              data={dashboardData.recentExpenses} 
              onDelete={loadDashboardData}
              onEdit={loadDashboardData}
            />
          </>
        ) : null}

        <AddExpenseDialog onSuccessfulSubmit={loadDashboardData} />
      </div>
    </AuthGuard>
  )
}

