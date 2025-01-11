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
import { format } from 'date-fns'
import { fetchDashboardData, fetchMonthlyComparison, fetchCategoryTrends, type DashboardData } from '@/lib/dashboard-helpers'

// Import dashboard components
import { TotalSpendingCard } from '@/components/dashboard/total-spending-card'
import { DailyAverageCard } from '@/components/dashboard/daily-average-card'
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown'
import { MonthlyTrend } from '@/components/dashboard/monthly-trend'
import { DailySpending } from '@/components/dashboard/daily-spending'
import { CategoryTrends } from '@/components/dashboard/category-trends'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function DashboardPage() {
  const { userId } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())

  if (!userId) {
    return null
  }

  return (
    <AuthGuard>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <EnhancedDateRangePicker
              value={{ 
                from: selectedDate,
                to: selectedDate
              }}
              onChange={(newDate) => {
                if (newDate?.from) {
                  setSelectedDate(newDate.from)
                }
              }}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <TotalSpendingCard userId={userId} selectedDate={selectedDate} />
          <DailyAverageCard userId={userId} selectedDate={selectedDate} />
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <CategoryBreakdown userId={userId} selectedDate={selectedDate} />
          </div>
          <div className="col-span-3">
            <MonthlyTrend userId={userId} selectedDate={selectedDate} />
          </div>
          <div className="col-span-4">
            <DailySpending userId={userId} selectedDate={selectedDate} />
          </div>
          <div className="col-span-3">
            <CategoryTrends userId={userId} selectedDate={selectedDate} />
          </div>
        </div>

        {/* Recent Transactions */}
        <RecentTransactions userId={userId} selectedDate={selectedDate} />
      </div>
    </AuthGuard>
  )
}

