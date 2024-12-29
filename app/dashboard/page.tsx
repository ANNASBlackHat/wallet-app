'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedDateRangePicker } from '@/components/enhanced-date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, XAxis, YAxis, Bar } from 'recharts'
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

interface Spending {
  Category: string
  Description: string
  Name: string
  Quantity: string | number
  Unit: string
  Total: number
}

interface SpendingData {
  docId: string
  date_created: {
    seconds: number
    nanoseconds: number
  }
  date_created_millis: number
  spending: Spending[]
  summary?: string
}

interface MonthlySpending {
  month: string;
  total: number;
}

const ITEMS_PER_PAGE = 10;
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function DashboardPage() {
  const { user, userId, loading, signOut } = useAuth()
  const [spendingData, setSpendingData] = useState<SpendingData[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    try {
      const spendingRef = collection(db, `wallet/${userId}/spending`)
      const q = query(spendingRef, orderBy('date_created_millis', 'desc'))
      const querySnapshot = await getDocs(q)
      
      const data = querySnapshot.docs.map(docSnap => ({
        docId: docSnap.id,
        ...docSnap.data() as SpendingData,
        spending: Array.isArray(docSnap.data().spending) ? docSnap.data().spending : []
      }))

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

  // Prepare monthly spending data
  const monthlySpending = filteredData
    .flatMap(data => ({
      date: new Date(data.date_created_millis),
      spending: data.spending.reduce((sum, item) => sum + Number(item.Total), 0)
    }))
    .reduce((acc, { date, spending }) => {
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' })
      acc[monthKey] = (acc[monthKey] || 0) + spending
      return acc
    }, {} as Record<string, number>)

  const monthlySpendingData: MonthlySpending[] = Object.entries(monthlySpending)
    .map(([month, total]) => ({
      month,
      total
    }))
    .sort((a, b) => {
      const [monthA, yearA] = a.month.split(' ')
      const [monthB, yearB] = b.month.split(' ')
      const dateA = new Date(`${monthA} 20${yearA}`)
      const dateB = new Date(`${monthB} 20${yearB}`)
      return dateA.getTime() - dateB.getTime()
    })

  // Pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <AuthGuard>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Wallet AI App</h1>
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

        <div className="space-y-4 sm:space-y-0 sm:flex sm:flex-col md:flex-row md:justify-between md:items-center">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <EnhancedDateRangePicker
              value={dateRange}
              onChange={(newRange) => {
                setDateRange(newRange ? { from: newRange.from!, to: newRange.to! } : undefined)
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
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString()} IDR`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Spending</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySpendingData}>
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString()} IDR`} />
                  <Bar dataKey="total" fill="#8884d8">
                    {monthlySpendingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.flatMap((data, index) => 
                  data.spending.map((item, itemIndex) => (
                    <TableRow key={`${index}-${itemIndex}`}>
                      <TableCell>{new Date(data.date_created_millis).toLocaleDateString()}</TableCell>
                      <TableCell>{item.Category}</TableCell>
                      <TableCell>{item.Name}</TableCell>
                      <TableCell>{item.Quantity}{item.Unit}</TableCell>
                      <TableCell>{item.Description}</TableCell>
                      <TableCell>{Number(item.Total).toLocaleString()} IDR</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(data.docId)}
                          disabled={deletingId === data.docId}
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

