import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore'

interface ValidationResult {
  userId: string
  isValid: boolean
  oldExpenseCount: number
  newExpenseCount: number
  totalAmountMatch: boolean
  categoriesMatch: boolean
  errors: string[]
}

async function validateUserMigration(userId: string): Promise<ValidationResult> {
  const db = getFirestore()
  const errors: string[] = []
  
  try {
    // Get old data
    const oldSpendingRef = collection(db, `wallet/${userId}/spending`)
    const oldSpendingDocs = await getDocs(oldSpendingRef)
    
    let oldTotalAmount = 0
    let oldExpenseCount = 0
    const oldCategories = new Set<string>()
    
    oldSpendingDocs.forEach(doc => {
      const data = doc.data()
      data.spending.forEach((item: any) => {
        oldTotalAmount += Number(item.Total)
        oldExpenseCount++
        oldCategories.add(item.Category)
      })
    })
    
    // Get new data - updated path
    const newExpensesRef = collection(db, `wallet/${userId}/expenses`)
    const newExpensesDocs = await getDocs(newExpensesRef)
    
    let newTotalAmount = 0
    let newExpenseCount = 0
    const newCategories = new Set<string>()
    
    newExpensesDocs.forEach(doc => {
      const data = doc.data()
      newTotalAmount += Number(data.amount)
      newExpenseCount++
      newCategories.add(data.category)
    })
    
    // Validate monthly summaries - updated path
    const summariesRef = collection(db, `wallet/${userId}/summaries`)
    const summariesDocs = await getDocs(summariesRef)
    
    let summariesTotalAmount = 0
    summariesDocs.forEach(doc => {
      const data = doc.data()
      summariesTotalAmount += data.totalAmount
    })
    
    // Check for discrepancies
    if (oldExpenseCount !== newExpenseCount) {
      errors.push(`Expense count mismatch: old=${oldExpenseCount}, new=${newExpenseCount}`)
    }
    
    if (Math.abs(oldTotalAmount - newTotalAmount) > 0.01) {
      errors.push(`Total amount mismatch: old=${oldTotalAmount}, new=${newTotalAmount}`)
    }
    
    if (Math.abs(newTotalAmount - summariesTotalAmount) > 0.01) {
      errors.push(`Summary total amount mismatch: expenses=${newTotalAmount}, summaries=${summariesTotalAmount}`)
    }
    
    const categoriesMatch = 
      Array.from(oldCategories).sort().join(',') === 
      Array.from(newCategories).sort().join(',')
    
    if (!categoriesMatch) {
      errors.push('Categories do not match between old and new data')
      errors.push(`Old categories: ${Array.from(oldCategories).join(', ')}`)
      errors.push(`New categories: ${Array.from(newCategories).join(', ')}`)
    }
    
    return {
      userId,
      isValid: errors.length === 0,
      oldExpenseCount,
      newExpenseCount,
      totalAmountMatch: Math.abs(oldTotalAmount - newTotalAmount) <= 0.01,
      categoriesMatch,
      errors
    }
    
  } catch (error) {
    return {
      userId,
      isValid: false,
      oldExpenseCount: 0,
      newExpenseCount: 0,
      totalAmountMatch: false,
      categoriesMatch: false,
      errors: [`Validation failed with error: ${error}`]
    }
  }
}

async function runValidation() {
  console.log('Starting migration validation...')
  
  // Get command line arguments
  const args = process.argv.slice(2)
  const specificUserId = args[0]
  
  try {
    // Initialize Firebase (you'll need to add your config)
    const firebaseConfig = {
      // Add your Firebase config here
    }
    initializeApp(firebaseConfig)
    
    if (specificUserId) {
      // Validate specific user
      console.log(`Validating migration for user: ${specificUserId}`)
      const result = await validateUserMigration(specificUserId)
      console.log('\nValidation Result:', JSON.stringify(result, null, 2))
    } else {
      // Validate all users
      const db = getFirestore()
      const usersRef = collection(db, 'wallet')
      const usersDocs = await getDocs(usersRef)
      
      console.log(`Found ${usersDocs.size} users to validate`)
      
      const results: ValidationResult[] = []
      for (const userDoc of usersDocs.docs) {
        const userId = userDoc.id
        console.log(`\nValidating user: ${userId}`)
        const result = await validateUserMigration(userId)
        results.push(result)
        
        // Log immediate results
        if (!result.isValid) {
          console.log('❌ Validation failed')
          result.errors.forEach(error => console.log(`  - ${error}`))
        } else {
          console.log('✅ Validation passed')
        }
      }
      
      // Print summary
      console.log('\n=== Validation Summary ===')
      console.log(`Total users validated: ${results.length}`)
      console.log(`Successful validations: ${results.filter(r => r.isValid).length}`)
      console.log(`Failed validations: ${results.filter(r => !r.isValid).length}`)
      
      // Print details of failed validations
      const failedResults = results.filter(r => !r.isValid)
      if (failedResults.length > 0) {
        console.log('\nFailed Validations Details:')
        failedResults.forEach(result => {
          console.log(`\nUser ${result.userId}:`)
          result.errors.forEach(error => console.log(`  - ${error}`))
        })
      }
    }
    
  } catch (error) {
    console.error('Validation failed:', error)
    process.exit(1)
  }
}

// Run the validation
runValidation() 