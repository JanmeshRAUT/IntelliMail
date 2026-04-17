# MongoDB Integration Guide for IntelliMail

## Overview

IntelliMail now uses **MongoDB with Mongoose** to persistently store all email security analysis results, threat logs, and user preferences. This enables:

✅ **Persistent Analysis History** - All threat analyses are saved and queryable  
✅ **Threat Tracking** - Track threats over time and identify patterns  
✅ **User Analytics** - Generate reports on threat types, severity, and trends  
✅ **Trusted Sender Lists** - Manage whitelisted domains per user  
✅ **Batch Operations** - Query multiple analyses across threads  

---

## Quick Start

### 1. **Start MongoDB Container**

MongoDB is included in `docker-compose.yml`. To start:

```bash
docker-compose up -d
```

This will:
- Start MongoDB on `mongodb:27017`
- Create database `intellimail` with admin credentials
- Create a persistent volume `mongodb_data`

### 2. **Install Dependencies**

```bash
npm install
```

Mongoose is now in `package.json` and will be installed automatically.

### 3. **Configure Environment**

Copy `.env.example` to `.env` and update:

```env
MONGODB_URI=mongodb://admin:password@mongodb:27017/intellimail?authSource=admin
MONGO_USER=admin
MONGO_PASSWORD=password
```

### 4. **Start Server**

```bash
npm run dev
```

The server will:
- Connect to MongoDB on startup
- Initialize all collections and indexes
- Print `✓ MongoDB connected successfully`

---

## Database Schema

### **Users** Collection
Stores user profiles and preferences.

```typescript
{
  googleId: string      // OAuth ID
  email: string         // User email
  name: string          // Display name
  picture?: string      // Profile picture URL
  trustedSenders: []    // Whitelisted email addresses
  createdAt: Date
  updatedAt: Date
}
```

### **ThreadAnalysis** Collection
Stores threat analysis results for email threads.

```typescript
{
  userId: string        // User ID
  threadId: string      // Gmail thread ID
  emails: []            // Array of EmailSecurityAnalysis
  overallRisk: number   // 0-100 risk score
  overallRiskLevel: "Low" | "Medium" | "High"
  attackType?: string   // Phishing, Spam, etc.
  createdAt: Date
  updatedAt: Date
}
```

### **ThreatLog** Collection
Detailed log of detected threats.

```typescript
{
  userId: string
  threadId: string
  emailId: string
  threatType: string    // "Phishing", "Spam", "Malware", etc.
  severity: "Low" | "Medium" | "High"
  description: string
  senderEmail: string
  detectedAt: Date
}
```

### **AnalysisHistory** Collection
Maintains historical versions of thread analyses.

```typescript
{
  userId: string
  threadId: string
  analysisResult: ThreadAnalysis
  timestamp: Date
}
```

---

## API Endpoints

### **Analysis Endpoints**

**Save & retrieve thread analysis:**

```bash
POST /api/security/analyze-thread
  { thread, userId }  // userId is optional but recommended for DB save

GET /api/analyses/:userId
  // Get all analyses for a user

GET /api/analyses/:userId/:threadId
  // Get analysis history for specific thread
```

### **Analytics & Threats**

```bash
GET /api/analytics/:userId
  // Returns: totalAnalyses, highRiskThreads, threatsByType, etc.

GET /api/threats/high-risk/:userId
  // Get all High-severity threats

GET /api/threats/:userId/since/:hours
  // Get threats detected in last N hours (e.g., /threats/:userId/since/24)
```

### **Trusted Senders**

```bash
POST /api/trusted-senders/:userId
  { senderEmail: "trusted@example.com" }

GET /api/trusted-senders/:userId
  // Get whitelisted senders for user
```

---

## Usage Examples

### **JavaScript/Frontend**

```javascript
// Save analysis when user scans emails
const response = await fetch('/api/security/analyze-thread', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    thread: { threadId, emails: [...] },
    userId: currentUser.id
  })
});

// Fetch user's threat analytics
const analytics = await fetch(`/api/analytics/${userId}`).then(r => r.json());
console.log(`High-risk threads: ${analytics.data.highRiskThreads}`);

// Add trusted sender
await fetch(`/api/trusted-senders/${userId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ senderEmail: 'boss@company.com' })
});
```

---

## Database Management

### **View MongoDB Data**

```bash
# Connect to MongoDB container
docker exec -it intellimail-mongodb mongosh -u admin -p password

# Switch to intellimail database
use intellimail

# View collections
show collections

# Query analyses
db.threadanalyses.find({ userId: "google-123" }).pretty()

# Count threats by severity
db.threatlogs.aggregate([
  { $group: { _id: "$severity", count: { $sum: 1 } } }
])
```

### **Backup Database**

```bash
# Backup to file
docker exec intellimail-mongodb mongodump --archive=/data/backup.archive

# Restore from backup
docker exec intellimail-mongodb mongorestore --archive=/data/backup.archive
```

### **Clean Old Data**

```bash
# Delete analyses older than 90 days (call from backend)
await dbService.deleteOldAnalyses(userId, 90);
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | Full MongoDB connection string | `mongodb://admin:pass@localhost:27017/intellimail?authSource=admin` |
| `MONGO_USER` | MongoDB username | `admin` |
| `MONGO_PASSWORD` | MongoDB password | `password` |
| `NODE_ENV` | Environment mode | `production` or `development` |
| `APP_URL` | Server URL for OAuth callbacks | `http://localhost:3000` |

---

## Troubleshooting

### **MongoDB Connection Failed**

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# View MongoDB logs
docker logs intellimail-mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### **Mongoose Schema Validation Errors**

Ensure all required fields are provided when saving analyses:
- ✅ `userId`, `threadId`, `overallRisk`, `overallRiskLevel` are required

### **Slow Queries**

Check indexes are created:
```javascript
db.threadanalyses.getIndexes()
// Should show indexes on: userId, threadId, createdAt
```

---

## Next Steps

1. **Update Frontend Components** to pass `userId` when calling `/api/security/analyze-thread`
2. **Add Analytics Dashboard** to display `GET /api/analytics/:userId` data
3. **Create Trusted Sender UI** to manage `/api/trusted-senders/:userId`
4. **Implement Email Header Validation** (SPF/DKIM/DMARC) module as mentioned in recommendations

---

## Support

For issues or questions:
- Check `src/lib/dbService.ts` for available DB operations
- Review `src/lib/dbModels.ts` for schema definitions
- Check MongoDB connection in `src/lib/db.ts`
