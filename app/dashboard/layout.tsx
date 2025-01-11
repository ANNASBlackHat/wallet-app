import { LogoutButton } from '@/components/logout-button'
import { InstallPWAPrompt } from '@/components/install-pwa-prompt'
import { ThemeToggle } from '@/components/theme-toggle'
import { AddExpenseFab } from '@/components/add-expense-fab'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 flex justify-end items-center gap-4">
        <ThemeToggle />
        <LogoutButton />
      </header>
      <main className="p-8 relative">
        {children}
        <InstallPWAPrompt />
        <AddExpenseFab />
      </main>
    </div>
  )
}

