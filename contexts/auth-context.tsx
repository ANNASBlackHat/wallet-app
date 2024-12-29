'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  writeBatch,
  runTransaction,
  DocumentReference,
  QuerySnapshot,
  DocumentData,
  deleteDoc,
  orderBy,
  limit
} from 'firebase/firestore'
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

  const cleanupDuplicateUsers = async (email: string): Promise<void> => {
    try {
      console.log('🧹 Starting cleanup for duplicates of email:', email)
      
      // Get all users with this email, ordered by creation date
      const usersRef = collection(db, 'wallet')
      const q = query(
        usersRef,
        where('email', '==', email),
        orderBy('created_at', 'asc')
      )
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.size <= 1) {
        console.log('✅ No duplicates found')
        return
      }

      console.log(`🔍 Found ${querySnapshot.size} users with same email`)
      
      // Keep the oldest user (first one)
      const primaryUser = querySnapshot.docs[0]
      console.log('✨ Keeping primary user:', primaryUser.id)

      // Process duplicates
      const batch = writeBatch(db)
      
      for (let i = 1; i < querySnapshot.docs.length; i++) {
        const duplicateDoc = querySnapshot.docs[i]
        console.log(`🗑️ Processing duplicate ${i}:`, duplicateDoc.id)

        // Get all spending data from duplicate
        const spendingRef = collection(db, `wallet/${duplicateDoc.id}/spending`)
        const spendingSnapshot = await getDocs(spendingRef)

        // Move spending data to primary user if any exists
        if (!spendingSnapshot.empty) {
          console.log(`📦 Moving ${spendingSnapshot.size} spending records from ${duplicateDoc.id} to ${primaryUser.id}`)
          
          for (const spendingDoc of spendingSnapshot.docs) {
            const targetRef = doc(db, `wallet/${primaryUser.id}/spending`, spendingDoc.id)
            batch.set(targetRef, spendingDoc.data())
            
            // Delete original spending document
            const sourceRef = doc(db, `wallet/${duplicateDoc.id}/spending`, spendingDoc.id)
            batch.delete(sourceRef)
          }
        }

        // Delete the duplicate user document
        batch.delete(duplicateDoc.ref)
      }

      // Commit all changes
      await batch.commit()
      console.log('✅ Cleanup completed successfully')
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error)
    }
  }

  const findOrCreateUser = async (email: string): Promise<string | null> => {
    if (!email) return null;
    
    try {
      console.log('🔍 Looking for user with email:', email)
      
      // First check if user exists to avoid unnecessary transactions
      const usersRef = collection(db, 'wallet')
      const q = query(usersRef, where('email', '==', email))
      const initialCheck = await getDocs(q)
      
      if (!initialCheck.empty) {
        // Log all found documents (to debug duplicates)
        initialCheck.docs.forEach((doc, index) => {
          console.log(`📄 Found document ${index + 1}:`, {
            id: doc.id,
            email: doc.data().email,
            created_at: doc.data().created_at
          })
        })
        
        // If duplicates found, clean them up
        if (initialCheck.size > 1) {
          console.log('⚠️ Found duplicate users, initiating cleanup...')
          await cleanupDuplicateUsers(email)
          // After cleanup, get the primary user
          const afterCleanupCheck = await getDocs(q)
          const primaryUser = afterCleanupCheck.docs[0]
          console.log('✅ Using primary user after cleanup:', primaryUser.id)
          return primaryUser.id
        }
        
        // Use the first document found
        const existingUser = initialCheck.docs[0]
        console.log('✅ Using existing user:', existingUser.id)
        return existingUser.id
      }

      console.log('❌ No existing user found, creating new user...')
      
      // If no user exists, create one in a transaction to ensure atomicity
      return await runTransaction(db, async (transaction) => {
        // Double check inside transaction that no user was created
        const doubleCheckDocs = await getDocs(q)
        
        if (!doubleCheckDocs.empty) {
          const existingUser = doubleCheckDocs.docs[0]
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
        
        // Set the data in the transaction
        transaction.set(newUserRef, userData)
        
        console.log('✨ User creation completed, ID:', newUserRef.id)
        return newUserRef.id
      })
      
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
        const newUserId = await findOrCreateUser(user.email)
        setUserId(newUserId)
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
        const newUserId = await findOrCreateUser(result.user.email)
        setUserId(newUserId)
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

