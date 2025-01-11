"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const migrate_firestore_1 = require("./migrate-firestore");
// Initialize Firebase (you'll need to add your config)
const firebaseConfig = {
// Add your Firebase config here
apiKey: 'AIzaSyCSyGcf6fvp-boGhOZbB0Iu0fbJtL5lPVo',
authDomain: 'mix-project-f3e1b.firebaseapp.com',
projectId: 'mix-project-f3e1b',
storageBucket: 'mix-project-f3e1b.appspot.com',
messagingSenderId: '514293546521',
appId: '1:514293546521:web:25c6fda152cf40fc4db488'
};
async function getAllUserIds() {
    const db = (0, firestore_1.getFirestore)();
    const usersRef = (0, firestore_1.collection)(db, 'wallet');
    const snapshot = await (0, firestore_1.getDocs)(usersRef);
    return snapshot.docs.map(doc => doc.id);
}
async function runMigration() {
    console.log('Starting Firestore migration...');
    // Get command line arguments
    const args = process.argv.slice(2);
    const specificUserId = args[0];
    try {
        // Initialize Firebase
        (0, app_1.initializeApp)(firebaseConfig);
        if (specificUserId) {
            // Migrate specific user
            console.log(`Migrating data for user: ${specificUserId}`);
            const result = await (0, migrate_firestore_1.migrateUserData)(specificUserId);
            console.log(`Migration completed for user ${specificUserId}:`, result);
        }
        else {
            // Migrate all users
            console.log('Fetching all user IDs...');
            const userIds = await getAllUserIds();
            console.log(`Found ${userIds.length} users to migrate`);
            for (const userId of userIds) {
                try {
                    console.log(`\nMigrating data for user: ${userId}`);
                    const result = await (0, migrate_firestore_1.migrateUserData)(userId);
                    console.log(`Migration completed for user ${userId}:`, result);
                }
                catch (error) {
                    console.error(`Failed to migrate user ${userId}:`, error);
                    // Continue with next user even if one fails
                }
            }
        }
        console.log('\nMigration process completed!');
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
// Run the migration
runMigration();
