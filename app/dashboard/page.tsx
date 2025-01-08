'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedDateRangePicker } from '@/components/enhanced-date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, XAxis, YAxis, Bar, Sector, LineChart, Line } from 'recharts'
import { AddExpenseDialog } from '@/components/add-expense-dialog'
import { AuthGuard } from '@/components/auth-guard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Trash2, Loader2 } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ActiveShapeProps } from 'recharts/types/polar/Pie'
import { startOfMonth, endOfMonth } from 'date-fns'

interface Spending {
  Category: string
  Description: string
  Name: string
  Quantity: string | number
  Unit: string
  Total: number
}

interface SpendingDataBase {
  date_created: {
    seconds: number
    nanoseconds: number
  }
  date_created_millis: number
  spending: Spending[]
  summary?: string
}

interface SpendingData extends SpendingDataBase {
  docId: string
}

interface MonthlySpending {
  month: string;
  total: number;
}

interface DailySpending {
  day: number;
  currentMonth: number;
  previousMonth: number;
  currentMonthAvg: number;
  previousMonthAvg: number;
}

const ITEMS_PER_PAGE = 10;
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function DashboardPage() {
  const { user, userId, loading, signOut } = useAuth()
  const [spendingData, setSpendingData] = useState<SpendingData[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  }))
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()
  const [activeIndex, setActiveIndex] = useState(-1);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    try {
      const spendingRef = collection(db, `wallet/${userId}/spending`)
      const q = query(spendingRef, orderBy('date_created_millis', 'desc'))
      const querySnapshot = await getDocs(q)
      
      const data = querySnapshot.docs.map(docSnap => {
        const docData = docSnap.data() as SpendingDataBase
        return {
          docId: docSnap.id,
          ...docData,
          spending: Array.isArray(docData.spending) ? docData.spending : []
        }
      })

      setSpendingData(data)
    } catch (error) {
      console.error('Error fetching spending data:', error)
      setError('Failed to fetch spending data. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!loading && user) {
      fetchData()
    } else if (!loading && !user) {
      setIsLoading(false)
    }
  }, [user, loading, fetchData])

  const handleDelete = async (docId: string) => {
    if (!userId) return

    setDeletingId(docId)
    try {
      await deleteDoc(doc(db, `wallet/${userId}/spending`, docId))
      toast({
        title: 'Success',
        description: 'Expense deleted successfully'
      })
      fetchData()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete expense',
        variant: 'destructive'
      })
    } finally {
      setDeletingId(null)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  // Filter data based on selected category and date range
  const filteredData = spendingData.filter(data => {
    const dateInRange = dateRange ? 
      new Date(data.date_created_millis) >= dateRange.from &&
      new Date(data.date_created_millis) <= dateRange.to : true

    const categoryMatch = selectedCategory === 'all' ? true :
      data.spending.some(item => item.Category === selectedCategory)

    return dateInRange && categoryMatch
  })

  // Prepare data for category spending chart
  const categorySpending = filteredData
    .flatMap(data => data.spending)
    .reduce((acc, item) => {
      const category = item.Category
      acc[category] = (acc[category] || 0) + Number(item.Total)
      return acc
    }, {} as Record<string, number>)

  const categoryChartData = Object.entries(categorySpending).map(([name, value]) => ({
    name,
    value
  }))

  const totalSpending = filteredData
    .flatMap(data => data.spending)
    .reduce((sum, item) => sum + Number(item.Total), 0)

  const averageSpending = totalSpending / filteredData.length

  // Prepare monthly spending data (last 12 months)
  const getMonthlySpendingData = () => {
    const now = new Date()
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return {
        month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
        date: date,
        total: 0
      }
    }).reverse()

    // Calculate totals for each month
    spendingData.forEach(data => {
      const date = new Date(data.date_created_millis)
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' })
      const monthData = last12Months.find(m => m.month === monthKey)
      if (monthData) {
        monthData.total += data.spending.reduce((sum, item) => sum + Number(item.Total), 0)
      }
    })

    return last12Months
  }

  const monthlySpendingData = getMonthlySpendingData()

  // Pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Prepare daily spending data
  const getDailySpending = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

    // Initialize daily spending arrays
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPreviousMonth = new Date(previousYear, previousMonth + 1, 0).getDate()
    const dailySpending: DailySpending[] = Array.from({ length: Math.max(daysInCurrentMonth, daysInPreviousMonth) }, (_, i) => ({
      day: i + 1,
      currentMonth: 0,
      previousMonth: 0,
      currentMonthAvg: 0,
      previousMonthAvg: 0
    }))

    // Calculate daily totals
    spendingData.forEach(data => {
      const date = new Date(data.date_created_millis)
      const month = date.getMonth()
      const year = date.getFullYear()
      const day = date.getDate()

      const total = data.spending.reduce((sum, item) => sum + Number(item.Total), 0)

      if (month === currentMonth && year === currentYear) {
        dailySpending[day - 1].currentMonth += total
      } else if (month === previousMonth && year === previousYear) {
        if (day <= daysInPreviousMonth) {
          dailySpending[day - 1].previousMonth += total
        }
      }
    })

    // Calculate cumulative spending and averages
    let currentMonthCumulative = 0
    let previousMonthCumulative = 0
    const currentMonthData = dailySpending.slice(0, daysInCurrentMonth)
    const previousMonthData = dailySpending.slice(0, daysInPreviousMonth)

    // Calculate total for averages
    const currentMonthTotal = currentMonthData.reduce((sum, day) => sum + day.currentMonth, 0)
    const previousMonthTotal = previousMonthData.reduce((sum, day) => sum + day.previousMonth, 0)
    const currentMonthAvg = currentMonthTotal / daysInCurrentMonth
    const previousMonthAvg = previousMonthTotal / daysInPreviousMonth

    // Add cumulative spending and averages
    return dailySpending.slice(0, Math.max(daysInCurrentMonth, daysInPreviousMonth)).map(day => {
      currentMonthCumulative += day.currentMonth
      previousMonthCumulative += day.previousMonth
      return {
      ...day,
        currentMonth: currentMonthCumulative,
        previousMonth: previousMonthCumulative,
        currentMonthAvg: currentMonthAvg * day.day, // Trend line
        previousMonthAvg: previousMonthAvg * day.day // Trend line
      }
    })
  }

  const dailySpendingData = getDailySpending()

  return (
    <AuthGuard>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Wallet AI App</h1>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.photoURL || ''} alt={user?.email || ''} />
                    <AvatarFallback>
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.displayName || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-0 sm:flex sm:flex-col md:flex-row md:justify-between md:items-center">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <EnhancedDateRangePicker
              value={dateRange}
              onChange={(newRange) => {
                setDateRange(newRange ? { from: newRange.from!, to: newRange.to! } : undefined)
              }}
              components={{
                IconLeft: ({ ...props }: React.ComponentProps<"svg">) => <ChevronLeft className="h-4 w-4" {...props} />,
                IconRight: ({ ...props }: React.ComponentProps<"svg">) => <ChevronRight className="h-4 w-4" {...props} />,
              }}
            />
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Array.from(new Set(spendingData.flatMap(data => data.spending.map(item => item.Category)))).map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Spending Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Spending</p>
                  <p className="text-2xl font-bold">{totalSpending.toLocaleString()} IDR</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Spending</p>
                  <p className="text-2xl font-bold">{averageSpending.toLocaleString()} IDR</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    activeIndex={activeIndex}
                    activeShape={(props: ActiveShapeProps) => {
                      const RADIAN = Math.PI / 180;
                      const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
                      const sin = Math.sin(-RADIAN * midAngle);
                      const cos = Math.cos(-RADIAN * midAngle);
                      const mx = cx + (outerRadius + 30) * cos;
                      const my = cy + (outerRadius + 30) * sin;
                      const ex = mx + (cos >= 0 ? 1 : -1) * 22;
                      const ey = my;
                      const textAnchor = cos >= 0 ? 'start' : 'end';

                      return (
                        <g>
                          <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
                            {payload.name}
                          </text>
                          <Sector
                            cx={cx}
                            cy={cy}
                            innerRadius={innerRadius}
                            outerRadius={outerRadius}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            fill={fill}
                          />
                          <Sector
                            cx={cx}
                            cy={cy}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            innerRadius={outerRadius + 6}
                            outerRadius={outerRadius + 10}
                            fill={fill}
                          />
                          <path d={`M${cx},${cy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none"/>
                          <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none"/>
                          <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${(percent * 100).toFixed(1)}%`}</text>
                          <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
                            {`${new Intl.NumberFormat('id-ID', { 
                              style: 'currency', 
                              currency: 'IDR',
                              maximumFractionDigits: 0 
                            }).format(value)}`}
                          </text>
                        </g>
                      );
                    }}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(-1)}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        style={{
                          filter: `drop-shadow(0px 0px 4px ${COLORS[index % COLORS.length]}33)`
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => new Intl.NumberFormat('id-ID', { 
                      style: 'currency', 
                      currency: 'IDR',
                      maximumFractionDigits: 0 
                    }).format(Number(value))} 
                  />
                  <Legend 
                    formatter={(value, entry) => {
                      const total = categoryChartData.reduce((sum, item) => sum + item.value, 0);
                      const item = categoryChartData.find(item => item.name === value);
                      const percentage = ((item?.value || 0) / total * 100).toFixed(1);
                      return `${value} (${percentage}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle>Daily Spending Comparison (Cumulative)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySpendingData}>
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    formatter={(value) => `${Number(value).toLocaleString()} IDR`}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Legend />
                  <Line 
                    name="Current Month" 
                    type="monotone"
                    dataKey="currentMonth" 
                    stroke={COLORS[0]}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    name="Previous Month" 
                    type="monotone"
                    dataKey="previousMonth" 
                    stroke={COLORS[1]}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    name="Current Month Trend" 
                    type="monotone"
                    dataKey="currentMonthAvg" 
                    stroke={COLORS[0]}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line 
                    name="Previous Month Trend" 
                    type="monotone"
                    dataKey="previousMonthAvg" 
                    stroke={COLORS[1]}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Spending (Last 12 Months)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySpendingData}>
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString()} IDR`} />
                  <Bar dataKey="total" fill="#8884d8">
                    {monthlySpendingData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        style={{
                          filter: `drop-shadow(0px 0px 4px ${COLORS[index % COLORS.length]}33)`
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Spending Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Date</TableHead>
                  <TableHead className="w-[140px]">Category</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px]">Quantity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[140px] text-right">Amount</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.flatMap((data, index) => 
                  data.spending.map((item, itemIndex) => (
                    <TableRow 
                      key={`${index}-${itemIndex}`}
                      className="group hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        {new Date(data.date_created_millis).toLocaleDateString()} {new Date(data.date_created_millis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${item.Category.toLowerCase().includes('food') ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' : 
                          item.Category.toLowerCase().includes('transport') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                          item.Category.toLowerCase().includes('shopping') ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {item.Category}
                        </span>
                      </TableCell>
                      <TableCell>{item.Name}</TableCell>
                      <TableCell>{item.Quantity}{item.Unit}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{item.Description}</TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('id-ID', { 
                          style: 'currency', 
                          currency: 'IDR',
                          maximumFractionDigits: 0 
                        }).format(Number(item.Total))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(data.docId)}
                          disabled={deletingId === data.docId}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {deletingId === data.docId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex justify-center mt-4 space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <AddExpenseDialog onSuccessfulSubmit={fetchData} />
      </div>
    </AuthGuard>
  )
}

