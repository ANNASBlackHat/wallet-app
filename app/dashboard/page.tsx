'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { EnhancedDateRangePicker } from '@/components/enhanced-date-range-picker'
import { AddExpenseDialog } from '@/components/add-expense-dialog'
import { AuthGuard } from '@/components/auth-guard'
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { fetchDashboardData, fetchMonthlyComparison, fetchCategoryTrends, type DashboardData } from '@/lib/dashboard-helpers'

// Import dashboard components
import { DashboardContainer, DashboardMetricsSection, DashboardChartsSection, DashboardInsightsSection, DashboardFullWidthSection } from '@/components/dashboard/dashboard-container'
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
      <DashboardContainer>
        {/* Header with Date Range Picker */}
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
            {/* Key Metrics */}
            <DashboardMetricsSection>
              <TotalSpendingCard 
                total={dashboardData.currentMonthTotal}
                previousTotal={dashboardData.previousMonthTotal}
                change={dashboardData.monthlyChange}
              />
              <DailyAverageCard 
                data={dashboardData.dailyTotals}
              />
            </DashboardMetricsSection>

            {/* Main Charts */}
            <DashboardChartsSection>
              <CategoryBreakdown data={dashboardData.categoryTotals} />
              {userId && (
                <MonthlyTrend userId={userId} selectedDate={dateRange.from} />
              )}
            </DashboardChartsSection>

            {/* Detailed Charts */}
            <DashboardFullWidthSection>
              <DailySpending data={dashboardData.dailyTotals} />
            </DashboardFullWidthSection>

            {/* Category Trends */}
            <DashboardFullWidthSection>
              {userId && (
                <CategoryTrends userId={userId} selectedDate={dateRange.from} />
              )}
            </DashboardFullWidthSection>

            {/* Recent Transactions */}
            <DashboardFullWidthSection>
              <RecentTransactions 
                data={dashboardData.recentExpenses} 
                onDelete={loadDashboardData}
                onEdit={loadDashboardData}
              />
            </DashboardFullWidthSection>
          </>
        ) : null}

        <AddExpenseDialog onSuccessfulSubmit={loadDashboardData} />
      </DashboardContainer>
    </AuthGuard>
  )
}

