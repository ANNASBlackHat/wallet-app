import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { migrateUserData } from './migrate-firestore'

// Initialize Firebase (you'll need to add your config)
const firebaseConfig = {
  // Add your Firebase config here
  // apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  // messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  // appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

async function getAllUserIds() {
  const db = getFirestore()
  const usersRef = collection(db, 'wallet')
  const snapshot = await getDocs(usersRef)
  return snapshot.docs.map(doc => doc.id)
}

async function runMigration() {
  console.log('Starting Firestore migration...')
  
  // Get command line arguments
  const args = process.argv.slice(2)
  const specificUserId = args[0]
  
  try {
    // Initialize Firebase
    initializeApp(firebaseConfig)
    
    if (specificUserId) {
      // Migrate specific user
      console.log(`Migrating data for user: ${specificUserId}`)
      const result = await migrateUserData(specificUserId)
      console.log(`Migration completed for user ${specificUserId}:`, result)
    } else {
      // Migrate all users
      console.log('Fetching all user IDs...')
      const userIds = await getAllUserIds()
      console.log(`Found ${userIds.length} users to migrate`)
      
      for (const userId of userIds) {
        try {
          console.log(`\nMigrating data for user: ${userId}`)
          const result = await migrateUserData(userId)
          console.log(`Migration completed for user ${userId}:`, result)
        } catch (error) {
          console.error(`Failed to migrate user ${userId}:`, error)
          // Continue with next user even if one fails
        }
      }
    }
    
    console.log('\nMigration process completed!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration() 