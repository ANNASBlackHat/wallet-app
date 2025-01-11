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
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from 'date-fns'

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

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

export async function fetchDashboardData(
  userId: string,
  selectedDate: Date = new Date()
): Promise<DashboardData> {
  const db = getFirestore()
  
  // Get the start and end of the selected day
  const dayStart = startOfDay(selectedDate)
  const dayEnd = endOfDay(selectedDate)
  
  // Get the month for monthly comparisons
  const currentMonth = format(selectedDate, 'yyyy-MM')
  const previousMonth = format(subMonths(selectedDate, 1), 'yyyy-MM')

  // 1. Get current month's summary for reference
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

  // 3. Get expenses for the selected day
  const expensesRef = collection(db, `wallet/${userId}/expenses`)
  const dayExpensesQuery = query(
    expensesRef,
    where('date', '>=', Timestamp.fromDate(dayStart)),
    where('date', '<=', Timestamp.fromDate(dayEnd)),
    orderBy('date', 'asc')
  )
  
  const dayExpensesSnapshot = await getDocs(dayExpensesQuery)
  
  // Calculate total spending for the selected day
  let dayTotalAmount = 0
  let dayExpenseCount = 0
  const dayCategoryBreakdown: { [key: string]: number } = {}
  
  dayExpensesSnapshot.forEach(doc => {
    const expense = doc.data() as Expense
    dayTotalAmount += expense.amount
    dayExpenseCount++

    console.log('category', expense.category);
    
    // Handle category name
    const categoryName = expense.category?.trim() || 'Uncategorized'
    dayCategoryBreakdown[categoryName] = (dayCategoryBreakdown[categoryName] || 0) + expense.amount
  })

  // Round the totals
  dayTotalAmount = roundToTwo(dayTotalAmount)
  Object.keys(dayCategoryBreakdown).forEach(category => {
    dayCategoryBreakdown[category] = roundToTwo(dayCategoryBreakdown[category])
  })

  // Calculate category totals for the selected day
  const categoryTotals: CategoryTotal[] = Object.entries(dayCategoryBreakdown)
    .map(([category, total]) => ({
      category: category === '' ? 'Uncategorized' : category,
      total: roundToTwo(total),
      percentage: dayTotalAmount > 0 ? roundToTwo((total / dayTotalAmount) * 100) : 0
    }))
    .filter(cat => cat.total > 0) // Only show categories with spending
    .sort((a, b) => b.total - a.total)

  // Get daily totals for the current month (for the chart)
  const monthExpensesQuery = query(
    expensesRef,
    where('yearMonth', '==', currentMonth),
    orderBy('date', 'asc')
  )
  
  const monthExpensesSnapshot = await getDocs(monthExpensesQuery)
  
  // Calculate the number of days in the current month
  const daysInMonth = endOfMonth(selectedDate).getDate()
  
  // Process daily totals
  const dailyTotalsMap = new Map<number, { total: number, count: number }>()
  
  // Initialize all days with zero
  for (let day = 1; day <= daysInMonth; day++) {
    dailyTotalsMap.set(day, { total: 0, count: 0 })
  }
  
  // Add actual expenses
  monthExpensesSnapshot.forEach(doc => {
    const expense = doc.data() as Expense
    const day = expense.day
    const current = dailyTotalsMap.get(day) || { total: 0, count: 0 }
    dailyTotalsMap.set(day, {
      total: roundToTwo(current.total + expense.amount),
      count: current.count + 1
    })
  })

  const dailyTotals: DailyTotal[] = Array.from(dailyTotalsMap.entries())
    .map(([day, data]) => ({
      day,
      total: roundToTwo(data.total),
      // Calculate average per transaction for each day
      avgAmount: data.count > 0 ? roundToTwo(data.total / data.count) : 0
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
    ...doc.data(),
    amount: roundToTwo((doc.data() as Expense).amount)
  } as Expense & { id: string }))

  // 6. Calculate month-over-month change
  const previousDayTotal = previousMonthSummary?.avgPerDay || 0
  const monthlyChange = previousDayTotal > 0
    ? roundToTwo(((dayTotalAmount - previousDayTotal) / previousDayTotal) * 100)
    : 0

  return {
    currentMonthTotal: dayTotalAmount,
    previousMonthTotal: previousDayTotal,
    monthlyChange,
    categoryTotals,
    dailyTotals,
    recentExpenses,
    monthlySummary: currentMonthSummary ? {
      ...currentMonthSummary,
      totalAmount: roundToTwo(currentMonthSummary.totalAmount),
      avgPerDay: roundToTwo(currentMonthSummary.avgPerDay),
      categoryBreakdown: Object.fromEntries(
        Object.entries(currentMonthSummary.categoryBreakdown)
          .map(([k, v]) => [k, roundToTwo(v)])
      )
    } : null
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