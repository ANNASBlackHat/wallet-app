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
  id: string
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

interface DateRange {
  from: Date
  to: Date
}

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

export async function fetchDashboardData(
  userId: string,
  dateRange: DateRange
): Promise<DashboardData> {
  const db = getFirestore()
  
  // Get the start and end of the selected range
  const rangeStart = startOfDay(dateRange.from)
  const rangeEnd = endOfDay(dateRange.to)
  
  // Get the month for monthly comparisons
  const currentMonth = format(dateRange.from, 'yyyy-MM')
  const previousMonth = format(subMonths(dateRange.from, 1), 'yyyy-MM')

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

  // 3. Get expenses for the selected date range
  const expensesRef = collection(db, `wallet/${userId}/expenses`)
  const rangeExpensesQuery = query(
    expensesRef,
    where('date', '>=', Timestamp.fromDate(rangeStart)),
    where('date', '<=', Timestamp.fromDate(rangeEnd)),
    orderBy('date', 'desc')
  )

  const expensesSnapshot = await getDocs(rangeExpensesQuery)
  const expenses = expensesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Expense))

  // Calculate totals and breakdowns for the selected range
  let totalAmount = 0
  const categoryBreakdown: { [key: string]: number } = {}
  const dailyTotals: { [key: number]: { total: number; count: number } } = {}

  expenses.forEach(expense => {
    totalAmount += expense.amount
    categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount
    
    const day = expense.day
    if (!dailyTotals[day]) {
      dailyTotals[day] = { total: 0, count: 0 }
    }
    dailyTotals[day].total += expense.amount
    dailyTotals[day].count++
  })

  // Calculate category totals with percentages
  const categoryTotals: CategoryTotal[] = Object.entries(categoryBreakdown).map(([category, total]) => ({
    category,
    total,
    percentage: totalAmount > 0 ? roundToTwo((total / totalAmount) * 100) : 0
  }))

  // Format daily totals
  const formattedDailyTotals: DailyTotal[] = Object.entries(dailyTotals).map(([day, data]) => ({
    day: parseInt(day),
    total: data.total,
    avgAmount: roundToTwo(data.total / data.count)
  }))

  return {
    currentMonthTotal: totalAmount,
    previousMonthTotal: previousMonthSummary?.totalAmount || 0,
    monthlyChange: previousMonthSummary?.totalAmount 
      ? roundToTwo(((totalAmount - previousMonthSummary.totalAmount) / previousMonthSummary.totalAmount) * 100)
      : 0,
    categoryTotals: categoryTotals.sort((a, b) => b.total - a.total),
    dailyTotals: formattedDailyTotals.sort((a, b) => a.day - b.day),
    recentExpenses: expenses,
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