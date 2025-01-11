'use client'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut, PieChart, Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './theme-toggle'

const routes = [
  {
    label: 'Overview',
    icon: PieChart,
    href: '/dashboard',
    color: 'text-sky-500',
  },
  {
    label: 'Add Expense',
    icon: Plus,
    href: '/dashboard/add',
    color: 'text-violet-500',
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/dashboard/settings',
    color: 'text-pink-700',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-background text-foreground">
      <div className="px-3 py-2 flex-1">
        <div className="flex items-center justify-between pl-3 mb-14">
          <Link href="/dashboard">
            <h1 className="text-2xl font-bold">
              Wallet AI
            </h1>
          </Link>
          <ThemeToggle />
        </div>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={`text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-foreground hover:bg-accent rounded-lg transition ${
                pathname === route.href ? 'text-foreground bg-accent' : 'text-muted-foreground'
              }`}
            >
              <div className="flex items-center flex-1">
                <route.icon className={`h-5 w-5 mr-3 ${route.color}`} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <Button
          onClick={() => signOut()}
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
          variant="ghost"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  )
}

