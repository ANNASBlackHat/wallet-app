'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  userId: string | null
  error: Error | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userId: null,
  error: null,
  signIn: async () => {},
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('AuthProvider initialized')
  const [user, setUser] = useState<User | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const findOrCreateUser = async (email: string) => {
    if (!email) return null;
    
    try {
      console.log('🔍 Looking for user with email:', email)
      
      // First, try to find user by email
      const usersRef = collection(db, 'wallet')
      const q = query(usersRef, where('email', '==', email))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        // Log all found documents (to debug duplicates)
        querySnapshot.docs.forEach((doc, index) => {
          console.log(`📄 Found document ${index + 1}:`, {
            id: doc.id,
            email: doc.data().email,
            created_at: doc.data().created_at
          })
        })
        
        // Use the first document found
        const existingUser = querySnapshot.docs[0]
        console.log('✅ Using existing user:', existingUser.id)
        return existingUser.id
      }

      console.log('❌ No existing user found, creating new user...')
      
      // Double check one more time before creating
      const doubleCheckSnapshot = await getDocs(q)
      if (!doubleCheckSnapshot.empty) {
        const existingUser = doubleCheckSnapshot.docs[0]
        console.log('⚠️ User was created by another process, using existing:', existingUser.id)
        return existingUser.id
      }

      // Create new user with auto-generated ID
      const newUserRef = doc(collection(db, 'wallet'))
      const userData = {
        email: email,
        created_at: new Date().toISOString()
      }
      
      console.log('📝 Creating new user:', {
        id: newUserRef.id,
        path: `wallet/${newUserRef.id}`,
        ...userData
      })
      
      await setDoc(newUserRef, userData)
      console.log('✨ User creation completed, ID:', newUserRef.id)
      return newUserRef.id
      
    } catch (error) {
      console.error('❌ Error in findOrCreateUser:', error)
      return null
    }
  }

  useEffect(() => {
    console.log('Setting up auth state listener')
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out')
      setUser(user)
      if (user?.email) {
        const userId = await findOrCreateUser(user.email)
        setUserId(userId)
      } else {
        setUserId(null)
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
      
      if (result.user?.email) {
        const userId = await findOrCreateUser(result.user.email)
        setUserId(userId)
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
      setUserId(null)
      console.log('User signed out successfully')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [])

  console.log('AuthProvider current state:', { user: user?.email, userId, loading, error })

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userId,
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

