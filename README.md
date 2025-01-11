# Wallet AI - Expense Management App

A modern expense management application built with Next.js and Firebase, featuring AI-powered expense entry and comprehensive spending analytics.

## Features

- 🤖 AI-Powered Expense Entry
  - Text-based expense recognition
  - Voice note transcription
  - Receipt image scanning
  - Manual entry option

- 📊 Comprehensive Analytics
  - Monthly spending overview
  - Category-wise breakdown
  - Daily spending trends
  - Month-over-month comparison
  - Category trends analysis

- 💡 Smart Features
  - Real-time updates
  - Automatic monthly summaries
  - Multi-format currency display
  - Responsive design

## Tech Stack

- **Frontend**: Next.js 13+ with App Router
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Charts**: Recharts
- **Form Handling**: React Hook Form + Zod
- **Date Handling**: date-fns

## Database Schema

The application uses Firebase Firestore with the following schema:

```
/wallet
  /{userId}
    /expenses/
      {expenseId}
        - category: string
        - name: string
        - quantity: number
        - unit: string
        - amount: number
        - description: string
        - date: timestamp
        - yearMonth: string (YYYY-MM format)
        - day: number

    /summaries/
      {yearMonth}
        - totalAmount: number
        - categoryBreakdown: {
            [category: string]: number
          }
        - expenseCount: number
        - avgPerDay: number
```

### Collections

1. **expenses**: Individual expense records
   - Optimized for querying by date and category
   - Each expense is a separate document for better scalability
   - Uses composite indexes for efficient filtering and sorting

2. **summaries**: Monthly aggregated data
   - Pre-calculated summaries for faster dashboard loading
   - Automatically updated when expenses are added
   - Indexed by yearMonth for quick access

### Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "expenses",
      "fields": [
        { "fieldPath": "yearMonth", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "expenses",
      "fields": [
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "amount", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wallet-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project
   - Enable Firestore and Authentication
   - Copy your Firebase config

4. **Environment Setup**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_API_BASE_URL=your_api_base_url
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Deploy Firestore Indexes**
   ```bash
   firebase deploy --only firestore:indexes
   ```

## Data Migration

If you need to migrate from an older schema:

1. **Run migration script**
   ```bash
   npm run migrate
   ```

2. **Validate migration**
   ```bash
   npm run validate-migration
   ```

## Project Structure

```
├── app/                  # Next.js app directory
│   ├── dashboard/       # Dashboard pages
│   └── layout.tsx      # Root layout
├── components/          # React components
├── lib/                 # Utility functions
│   ├── dashboard-helpers.ts
│   └── expense-helpers.ts
├── scripts/            # Migration scripts
└── public/             # Static assets
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details 