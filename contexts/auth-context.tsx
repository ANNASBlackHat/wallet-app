'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  phone: string | null
  error: Error | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  phone: null,
  error: null,
  signIn: async () => {},
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('AuthProvider initialized')
  const [user, setUser] = useState<User | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    console.log('Setting up auth state listener')
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out')
      setUser(user)
      if (user) {
        try {
          const walletRef = doc(db, 'wallet', '6285742257881')
          const walletDoc = await getDoc(walletRef)
          if (walletDoc.exists() && walletDoc.data().email === user.email) {
            console.log('User email found in wallet collection')
            setPhone('6285742257881')
          } else {
            console.log('User email not found in wallet collection')
            setPhone(null)
          }
        } catch (error) {
          console.error('Error checking wallet document:', error)
        }
      } else {
        setPhone(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleSignIn = useCallback(async () => {
    console.log('handleSignIn in AuthContext called')
    try {
      console.log('Initiating Google sign-in process...')
      const result = await signInWithPopup(auth, googleProvider)
      console.log('Sign-in successful:', result.user)
      // Check if the user's email exists in the wallet collection
      const walletRef = doc(db, 'wallet', '6285742257881')
      const walletDoc = await getDoc(walletRef)
      if (walletDoc.exists() && walletDoc.data().email === result.user.email) {
        console.log('User email found in wallet collection')
        setPhone('6285742257881')
      } else {
        console.log('User email not found in wallet collection')
        setPhone(null)
      }
    } catch (error) {
      console.error('Error signing in:', error)
      setError(error instanceof Error ? error : new Error('An unknown error occurred'))
      throw error
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth)
      setPhone(null)
      console.log('User signed out successfully')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [])

  console.log('AuthProvider current state:', { user: user?.email, phone, loading, error })

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        phone,
        error,
        signIn: handleSignIn,
        signOut: handleSignOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

