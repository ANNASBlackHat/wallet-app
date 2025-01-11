import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  Timestamp,
  startAt,
  endAt,
  QuerySnapshot,
  DocumentData,
  getFirestore
} from 'firebase/firestore'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

interface Expense {
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

interface CategoryTotal {
  category: string
  total: number
  percentage: number
}

interface DailyTotal {
  day: number
  total: number
  avgAmount: number
}

interface MonthlySummary {
  totalAmount: number
  categoryBreakdown: { [key: string]: number }
  expenseCount: number
  avgPerDay: number
}

export interface DashboardData {
  currentMonthTotal: number
  previousMonthTotal: number
  monthlyChange: number
  categoryTotals: CategoryTotal[]
  dailyTotals: DailyTotal[]
  recentExpenses: Expense[]
  monthlySummary: MonthlySummary | null
}

export async function fetchDashboardData(
  userId: string,
  selectedDate: Date = new Date()
): Promise<DashboardData> {
  const db = getFirestore()
  const currentMonth = format(selectedDate, 'yyyy-MM')
  const previousMonth = format(subMonths(selectedDate, 1), 'yyyy-MM')

  // 1. Get current month's summary
  const currentMonthSummaryRef = doc(db, `wallet/${userId}/summaries/${currentMonth}`)
  const currentMonthSummaryDoc = await getDoc(currentMonthSummaryRef)
  const currentMonthSummary = currentMonthSummaryDoc.exists() 
    ? currentMonthSummaryDoc.data() as MonthlySummary 
    : null

  // 2. Get previous month's summary for comparison
  const previousMonthSummaryRef = doc(db, `wallet/${userId}/summaries/${previousMonth}`)
  const previousMonthSummaryDoc = await getDoc(previousMonthSummaryRef)
  const previousMonthSummary = previousMonthSummaryDoc.exists() 
    ? previousMonthSummaryDoc.data() as MonthlySummary 
    : null

  // 3. Get daily totals for the current month
  const start = startOfMonth(selectedDate)
  const end = endOfMonth(selectedDate)
  
  const expensesRef = collection(db, `wallet/${userId}/expenses`)
  const expensesQuery = query(
    expensesRef,
    where('yearMonth', '==', currentMonth),
    orderBy('date', 'asc')
  )
  
  const expensesSnapshot = await getDocs(expensesQuery)
  
  // Process daily totals
  const dailyTotalsMap = new Map<number, { total: number, count: number }>()
  expensesSnapshot.forEach(doc => {
    const expense = doc.data() as Expense
    const day = expense.day
    const current = dailyTotalsMap.get(day) || { total: 0, count: 0 }
    dailyTotalsMap.set(day, {
      total: current.total + expense.amount,
      count: current.count + 1
    })
  })

  const dailyTotals: DailyTotal[] = Array.from(dailyTotalsMap.entries())
    .map(([day, data]) => ({
      day,
      total: data.total,
      avgAmount: data.total / data.count
    }))
    .sort((a, b) => a.day - b.day)

  // 4. Get recent expenses
  const recentExpensesQuery = query(
    expensesRef,
    orderBy('date', 'desc'),
    limit(10)
  )
  const recentExpensesSnapshot = await getDocs(recentExpensesQuery)
  const recentExpenses = recentExpensesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Expense & { id: string }))

  // 5. Calculate category totals and percentages
  const categoryTotals: CategoryTotal[] = currentMonthSummary
    ? Object.entries(currentMonthSummary.categoryBreakdown).map(([category, total]) => ({
        category,
        total,
        percentage: (total / currentMonthSummary.totalAmount) * 100
      }))
    : []

  // 6. Calculate month-over-month change
  const currentMonthTotal = currentMonthSummary?.totalAmount || 0
  const previousMonthTotal = previousMonthSummary?.totalAmount || 0
  const monthlyChange = previousMonthTotal 
    ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 
    : 0

  return {
    currentMonthTotal,
    previousMonthTotal,
    monthlyChange,
    categoryTotals,
    dailyTotals,
    recentExpenses,
    monthlySummary: currentMonthSummary
  }
}

export async function fetchMonthlyComparison(
  userId: string,
  months: number = 6
): Promise<{ month: string; total: number }[]> {
  const db = getFirestore()
  const result: { month: string; total: number }[] = []
  
  const currentDate = new Date()
  
  for (let i = 0; i < months; i++) {
    const date = subMonths(currentDate, i)
    const yearMonth = format(date, 'yyyy-MM')
    const summaryRef = doc(db, `wallet/${userId}/summaries/${yearMonth}`)
    const summaryDoc = await getDoc(summaryRef)
    
    if (summaryDoc.exists()) {
      const data = summaryDoc.data() as MonthlySummary
      result.push({
        month: format(date, 'MMM yyyy'),
        total: data.totalAmount
      })
    } else {
      result.push({
        month: format(date, 'MMM yyyy'),
        total: 0
      })
    }
  }
  
  return result.reverse()
}

export async function fetchCategoryTrends(
  userId: string,
  months: number = 3
): Promise<{ [category: string]: { month: string; amount: number }[] }> {
  const db = getFirestore()
  const trends: { [category: string]: { month: string; amount: number }[] } = {}
  
  const currentDate = new Date()
  
  for (let i = 0; i < months; i++) {
    const date = subMonths(currentDate, i)
    const yearMonth = format(date, 'yyyy-MM')
    const summaryRef = doc(db, `wallet/${userId}/summaries/${yearMonth}`)
    const summaryDoc = await getDoc(summaryRef)
    
    if (summaryDoc.exists()) {
      const data = summaryDoc.data() as MonthlySummary
      Object.entries(data.categoryBreakdown).forEach(([category, amount]) => {
        if (!trends[category]) {
          trends[category] = []
        }
        trends[category].push({
          month: format(date, 'MMM yyyy'),
          amount
        })
      })
    }
  }
  
  // Fill in missing months with zero amounts
  Object.keys(trends).forEach(category => {
    trends[category] = trends[category]
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  })
  
  return trends
} 