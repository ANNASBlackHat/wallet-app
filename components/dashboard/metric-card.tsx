'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import React from "react"

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export function MetricCard({
  title,
  children,
  className,
  contentClassName,
  ...props
}: MetricCardProps) {
  return (
    <Card className={cn("", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-1", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
} 