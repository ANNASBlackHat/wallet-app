'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AddExpenseDialog } from './add-expense-dialog'

export function AddExpenseFab() {
  return (
    <div className="fixed bottom-6 right-6">
      <AddExpenseDialog onSuccessfulSubmit={() => {
        // Optionally handle successful submission
      }} />   
    </div>
  )
} 