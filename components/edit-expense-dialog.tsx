'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/components/ui/use-toast'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { updateExpense, getUserCategories, addCategoryToCache } from '@/lib/expense-helpers'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Timestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { Calendar } from "@/components/ui/calendar"

interface EditExpenseDialogProps {
  expense: {
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
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccessfulEdit?: () => void
}

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Name is required"),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  total: z.string().min(1, "Amount is required"),
  description: z.string().optional(),
  date: z.date()
})

export function EditExpenseDialog({ expense, open, onOpenChange, onSuccessfulEdit }: EditExpenseDialogProps) {
  const { userId } = useAuth()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [categoryComboboxOpen, setCategoryComboboxOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(expense.category)
  const [customCategory, setCustomCategory] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: expense.category,
      name: expense.name,
      quantity: expense.quantity.toString(),
      unit: expense.unit,
      total: expense.amount.toString(),
      description: expense.description,
      date: expense.date.toDate()
    },
  })

  // Load categories when dialog opens
  useEffect(() => {
    async function loadCategories() {
      if (!userId || !open) return
      
      setIsLoadingCategories(true)
      try {
        const userCategories = await getUserCategories(userId)
        setCategories(userCategories)
      } catch (error) {
        console.error('Failed to load categories:', error)
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive"
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()
  }, [userId, open, toast])

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userId) return
    
    setIsProcessing(true)
    try {
      const newDate = values.date
      const newYearMonth = format(newDate, 'yyyy-MM')
      
      await updateExpense(userId, expense.id, {
        ...expense,
        category: customCategory || selectedCategory,
        name: values.name,
        quantity: Number(values.quantity) || 1,
        unit: values.unit || "unit",
        amount: Number(values.total),
        description: values.description || "",
        date: Timestamp.fromDate(newDate),
        yearMonth: newYearMonth,
        day: newDate.getDate(),
        oldYearMonth: expense.yearMonth
      })

      // If it's a new category, add it to cache
      if (customCategory && !categories.includes(customCategory)) {
        addCategoryToCache(userId, customCategory)
        setCategories(prev => [...prev, customCategory])
      }

      toast({
        title: "Success",
        description: "Expense updated successfully"
      })

      onSuccessfulEdit?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating expense:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update expense",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const categorySelect = (
    <div className="grid w-full gap-1.5">
      <Label htmlFor="category">Category</Label>
      <Popover open={categoryComboboxOpen} onOpenChange={setCategoryComboboxOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={categoryComboboxOpen}
            className="justify-between"
          >
            {isLoadingCategories ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : customCategory || selectedCategory || "Select or type category..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput 
              placeholder="Search or add category..." 
              value={customCategory}
              onValueChange={(value) => {
                setCustomCategory(value)
                setSelectedCategory("")
              }}
            />
            <CommandEmpty>
              {customCategory ? `Press enter to add "${customCategory}"` : "No category found."}
            </CommandEmpty>
            {categories.length > 0 && (
              <CommandGroup>
                {categories.map((category) => (
                  <CommandItem
                    key={category}
                    value={category}
                    onSelect={(value) => {
                      setSelectedCategory(value)
                      setCustomCategory("")
                      setCategoryComboboxOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCategory === category ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>
            Update your expense details. Changes will be reflected in monthly summaries.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {categorySelect}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Pizza" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., pcs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (IDR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="25000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date)
                          setCalendarOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Expense'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 