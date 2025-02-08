import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, subMonths } from 'date-fns'

interface DailyTotal {
  day: number
  total: number
  avgAmount: number
  lastMonthTotal: number
}

interface DailySpendingProps {
  data: DailyTotal[]
  selectedDate: Date
}

export function DailySpending({ data, selectedDate }: DailySpendingProps) {
  const currentMonth = format(selectedDate, 'MMMM yyyy')
  const lastMonth = format(subMonths(selectedDate, 1), 'MMMM yyyy')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="day" />
              <YAxis 
                tickFormatter={(value) => 
                  new Intl.NumberFormat('id-ID', {
                    notation: 'compact',
                    compactDisplay: 'short',
                    currency: 'IDR'
                  }).format(value)
                }
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR'
                  }).format(value),
                  name === `${currentMonth} Total` ? `${currentMonth} Total` :
                  name === `${lastMonth} Total` ? `${lastMonth} Total` :
                  'Daily Average'
                ]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#8884d8" 
                name={`${currentMonth} Total`}
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="lastMonthTotal" 
                stroke="#d3d3d3"
                name={`${lastMonth} Total`}
                strokeDasharray="5 5"
                strokeWidth={1.5}
                opacity={0.7}
              />
              <Line 
                type="monotone" 
                dataKey="avgAmount" 
                stroke="#ffc658" 
                name="Daily Average"
                dot={false}
                strokeWidth={1}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 