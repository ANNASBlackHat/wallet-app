import {
  collection,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  Timestamp,
  DocumentReference,
  getFirestore,
  updateDoc
} from 'firebase/firestore'

interface Expense {
  category: string
  name: string
  quantity: number
  unit: string
  amount: number
  description: string
  date: Date | Timestamp
  yearMonth: string
  day: number
}

interface CategorySummary {
  [category: string]: number
}

interface MonthlySummary {
  totalAmount: number
  categoryBreakdown: CategorySummary
  expenseCount: number
  avgPerDay: number
}

export async function updateMonthlySummary(
  userId: string,
  expense: Expense
): Promise<void> {
  const db = getFirestore()
  const yearMonth = expense.yearMonth
  const summaryRef = doc(db, `wallet/${userId}/summaries/${yearMonth}`)

  try {
    const summaryDoc = await getDoc(summaryRef)
    const daysInMonth = new Date(
      parseInt(yearMonth.slice(0, 4)),
      parseInt(yearMonth.slice(5, 7)),
      0
    ).getDate()

    if (!summaryDoc.exists()) {
      // Create new summary if it doesn't exist
      const newSummary: MonthlySummary = {
        totalAmount: expense.amount,
        categoryBreakdown: {
          [expense.category]: expense.amount
        },
        expenseCount: 1,
        avgPerDay: expense.amount / daysInMonth
      }

      await setDoc(summaryRef, newSummary)
    } else {
      // Update existing summary
      const currentSummary = summaryDoc.data() as MonthlySummary
      
      // Create the update object
      const updates = {
        totalAmount: currentSummary.totalAmount + expense.amount,
        [`categoryBreakdown.${expense.category}`]: (currentSummary.categoryBreakdown[expense.category] || 0) + expense.amount,
        expenseCount: currentSummary.expenseCount + 1,
        avgPerDay: (currentSummary.totalAmount + expense.amount) / daysInMonth
      }

      await updateDoc(summaryRef, updates)
    }
  } catch (error) {
    console.error('Error updating monthly summary:', error)
    throw error
  }
} 