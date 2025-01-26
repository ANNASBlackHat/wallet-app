import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ChevronDown, Trash2, Loader2, Pencil } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

  console.log(`hasMoreItems: ${hasMoreItems}, itemsToShow: ${itemsToShow}, length: ${data.length}`)

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
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, itemsToShow).map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{formatDate(expense.date)}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>{expense.name}</TableCell>
                <TableCell className="text-right">
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
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(expense)}
                      disabled={deletingId === expense.id}
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
      </CardContent>
    </Card>
  )
} 