import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PendingExpense {
  id?: number;
  userId: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  amount: number;
  description: string;
  date: Date;
  yearMonth: string;
  day: number;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  error?: string;
  createdAt: Date;
}

interface WalletDB extends DBSchema {
  'pending-expenses': {
    key: number;
    value: PendingExpense;
    indexes: {
      'by-status': string;
      'by-user': string;
    };
  };
}

const DB_NAME = 'wallet-offline-db';
const DB_VERSION = 1;

let db: IDBPDatabase<WalletDB> | null = null;

export async function initOfflineDB() {
  if (db) return db;

  db = await openDB<WalletDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('pending-expenses', {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('by-status', 'status');
      store.createIndex('by-user', 'userId');
    },
  });

  return db;
}

export async function addPendingExpense(expense: Omit<PendingExpense, 'id' | 'status' | 'createdAt'>): Promise<number> {
  const db = await initOfflineDB();
  const pendingExpense: PendingExpense = {
    ...expense,
    status: 'pending',
    createdAt: new Date(),
  };
  
  return await db.add('pending-expenses', pendingExpense);
}

export async function getPendingExpenses(userId: string): Promise<PendingExpense[]> {
  const db = await initOfflineDB();
  const tx = db.transaction('pending-expenses', 'readonly');
  const index = tx.store.index('by-user');
  return await index.getAll(userId);
}

export async function updateExpenseStatus(
  id: number,
  status: PendingExpense['status'],
  error?: string
): Promise<void> {
  const db = await initOfflineDB();
  const tx = db.transaction('pending-expenses', 'readwrite');
  const expense = await tx.store.get(id);
  
  if (expense) {
    expense.status = status;
    if (error) expense.error = error;
    await tx.store.put(expense);
  }
}

export async function deletePendingExpense(id: number): Promise<void> {
  const db = await initOfflineDB();
  await db.delete('pending-expenses', id);
}

export async function getExpenseById(id: number): Promise<PendingExpense | undefined> {
  const db = await initOfflineDB();
  return await db.get('pending-expenses', id);
} 