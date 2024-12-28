'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  console.log('LoginPage rendered')
  const { user, signIn, error: authError } = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      console.log('User detected, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [user, router])

  const handleSignIn = async () => {
    console.log('handleSignIn in LoginPage called, ')
    setIsSigningIn(true)
    setLocalError(null)
    try {
      await signIn()
      console.log('Sign-in completed')
    } catch (err) {
      console.error('Sign-in error:', err)
      setLocalError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome to Wallet AI</CardTitle>
          <CardDescription>
            Sign in with your Google account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignIn} className="w-full" disabled={isSigningIn}>
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </Button>
          {(authError || localError) && (
            <p className="mt-4 text-sm text-red-500">
              {authError?.message || localError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

