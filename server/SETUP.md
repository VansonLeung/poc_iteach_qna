# Server Setup with Sequelize

## Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Start the Server
The database will auto-sync when you start:
```bash
npm run dev
```

You should see:
```
✓ Database synchronized successfully
✓ Database connection established
🎓 iTeach Q&A Platform - Server Running (Sequelize)
Port: 3001
```

### 3. Seed Sample Data
```bash
npm run db:seed
```

You should see:
```
✅ Database seeded successfully with Sequelize!

Sample Credentials:
- Admin: admin@example.com / admin123
- Teacher: teacher@example.com / teacher123
- Student: student@example.com / student123
```

### 4. Test the API

**Register a new user:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "firstName": "New",
    "lastName": "User",
    "role": "student"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

**Get current user (replace TOKEN):**
```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## What's Working

✅ **Authentication Routes (Sequelize)**
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

⏳ **Other Routes (Still using raw SQL)**
- All activity routes
- All question routes
- All submission routes
- All activity element routes

## Database Location

SQLite database: `./database.sqlite`

You can view it with:
```bash
sqlite3 database.sqlite
.tables
SELECT * FROM users;
.quit
```

## Troubleshooting

### Error: "Cannot find module 'sequelize'"
**Solution:**
```bash
npm install
```

### Error: Database sync fails
**Solution:** Delete the database and restart:
```bash
rm database.sqlite
npm run dev
```

### Error: Port 3001 already in use
**Solution:** Change port in `.env`:
```
PORT=3002
```

### Seed fails with "User already exists"
**Solution:** The database already has data. Either:
1. Delete the database: `rm database.sqlite`
2. Or skip seeding if you already have data

## Next Steps

1. ✅ Server is running with Sequelize
2. ✅ Auth endpoints work perfectly
3. ⏳ Migrate remaining routes following `SEQUELIZE_MIGRATION_GUIDE.md`
4. ⏳ Test all endpoints as you migrate them

## File Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js      # Sequelize connection
│   │   └── database.cjs     # CLI config
│   ├── models/              # ✅ All 12 models ready
│   │   ├── User.js
│   │   ├── Activity.js
│   │   ├── ActivityVersion.js
│   │   ├── Question.js
│   │   ├── QuestionVersion.js
│   │   ├── ActivityElement.js
│   │   ├── ActivityElementVersion.js
│   │   ├── UserActivitySubmission.js
│   │   ├── UserActivitySubmissionVersion.js
│   │   ├── UserActivitySubmissionAnswer.js
│   │   ├── UserActivitySubmissionAnswerVersion.js
│   │   ├── QuestionInteractiveElement.js
│   │   └── index.js         # Model associations
│   ├── routes/
│   │   ├── auth.js          # ✅ Sequelize
│   │   ├── activities.js    # ⏳ Raw SQL
│   │   ├── questions.js     # ⏳ Raw SQL
│   │   └── ...
│   └── database/seeders/
│       └── seed.js          # ✅ Sequelize
├── database.sqlite          # Auto-created
├── .env
└── package.json

✅ = Migrated to Sequelize
⏳ = Still using raw SQL (needs migration)
```

## Checking What's Using What

**Sequelize routes:**
- Look for `import { User, Activity } from '../models/index.js'`
- Look for `await User.findOne()`

**Raw SQL routes:**
- Look for `import db from '../database/index.js'`
- Look for `db.prepare('SELECT ...')`

## Success!

If you see the server banner and can login with the demo credentials, you're all set! The Sequelize foundation is ready and the auth system is fully migrated.
