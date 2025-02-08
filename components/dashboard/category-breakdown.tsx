import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts'
import { useMemo } from 'react'
import { useWindowSize } from '@/hooks/use-window-size'
import { useTheme } from 'next-themes'

interface CategoryTotal {
  category: string
  total: number
  percentage: number
}

interface ProcessedCategory extends CategoryTotal {
  id: string
  displayName: string
  originalCategories?: CategoryTotal[] // For "Others" category
}

interface CategoryBreakdownProps {
  data: CategoryTotal[]
}

// Theme-aware color palettes
const COLOR_PALETTES = {
  dark: {
    food: ['#3b82f6', '#2563eb', '#1d4ed8'],
    housing: ['#94a3b8', '#64748b', '#475569'],
    others: ['#6b7280', '#4b5563', '#374151'],
    drink: ['#9ca3af', '#6b7280', '#4b5563'],
    electronics: ['#cbd5e1', '#94a3b8', '#64748b'],
    home_repair: ['#e2e8f0', '#cbd5e1', '#94a3b8'],
    default: ['#6b7280', '#4b5563', '#374151']
  },
  light: {
    food: ['#2563eb', '#3b82f6', '#60a5fa'],
    housing: ['#475569', '#64748b', '#94a3b8'],
    others: ['#4b5563', '#6b7280', '#9ca3af'],
    drink: ['#6b7280', '#9ca3af', '#d1d5db'],
    electronics: ['#64748b', '#94a3b8', '#cbd5e1'],
    home_repair: ['#94a3b8', '#cbd5e1', '#e2e8f0'],
    default: ['#6b7280', '#9ca3af', '#d1d5db']
  }
}

// Function to get color based on category
const getCategoryColor = (category: string, index: number = 0): string => {
  const normalizedCategory = category.toLowerCase()
  const { theme = 'light' } = useTheme()
  
  const palette = COLOR_PALETTES[theme === 'dark' ? 'dark' : 'light']
  
  const colorSet = Object.entries(palette).find(([key]) => 
    normalizedCategory.includes(key)
  )?.[1] || palette.default
  
  // Return specific shade from gradient or first color
  return colorSet[index % colorSet.length]
}

// Update responsive configuration
const getResponsiveConfig = (width: number) => {
  if (width < 480) { // Mobile
    return {
      chartHeight: 260,
      outerRadius: 100,
      innerRadius: 70,
      labelOffset: 15,
      fontSize: 12,
      legendLayout: 'horizontal' as const
    }
  } else if (width < 768) { // Tablet
    return {
      chartHeight: 280,
      outerRadius: 110,
      innerRadius: 80,
      labelOffset: 18,
      fontSize: 13,
      legendLayout: 'horizontal' as const
    }
  } else { // Desktop
    return {
      chartHeight: 300,
      outerRadius: 120,
      innerRadius: 90,
      labelOffset: 20,
      fontSize: 14,
      legendLayout: 'horizontal' as const
    }
  }
}

// Update legend configuration
const legendConfig = {
  layout: 'horizontal' as const,
  align: 'center' as const,
  verticalAlign: 'bottom' as const,
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: {
    paddingTop: '12px',
    width: '100%',
  },
  formatter: (value: string) => {
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
  index,
  config
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  name: string
  index: number
  config: ReturnType<typeof getResponsiveConfig>
}) => {
  if (percent < LABEL_THRESHOLD) return null

  const RADIAN = Math.PI / 180
  const radius = (innerRadius + outerRadius) / 2
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#fff"
      fontSize={config.fontSize}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// Enhanced data processing utilities
const normalizeCategory = (category: string): string => {
  return category
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
}

const formatDisplayName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0
  return value / total
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const { width = 1024 } = useWindowSize()
  const { theme = 'light' } = useTheme()
  const config = useMemo(() => getResponsiveConfig(width), [width])

  // Process and enhance data
  const { processedData, totalSpending } = useMemo(() => {
    if (!data?.length) {
      return {
        processedData: [],
        totalSpending: 0
      }
    }

    const total = data.reduce((sum, item) => sum + item.total, 0)
    
    // Group similar categories
    const categoryGroups = new Map<string, CategoryTotal[]>()
    
    data.forEach(item => {
      const normalizedCategory = normalizeCategory(item.category)
      const existing = categoryGroups.get(normalizedCategory) || []
      categoryGroups.set(normalizedCategory, [...existing, item])
    })

    // Process each group
    const mainCategories: ProcessedCategory[] = []
    const smallCategories: CategoryTotal[] = []

    categoryGroups.forEach((items, normalizedCategory) => {
      const groupTotal = items.reduce((sum, item) => sum + item.total, 0)
      const percentage = calculatePercentage(groupTotal, total)

      if (percentage >= OTHERS_THRESHOLD) {
        mainCategories.push({
          id: normalizedCategory,
          category: normalizedCategory,
          displayName: formatDisplayName(normalizedCategory),
          total: groupTotal,
          percentage
        })
      } else {
        smallCategories.push(...items)
      }
    })

    // Handle small categories
    if (smallCategories.length > 0) {
      const othersTotal = smallCategories.reduce((sum, item) => sum + item.total, 0)
      mainCategories.push({
        id: 'others',
        category: 'Others',
        displayName: 'Others',
        total: othersTotal,
        percentage: calculatePercentage(othersTotal, total),
        originalCategories: smallCategories
      })
    }

    // Sort by total in descending order
    const sortedData = mainCategories.sort((a, b) => b.total - a.total)

    return {
      processedData: sortedData,
      totalSpending: total
    }
  }, [data])

  // Update tooltip to show original categories for "Others"
  const CustomTooltipWithDetails = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null

    const data = payload[0].payload as ProcessedCategory
    const color = getCategoryColor(data.category, 0)

    return (
      <div className={`
        rounded-lg shadow-lg p-3 border
        ${theme === 'dark' 
          ? 'bg-gray-900/90 backdrop-blur-sm border-gray-800' 
          : 'bg-white/90 backdrop-blur-sm border-gray-100'
        }
      `}>
        {/* Category Header */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: color }}
          />
          <span className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            {data.displayName}
          </span>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <div className={theme === 'dark' ? 'text-sm text-gray-400' : 'text-sm text-gray-600'}>
            Amount:
            <span className={`ml-2 font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(data.total)}
            </span>
          </div>

          {/* Percentage */}
          <div className={theme === 'dark' ? 'text-sm text-gray-400' : 'text-sm text-gray-600'}>
            Percentage:
            <span className={`ml-2 font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              {(data.percentage * 100).toFixed(1)}%
            </span>
          </div>

          {/* Show original categories for "Others" */}
          {data.originalCategories && data.originalCategories.length > 0 && (
            <div className={`mt-2 pt-2 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className={theme === 'dark' ? 'text-xs text-gray-500' : 'text-xs text-gray-500'}>
                Includes:
              </div>
              <div className="max-h-24 overflow-y-auto">
                {data.originalCategories.map((cat, idx) => (
                  <div key={idx} className={`text-xs flex justify-between ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <span>{cat.category}</span>
                    <span className="ml-2">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(cat.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Update legend config with theme-aware styling
  const responsiveLegendConfig = {
    ...legendConfig,
    layout: config.legendLayout,
    wrapperStyle: {
      ...legendConfig.wrapperStyle,
      paddingTop: config.legendLayout === 'horizontal' ? '20px' : '10px',
    },
    formatter: (value: string, entry: any) => {
      const item = entry.payload as ProcessedCategory
      return (
        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          {item.displayName}
        </span>
      )
    }
  }

  // Handle empty state
  if (!processedData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`h-[200px] flex items-center justify-center ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            No spending data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-lg sm:text-xl">Category Breakdown</CardTitle>
        <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Total Spending: {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(totalSpending)}
        </p>
      </CardHeader>
      <CardContent>
        <div style={{ height: config.chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart 
              margin={{ 
                top: 10, 
                right: 10, 
                bottom: 20, 
                left: 10 
              }}
            >
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={config.outerRadius}
                innerRadius={config.innerRadius}
                fill="#8884d8"
                dataKey="total"
                nameKey="displayName"
                label={(props) => renderCustomizedLabel({ ...props, config })}
                paddingAngle={1}
                animationBegin={0}
                animationDuration={1000}
                animationEasing="ease-out"
                minAngle={15}
              >
                {processedData.map((entry, index) => (
                  <Cell 
                    key={entry.id} 
                    fill={getCategoryColor(entry.category, 0)}
                    className="transition-opacity duration-200 hover:opacity-90"
                  />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomTooltipWithDetails />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend {...responsiveLegendConfig} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 