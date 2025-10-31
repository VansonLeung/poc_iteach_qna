# Quick Start Guide

Get up and running with the iTeach Q&A Platform in 5 minutes!

## Prerequisites

- Node.js (v18 or higher)
- npm

## Step 1: Install Dependencies

```bash
# Install all dependencies (root, server, and client)
npm run install:all
```

## Step 2: Setup Database

```bash
# Seed the database with sample data
cd server
npm run db:seed
cd ..
```

## Step 3: Start the Application

```bash
# Start both client and server
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Step 4: Login

Use one of the demo accounts:

### Admin Account
- Email: `admin@example.com`
- Password: `admin123`
- Access: Full access to all features

### Teacher Account
- Email: `teacher@example.com`
- Password: `teacher123`
- Access: Create/edit activities and questions, view all submissions

### Student Account
- Email: `student@example.com`
- Password: `student123`
- Access: Take activities and view own submissions

## What's Next?

### As an Admin/Teacher:
1. Go to **Activities** in the sidebar
2. Click **"New Activity"** to create a learning activity
3. Go to **Questions** to create reusable questions
4. Use the Question Builder to create interactive questions with inputs, checkboxes, radio buttons, etc.

### As a Student:
1. Browse available activities on the **Dashboard**
2. Click **"Start Activity"** to begin
3. Answer the questions
4. Click **"Submit Activity"** when done
5. View your submissions in **"My Submissions"**

## Troubleshooting

### Port Already in Use

If port 3001 or 5173 is already in use:

**Server:**
```bash
# Edit server/.env and change PORT
PORT=3002
```

**Client:**
```bash
# Edit client/vite.config.js and change server.port
server: {
  port: 5174
}
```

### Database Issues

If you encounter database errors:

```bash
# Delete the database and re-seed
cd server
rm database.sqlite
npm run db:seed
cd ..
```

### Dependencies Issues

```bash
# Clean install
rm -rf node_modules server/node_modules client/node_modules
npm run install:all
```

## Sample Data Included

After seeding, you'll have:
- 3 Users (admin, teacher, student)
- 3 Sample Questions with interactive elements
- 1 Sample Activity ("Introduction to JavaScript")
- Multiple activity elements (sections and questions)

## Key Features to Try

1. **Question Builder**: Create questions with rich HTML and interactive elements
2. **Activity Builder**: Organize questions into structured learning activities
3. **Nested Sections**: Create sections that contain other sections and questions
4. **Version History**: Every edit is tracked and can be viewed
5. **Question Inheritance**: Create question variations by inheriting from existing questions
6. **Role-Based Access**: Different features for admin, teacher, and student roles

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the API endpoints
- Create your own questions and activities
- Build a custom learning path

Enjoy building with iTeach Q&A Platform!
