import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"
import { fetchDashboardData } from "@/lib/dashboard-helpers"
import { format } from "date-fns"

interface RecentTransactionsProps {
  userId: string
  selectedDate: Date
}

function SkeletonTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function RecentTransactions({ userId, selectedDate }: RecentTransactionsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const dashboardData = await fetchDashboardData(userId, selectedDate)
        setTransactions(dashboardData.recentExpenses)
      } catch (error) {
        console.error('Error loading recent transactions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId, selectedDate])

  if (isLoading) {
    return <SkeletonTable />
  }

  return (
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
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(transaction.date.toDate(), 'dd MMM yyyy')}
                </TableCell>
                <TableCell>{transaction.category}</TableCell>
                <TableCell>{transaction.name}</TableCell>
                <TableCell>
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR'
                  }).format(transaction.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 