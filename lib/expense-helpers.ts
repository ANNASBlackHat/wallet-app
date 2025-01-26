import {
  collection,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  Timestamp,
  DocumentReference,
  getFirestore,
  updateDoc,
  getDocs,
  addDoc
} from 'firebase/firestore'
import { addPendingExpense, getPendingExpenses, updateExpenseStatus, deletePendingExpense } from './offline-storage'

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

// Cache interface
interface CategoryCache {
  categories: Set<string>
  lastFetched: number
  userId: string
}

// Global cache object
let categoryCache: CategoryCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to check online status
function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

export async function getUserCategories(userId: string): Promise<string[]> {
  console.log('🔍 Fetching user categories for:', userId)
  
  // Check cache first
  if (categoryCache && 
      categoryCache.userId === userId && 
      Date.now() - categoryCache.lastFetched < CACHE_DURATION) {
    console.log('✨ Returning cached categories')
    return Array.from(categoryCache.categories)
  }

  const db = getFirestore()
  const categories = new Set<string>()

  try {
    // First, check monthly summaries for categories
    const summariesRef = collection(db, `wallet/${userId}/summaries`)
    const summariesSnapshot = await getDocs(summariesRef)
    
    console.log('📊 Processing monthly summaries...')
    summariesSnapshot.forEach(doc => {
      const summary = doc.data() as MonthlySummary
      if (summary.categoryBreakdown) {
        Object.keys(summary.categoryBreakdown).forEach(category => {
          categories.add(category)
        })
      }
    })

    // Update cache
    categoryCache = {
      categories,
      lastFetched: Date.now(),
      userId
    }

    console.log('✅ Categories fetched successfully:', Array.from(categories))
    return Array.from(categories)
  } catch (error) {
    console.error('❌ Error fetching categories:', error)
    // Return default categories if fetch fails
    return ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Others']
  }
}

// Function to add a new category to cache
export function addCategoryToCache(userId: string, category: string): void {
  if (categoryCache && categoryCache.userId === userId) {
    categoryCache.categories.add(category)
  }
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

interface ManualExpenseInput {
  userId: string
  category: string
  name: string
  quantity?: string
  unit?: string
  total: string
  description?: string
}

export async function handleManualSubmit({
  userId,
  category,
  name,
  quantity,
  unit,
  total,
  description
}: ManualExpenseInput): Promise<void> {
  if (!userId) throw new Error('User ID is required')
  if (!category || !name || !total) {
    throw new Error('Category, name and total amount are required')
  }

  const now = new Date()
  const yearMonth = now.toISOString().slice(0, 7) // YYYY-MM format

  // Create new expense document
  const expenseData: Expense = {
    category,
    name,
    quantity: Number(quantity) || 1,
    unit: unit || "unit",
    amount: parseFloat(total),
    description: description || "",
    date: now,
    yearMonth,
    day: now.getDate()
  }

  // Check if we're online
  if (isOnline()) {
    try {
      const db = getFirestore()
      // Add to expenses collection
      await addDoc(collection(db, `wallet/${userId}/expenses`), expenseData)
      // Update monthly summary
      await updateMonthlySummary(userId, expenseData)
    } catch (error) {
      console.error('Error adding expense online:', error)
      // If online submission fails, store offline
      await addPendingExpense({
        ...expenseData,
        userId,
        date: expenseData.date instanceof Date ? expenseData.date : new Date(expenseData.date.toMillis())
      })
      throw new Error('Failed to add expense online, saved offline')
    }
  } else {
    // Store offline
    await addPendingExpense({
      ...expenseData,
      userId,
      date: expenseData.date instanceof Date ? expenseData.date : new Date(expenseData.date.toMillis())
    })
  }
}

// Function to sync pending expenses
export async function syncPendingExpenses(userId: string): Promise<void> {
  if (!isOnline()) return;

  const pendingExpenses = await getPendingExpenses(userId);
  
  for (const expense of pendingExpenses) {
    if (expense.status === 'pending') {
      try {
        await updateExpenseStatus(expense.id!, 'syncing');
        
        const db = getFirestore();
        await addDoc(collection(db, `wallet/${userId}/expenses`), {
          category: expense.category,
          name: expense.name,
          quantity: expense.quantity,
          unit: expense.unit,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
          yearMonth: expense.yearMonth,
          day: expense.day
        });

        await updateMonthlySummary(userId, expense);
        await deletePendingExpense(expense.id!);
      } catch (error) {
        console.error('Error syncing expense:', error);
        await updateExpenseStatus(expense.id!, 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }
}

export async function deleteExpense(userId: string, expenseId: string, expense: Expense): Promise<void> {
  if (!userId) throw new Error('User ID is required')
  if (!expenseId) throw new Error('Expense ID is required')

  // Check if we're online
  if (isOnline()) {
    try {
      const db = getFirestore()
      
      // Start a transaction to ensure data consistency
      await runTransaction(db, async (transaction) => {
        // 1. First, get all necessary documents (READ operations)
        const expenseRef = doc(db, `wallet/${userId}/expenses/${expenseId}`)
        const summaryRef = doc(db, `wallet/${userId}/summaries/${expense.yearMonth}`)
        
        // Read the monthly summary first
        const summaryDoc = await transaction.get(summaryRef)
        
        if (!summaryDoc.exists()) {
          throw new Error('Monthly summary not found')
        }

        // 2. Then perform all write operations
        const currentSummary = summaryDoc.data() as MonthlySummary
        const daysInMonth = new Date(
          parseInt(expense.yearMonth.slice(0, 4)),
          parseInt(expense.yearMonth.slice(5, 7)),
          0
        ).getDate()

        // Calculate new values
        const newTotalAmount = currentSummary.totalAmount - expense.amount
        const newCategoryAmount = (currentSummary.categoryBreakdown[expense.category] || 0) - expense.amount
        
        // Create update object
        const updates: Partial<MonthlySummary> = {
          totalAmount: newTotalAmount,
          expenseCount: currentSummary.expenseCount - 1,
          avgPerDay: newTotalAmount / daysInMonth,
        }

        // If category amount becomes 0, remove the category, otherwise update it
        if (newCategoryAmount <= 0) {
          // Create a new categoryBreakdown without the deleted category
          const newCategoryBreakdown = { ...currentSummary.categoryBreakdown }
          delete newCategoryBreakdown[expense.category]
          updates.categoryBreakdown = newCategoryBreakdown
        } else {
          updates.categoryBreakdown = {
            ...currentSummary.categoryBreakdown,
            [expense.category]: newCategoryAmount
          }
        }

        // Perform all writes after all reads
        transaction.delete(expenseRef)
        transaction.update(summaryRef, updates)
      })

    } catch (error) {
      console.error('Error deleting expense:', error)
      throw error
    }
  } else {
    throw new Error('Cannot delete expenses while offline')
  }
} 