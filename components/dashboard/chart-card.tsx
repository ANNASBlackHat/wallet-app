'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import React, { useState } from "react"

interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  children: React.ReactNode
  className?: string
  contentClassName?: string
  action?: React.ReactNode
  description?: React.ReactNode
  collapsible?: boolean
  fullHeight?: boolean
}

export function ChartCard({
  title,
  children,
  className,
  contentClassName,
  action,
  description,
  collapsible = false,
  fullHeight = false,
  ...props
}: ChartCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <Card className={cn("h-full", className)} {...props}>
      <CardHeader className="flex flex-col space-y-2 p-4">
        <div className="flex flex-row items-center justify-between">
          <div className="space-y-1 pr-2">
            <CardTitle className="text-base font-semibold line-clamp-1">
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {action}
            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted lg:hidden"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "p-4",
          "transition-all duration-200",
          {
            "h-0 overflow-hidden p-0": isCollapsed,
            "h-[350px]": !isCollapsed && !fullHeight,
            "min-h-[350px]": !isCollapsed && fullHeight
          },
          contentClassName
        )}
      >
        {children}
      </CardContent>
    </Card>
  )
}

// Variant for smaller charts
export function SmallChartCard({
  title,
  children,
  className,
  contentClassName,
  action,
  description,
  ...props
}: ChartCardProps) {
  return (
    <Card className={cn("h-full", className)} {...props}>
      <CardHeader className="flex flex-col space-y-1 p-4">
        <div className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground line-clamp-1">
              {title}
            </CardTitle>
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
          {action && (
            <div className="flex items-center space-x-2">
              {action}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "p-4 h-[200px]",
          contentClassName
        )}
      >
        {children}
      </CardContent>
    </Card>
  )
} 