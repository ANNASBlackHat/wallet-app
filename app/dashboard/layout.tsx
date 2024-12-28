import { AuthProvider } from '@/contexts/auth-context'
import { LogoutButton } from '@/components/logout-button'
import { InstallPWAPrompt } from '@/components/install-pwa-prompt'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('DashboardLayout rendered')
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="p-4 flex justify-end">
          <LogoutButton />
        </header>
        <main className="p-8">
          {children}
          <InstallPWAPrompt />
        </main>
      </div>
    </AuthProvider>
  )
}

