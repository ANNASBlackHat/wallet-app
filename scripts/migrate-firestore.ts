import {
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  orderBy,
  Timestamp,
  getFirestore,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Types for old data structure
interface OldSpending {
  Category: string
  Description: string
  Name: string
  Quantity: string | number
  Unit: string
  Total: number
}

interface OldSpendingDoc {
  date_created: {
    seconds: number
    nanoseconds: number
  }
  date_created_millis: number
  spending: OldSpending[]
  docId?: string
}

// Types for new data structure
interface NewExpense {
  category: string
  name: string
  quantity: number
  unit: string
  amount: number
  description: string
  date: Timestamp
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

async function migrateUserData(userId: string) {
  console.log(`Starting migration for user: ${userId}`)
  const db = getFirestore()
  
  try {
    // 1. Fetch all old spending documents
    const spendingRef = collection(db, `wallet/${userId}/spending`)
    const q = query(spendingRef, orderBy('date_created_millis', 'desc'))
    const querySnapshot = await getDocs(q)
    
    console.log(`Found ${querySnapshot.size} documents to migrate`)
    
    // Process in batches of 500 (Firestore limit)
    const BATCH_SIZE = 500
    let currentBatch = writeBatch(db)
    let operationCount = 0
    let totalExpenses = 0
    
    // Track monthly summaries
    const monthlySummaries: { [key: string]: MonthlySummary } = {}

    for (const docSnapshot of querySnapshot.docs) {
      const oldData = docSnapshot.data() as OldSpendingDoc
      oldData.docId = docSnapshot.id

      // Process each spending item in the array
      for (const spendingItem of oldData.spending) {
        const date = new Date(oldData.date_created_millis)
        const yearMonth = date.toISOString().slice(0, 7) // YYYY-MM format
        
        // Create new expense document
        const newExpense: NewExpense = {
          category: spendingItem.Category,
          name: spendingItem.Name,
          quantity: Number(spendingItem.Quantity) || 1,
          unit: spendingItem.Unit || 'unit',
          amount: spendingItem.Total,
          description: spendingItem.Description || '',
          date: Timestamp.fromMillis(oldData.date_created_millis),
          yearMonth,
          day: date.getDate()
        }

        // Update monthly summaries
        if (!monthlySummaries[yearMonth]) {
          monthlySummaries[yearMonth] = {
            totalAmount: 0,
            categoryBreakdown: {},
            expenseCount: 0,
            avgPerDay: 0
          }
        }
        
        const summary = monthlySummaries[yearMonth]
        summary.totalAmount += newExpense.amount
        summary.categoryBreakdown[newExpense.category] = 
          (summary.categoryBreakdown[newExpense.category] || 0) + newExpense.amount
        summary.expenseCount++

        // Create new expense document under wallet/[id]/expenses
        const newExpenseRef = doc(collection(db, `wallet/${userId}/expenses`))
        currentBatch.set(newExpenseRef, newExpense)
        
        operationCount++
        totalExpenses++

        // Commit batch if we reach the limit
        if (operationCount >= BATCH_SIZE) {
          console.log(`Committing batch of ${operationCount} operations`)
          await currentBatch.commit()
          currentBatch = writeBatch(db)
          operationCount = 0
        }
      }
    }

    // Commit any remaining expense documents
    if (operationCount > 0) {
      console.log(`Committing final batch of ${operationCount} operations`)
      await currentBatch.commit()
    }

    // Create new batch for monthly summaries
    currentBatch = writeBatch(db)
    operationCount = 0

    // Write monthly summaries
    for (const [yearMonth, summary] of Object.entries(monthlySummaries)) {
      // Fix the date parsing issue
      const year = parseInt(yearMonth.slice(0, 4))
      const month = parseInt(yearMonth.slice(5, 7))
      const daysInMonth = new Date(year, month, 0).getDate()
      
      summary.avgPerDay = summary.totalAmount / daysInMonth
      
      // Update path to keep under wallet/[id]/summaries
      const summaryRef = doc(db, `wallet/${userId}/summaries/${yearMonth}`)
      currentBatch.set(summaryRef, summary)
      
      operationCount++
      
      if (operationCount >= BATCH_SIZE) {
        await currentBatch.commit()
        currentBatch = writeBatch(db)
        operationCount = 0
      }
    }

    // Commit any remaining summaries
    if (operationCount > 0) {
      await currentBatch.commit()
    }

    console.log(`Migration completed successfully:`)
    console.log(`- Total expenses migrated: ${totalExpenses}`)
    console.log(`- Monthly summaries created: ${Object.keys(monthlySummaries).length}`)
    
    return {
      success: true,
      totalExpenses,
      monthlySummaries: Object.keys(monthlySummaries).length
    }

  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

// Export the migration function
export { migrateUserData } 