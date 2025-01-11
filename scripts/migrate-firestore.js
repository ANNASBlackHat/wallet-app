"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateUserData = migrateUserData;
const firestore_1 = require("firebase/firestore");
async function migrateUserData(userId) {
    console.log(`Starting migration for user: ${userId}`);
    const db = (0, firestore_1.getFirestore)();
    try {
        // 1. Fetch all old spending documents
        const spendingRef = (0, firestore_1.collection)(db, `wallet/${userId}/spending`);
        const q = (0, firestore_1.query)(spendingRef, (0, firestore_1.orderBy)('date_created_millis', 'desc'));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        console.log(`Found ${querySnapshot.size} documents to migrate`);
        // Process in batches of 500 (Firestore limit)
        const BATCH_SIZE = 500;
        let currentBatch = (0, firestore_1.writeBatch)(db);
        let operationCount = 0;
        let totalExpenses = 0;
        // Track monthly summaries
        const monthlySummaries = {};
        for (const docSnapshot of querySnapshot.docs) {
            const oldData = docSnapshot.data();
            oldData.docId = docSnapshot.id;
            // Process each spending item in the array
            for (const spendingItem of oldData.spending) {
                const date = new Date(oldData.date_created_millis);
                const yearMonth = date.toISOString().slice(0, 7); // YYYY-MM format
                // Create new expense document
                const newExpense = {
                    category: spendingItem.Category,
                    name: spendingItem.Name,
                    quantity: Number(spendingItem.Quantity) || 1,
                    unit: spendingItem.Unit || 'unit',
                    amount: spendingItem.Total,
                    description: spendingItem.Description || '',
                    date: firestore_1.Timestamp.fromMillis(oldData.date_created_millis),
                    yearMonth,
                    day: date.getDate()
                };
                // Update monthly summaries
                if (!monthlySummaries[yearMonth]) {
                    monthlySummaries[yearMonth] = {
                        totalAmount: 0,
                        categoryBreakdown: {},
                        expenseCount: 0,
                        avgPerDay: 0
                    };
                }
                const summary = monthlySummaries[yearMonth];
                summary.totalAmount += newExpense.amount;
                summary.categoryBreakdown[newExpense.category] =
                    (summary.categoryBreakdown[newExpense.category] || 0) + newExpense.amount;
                summary.expenseCount++;
                // Create new expense document under wallet/[id]/expenses
                const newExpenseRef = (0, firestore_1.doc)((0, firestore_1.collection)(db, `wallet/${userId}/expenses`));
                currentBatch.set(newExpenseRef, newExpense);
                operationCount++;
                totalExpenses++;
                // Commit batch if we reach the limit
                if (operationCount >= BATCH_SIZE) {
                    console.log(`Committing batch of ${operationCount} operations`);
                    await currentBatch.commit();
                    currentBatch = (0, firestore_1.writeBatch)(db);
                    operationCount = 0;
                }
            }
        }
        // Commit any remaining expense documents
        if (operationCount > 0) {
            console.log(`Committing final batch of ${operationCount} operations`);
            await currentBatch.commit();
        }
        // Create new batch for monthly summaries
        currentBatch = (0, firestore_1.writeBatch)(db);
        operationCount = 0;
        // Write monthly summaries
        for (const [yearMonth, summary] of Object.entries(monthlySummaries)) {
            // Fix the date parsing issue
            const year = parseInt(yearMonth.slice(0, 4));
            const month = parseInt(yearMonth.slice(5, 7));
            const daysInMonth = new Date(year, month, 0).getDate();
            summary.avgPerDay = summary.totalAmount / daysInMonth;
            // Update path to keep under wallet/[id]/summaries
            const summaryRef = (0, firestore_1.doc)(db, `wallet/${userId}/summaries/${yearMonth}`);
            currentBatch.set(summaryRef, summary);
            operationCount++;
            if (operationCount >= BATCH_SIZE) {
                await currentBatch.commit();
                currentBatch = (0, firestore_1.writeBatch)(db);
                operationCount = 0;
            }
        }
        // Commit any remaining summaries
        if (operationCount > 0) {
            await currentBatch.commit();
        }
        console.log(`Migration completed successfully:`);
        console.log(`- Total expenses migrated: ${totalExpenses}`);
        console.log(`- Monthly summaries created: ${Object.keys(monthlySummaries).length}`);
        return {
            success: true,
            totalExpenses,
            monthlySummaries: Object.keys(monthlySummaries).length
        };
    }
    catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}
