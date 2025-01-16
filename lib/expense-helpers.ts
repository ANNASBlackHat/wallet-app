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

  const db = getFirestore()
  // Add to expenses collection
  await addDoc(collection(db, `wallet/${userId}/expenses`), expenseData)

  // Update monthly summary
  await updateMonthlySummary(userId, expenseData)
} 