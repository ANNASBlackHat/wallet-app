import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts'
import { useMemo } from 'react'

interface CategoryTotal {
  category: string
  total: number
  percentage: number
}

interface CategoryBreakdownProps {
  data: CategoryTotal[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

// Custom Legend style configuration
const legendConfig = {
  layout: 'horizontal' as const,
  align: 'center' as const,
  verticalAlign: 'bottom' as const,
  iconType: 'circle' as const,
  iconSize: 10,
  wrapperStyle: {
    paddingTop: '20px',
    width: '100%',
  },
  formatter: (value: string) => {
    // Ensure consistent text formatting
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
  }
}

const OTHERS_THRESHOLD = 0.05 // 5% threshold for grouping into "Others"
const LABEL_THRESHOLD = 0.1 // 10% threshold for showing labels

// Custom label component with smart positioning
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  name: string
}) => {
  if (percent < LABEL_THRESHOLD) return null

  // Calculate position for label
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 25 // Position label outside the pie
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  // Determine text anchor based on position
  const textAnchor = x > cx ? 'start' : 'end'

  return (
    <g>
      {/* Draw connecting line */}
      <path
        d={`M${cx + (outerRadius + 5) * Math.cos(-midAngle * RADIAN)},${
          cy + (outerRadius + 5) * Math.sin(-midAngle * RADIAN)
        }L${x},${y}`}
        stroke={COLORS[0]}
        fill="none"
        strokeWidth={1}
        opacity={0.5}
      />
      {/* Label text */}
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill="#888888"
        dominantBaseline="central"
        fontSize={12}
      >
        <tspan x={x} dy="-0.5em">{name}</tspan>
        <tspan x={x} dy="1.2em" fontWeight="bold">
          {`${(percent * 100).toFixed(0)}%`}
        </tspan>
      </text>
    </g>
  )
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  // Process data to group small categories into "Others"
  const processedData = useMemo(() => {
    if (!data?.length) return []
    
    const total = data.reduce((sum, item) => sum + item.total, 0)
    const mainCategories: CategoryTotal[] = []
    let othersTotal = 0
    
    data.forEach(item => {
      const percentage = item.total / total
      if (percentage >= OTHERS_THRESHOLD) {
        mainCategories.push({
          ...item,
          percentage
        })
      } else {
        othersTotal += item.total
      }
    })
    
    // Add "Others" category if there are small categories
    if (othersTotal > 0) {
      mainCategories.push({
        category: 'Others',
        total: othersTotal,
        percentage: othersTotal / total
      })
    }
    
    // Sort by total in descending order
    return mainCategories.sort((a, b) => b.total - a.total)
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]"> {/* Increased height for better label spacing */}
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 80, bottom: 30, left: 80 }}>
              <Pie
                data={processedData}
                cx="50%"
                cy="45%"
                labelLine={false}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey="total"
                nameKey="category"
                label={renderCustomizedLabel}
                paddingAngle={2}
                animationBegin={0}
                animationDuration={1000}
                animationEasing="ease-out"
                minAngle={15} // Ensure minimum segment size
              >
                {processedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    className="transition-opacity duration-200 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => 
                  new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR'
                  }).format(value)
                }
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                }}
                itemStyle={{
                  color: '#fff',
                }}
              />
              <Legend {...legendConfig} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 