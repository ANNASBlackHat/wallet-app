import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/auth-context'
import { NetworkProvider } from '@/contexts/network-status'
import { NetworkStatus } from '@/components/network-status'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Wallet AI',
  description: 'AI-powered expense management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NetworkProvider>
              {children}
              <NetworkStatus />
              <Toaster />
            </NetworkProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

