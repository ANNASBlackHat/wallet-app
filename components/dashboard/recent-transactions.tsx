import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ChevronDown } from "lucide-react"

interface Expense {
  category: string
  name: string
  amount: number
  date: {
    toDate: () => Date
  }
}

interface RecentTransactionsProps {
  data: Expense[]
}

const INITIAL_ITEMS_TO_SHOW = 5
const ITEMS_PER_LOAD = 5

export function RecentTransactions({ data }: RecentTransactionsProps) {
  const [itemsToShow, setItemsToShow] = useState(INITIAL_ITEMS_TO_SHOW)
  const hasMoreItems = itemsToShow < data.length

  const handleShowMore = () => {
    setItemsToShow(prev => Math.min(prev + ITEMS_PER_LOAD, data.length))
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
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, itemsToShow).map((expense, index) => (
              <TableRow key={index}>
                <TableCell>{format(expense.date.toDate(), 'dd MMM yyyy')}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>{expense.name}</TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR'
                  }).format(expense.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {hasMoreItems && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={handleShowMore}
              className="w-full sm:w-auto"
            >
              <ChevronDown className="mr-2 h-4 w-4" />
              Show More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 