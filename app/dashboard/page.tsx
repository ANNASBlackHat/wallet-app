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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function DashboardPage() {
  const { userId } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [monthlyComparison, setMonthlyComparison] = useState<{ month: string; total: number }[]>([])
  const [categoryTrends, setCategoryTrends] = useState<{ [category: string]: { month: string; amount: number }[] }>({})

  const loadDashboardData = async () => {
    if (!userId) return
    
    setIsLoading(true)
    try {
      // Fetch all dashboard data
      const [data, comparison, trends] = await Promise.all([
        fetchDashboardData(userId, selectedDate),
        fetchMonthlyComparison(userId),
        fetchCategoryTrends(userId)
      ])

      setDashboardData(data)
      setMonthlyComparison(comparison)
      setCategoryTrends(trends)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [userId, selectedDate])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>No data available</p>
      </div>
    )
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR'
                }).format(dashboardData.currentMonthTotal)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.monthlyChange >= 0 ? '+' : ''}
                {dashboardData.monthlyChange.toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR'
                }).format(dashboardData.monthlySummary?.avgPerDay || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.monthlySummary?.expenseCount || 0} expenses this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Category Breakdown */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.categoryTotals}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {dashboardData.categoryTotals.map((entry, index) => (
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

          {/* Monthly Trend */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyComparison}>
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
              </div>
            </CardContent>
          </Card>

          {/* Daily Spending */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Daily Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.dailyTotals}>
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
                    <Line type="monotone" dataKey="total" stroke="#8884d8" />
                    <Line type="monotone" dataKey="avgAmount" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Trends */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Category Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    {Object.entries(categoryTrends).map(([category, data], index) => (
                      <Line
                        key={category}
                        type="monotone"
                        data={data}
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
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.recentExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {format(expense.date.toDate(), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{expense.name}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                      }).format(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AddExpenseDialog onSuccessfulSubmit={loadDashboardData} />
      </div>
    </AuthGuard>
  )
}

