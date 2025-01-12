import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TotalSpendingCardProps {
  total: number
  previousTotal: number
  change: number
}

export function TotalSpendingCard({ total, previousTotal, change }: TotalSpendingCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
          }).format(total)}
        </div>
        <p className="text-xs text-muted-foreground">
          {change >= 0 ? '+' : ''}{change}% from previous period
        </p>
      </CardContent>
    </Card>
  )
} 