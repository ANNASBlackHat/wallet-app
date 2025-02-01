import { useState } from 'react'
import { ChartCard } from "@/components/dashboard/chart-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ChevronDown, Trash2, Loader2, Pencil, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { deleteExpense } from "@/lib/expense-helpers"
import { useAuth } from "@/contexts/auth-context"
import { Timestamp } from 'firebase/firestore'
import { EditExpenseDialog } from '@/components/edit-expense-dialog'

interface Expense {
  id: string
  category: string
  name: string
  amount: number
  date: Timestamp
  yearMonth: string
  quantity: number
  unit: string
  description: string
  day: number
}

interface RecentTransactionsProps {
  data: Expense[]
  onDelete?: () => void
  onEdit?: () => void
}

const INITIAL_ITEMS_TO_SHOW = 5
const ITEMS_PER_LOAD = 5

export function RecentTransactions({ data, onDelete, onEdit }: RecentTransactionsProps) {
  const [itemsToShow, setItemsToShow] = useState(INITIAL_ITEMS_TO_SHOW)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()
  const { userId } = useAuth()
  
  const hasMoreItems = itemsToShow < data.length

  const handleShowMore = () => {
    setItemsToShow(prev => Math.min(prev + ITEMS_PER_LOAD, data.length))
  }

  const handleDeleteClick = (expense: Expense) => {
    setSelectedExpense(expense)
    setIsDeleteDialogOpen(true)
  }

  const handleEditClick = (expense: Expense) => {
    setSelectedExpense(expense)
    setIsEditDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedExpense || !userId) return

    setDeletingId(selectedExpense.id)
    try {
      await deleteExpense(userId, selectedExpense.id, selectedExpense)
      toast({
        title: "Expense deleted",
        description: "The expense has been successfully deleted.",
      })
      onDelete?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete expense",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
      setIsDeleteDialogOpen(false)
      setSelectedExpense(null)
    }
  }

  const formatDate = (date: Timestamp) => {
    const dateObj = date.toDate()
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (format(dateObj, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return `Today, ${format(dateObj, 'HH:mm')}`
    } else if (format(dateObj, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return `Yesterday, ${format(dateObj, 'HH:mm')}`
    } else {
      return format(dateObj, 'dd MMM, HH:mm')
    }
  }

  const handleExport = () => {
    try {
      // Define CSV headers
      const headers = ['Date', 'Category', 'Name', 'Quantity', 'Unit', 'Amount', 'Description']
      
      // Convert data to CSV format
      const csvData = data.map(expense => [
        format(expense.date.toDate(), 'yyyy-MM-dd HH:mm:ss'),
        expense.category,
        expense.name,
        expense.quantity,
        expense.unit,
        expense.amount,
        expense.description
      ])

      // Add headers to the beginning
      csvData.unshift(headers)

      // Convert to CSV string
      const csvString = csvData.map(row => row.map(cell => {
        // Handle cells that might contain commas or quotes
        if (cell && typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`
        }
        return cell
      }).join(',')).join('\n')

      // Create blob and download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Your expenses have been exported successfully.",
      })
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        title: "Error",
        description: "Failed to export expenses. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <ChartCard 
      title="Recent Transactions"
      description="Your latest expenses and transactions"
      collapsible
      fullHeight
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="hidden sm:flex"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      }
    >
      {/* Mobile export button */}
      <div className="mb-4 sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Transactions
        </Button>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[100px]">Category</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right w-[120px]">Amount</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, itemsToShow).map(expense => (
              <TableRow key={expense.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDate(expense.date)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {expense.category}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {expense.name}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR'
                  }).format(expense.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(expense)}
                      disabled={deletingId === expense.id}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(expense)}
                      disabled={deletingId === expense.id}
                      className="h-8 w-8"
                    >
                      {deletingId === expense.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!selectedExpense || !!deletingId}
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {selectedExpense && (
        <EditExpenseDialog
          expense={selectedExpense}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccessfulEdit={() => {
            onEdit?.()
            setSelectedExpense(null)
          }}
        />
      )}
    </ChartCard>
  )
} 