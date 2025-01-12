'use client'

import * as React from 'react'
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks, format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EnhancedDateRangePickerProps {
  className?: string
  value?: DateRange
  onChange?: (date: DateRange | undefined) => void
}

export function EnhancedDateRangePicker({
  className,
  value,
  onChange,
}: EnhancedDateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const presets = React.useMemo(() => [
    {
      label: 'Today',
      getValue: () => ({
        from: new Date(),
        to: new Date(),
      }),
    },
    {
      label: 'Last 7 days',
      getValue: () => ({
        from: addDays(new Date(), -6),
        to: new Date(),
      }),
    },
    {
      label: 'Current week',
      getValue: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      label: 'Last week',
      getValue: () => ({
        from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }),
        to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }),
      }),
    },
    {
      label: 'Current month',
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: 'Last month',
      getValue: () => {
        const lastMonth = subMonths(new Date(), 1)
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        }
      },
    },
  ], [])

  // Set initial value to current month if no value is provided
  React.useEffect(() => {
    if (!value && onChange) {
      const currentMonth = presets.find(preset => preset.label === 'Current month')
      if (currentMonth) {
        onChange(currentMonth.getValue())
      }
    }
  }, [value, onChange, presets])

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-full sm:w-[300px] justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, 'LLL dd, y')} -{' '}
                  {format(value.to, 'LLL dd, y')}
                </>
              ) : (
                format(value.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex flex-col gap-4">
            <Select
              onValueChange={(value) => {
                const preset = presets.find((preset) => preset.label === value)
                if (preset) {
                  onChange?.(preset.getValue())
                  setOpen(false)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a preset range" />
              </SelectTrigger>
              <SelectContent position="popper">
                {presets.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="border-t" />
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={(newValue) => {
                onChange?.(newValue)
                if (newValue?.from && newValue?.to) {
                  setOpen(false)
                }
              }}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 