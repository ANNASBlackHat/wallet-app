'use client'

import React from "react"
import { cn } from "@/lib/utils"

interface DashboardContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function DashboardContainer({
  children,
  className,
  ...props
}: DashboardContainerProps) {
  return (
    <div 
      className={cn(
        "flex-1 space-y-4 p-3 sm:space-y-5 sm:p-6 md:space-y-6 md:p-8",
        className
      )} 
      {...props}
    >
      {/* Header Section - Date Range and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2">
          {/* Date range picker will be moved here */}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-6">
        {/* Grid sections will be organized here */}
        {children}
      </div>
    </div>
  )
}

// Grid section components for better organization
interface GridSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function DashboardMetricsSection({
  children,
  className,
  ...props
}: GridSectionProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 md:grid-cols-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DashboardChartsSection({
  children,
  className,
  ...props
}: GridSectionProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 lg:grid-cols-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DashboardInsightsSection({
  children,
  className,
  ...props
}: GridSectionProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DashboardFullWidthSection({
  children,
  className,
  ...props
}: GridSectionProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
} 