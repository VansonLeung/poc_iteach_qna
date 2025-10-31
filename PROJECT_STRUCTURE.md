# Project Structure Documentation

## Overview

This document provides a detailed breakdown of the iTeach Q&A Platform project structure.

## Directory Structure

```
poc_iteach_qna/
│
├── server/                          # Backend Node.js/Express Application
│   ├── src/
│   │   ├── database/
│   │   │   ├── index.js            # Database connection and initialization
│   │   │   ├── schema.js           # Complete database schema with all tables
│   │   │   └── seed.js             # Database seeding script with sample data
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT authentication & authorization middleware
│   │   │   └── errorHandler.js    # Global error handling middleware
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js             # Authentication routes (login, register, me)
│   │   │   ├── activities.js      # Activity CRUD routes with versioning
│   │   │   ├── activityElements.js # Activity element routes (nested support)
│   │   │   ├── questions.js        # Question routes with inheritance
│   │   │   ├── submissions.js      # User submission routes
│   │   │   └── submissionAnswers.js # Submission answer routes
│   │   │
│   │   ├── utils/
│   │   │   └── crypto.js           # Password hashing & JWT utilities
│   │   │
│   │   └── index.js                # Express server entry point
│   │
│   ├── .env.example                # Environment variables template
│   ├── .env                        # Environment variables (gitignored)
│   ├── .gitignore                  # Git ignore rules
│   └── package.json                # Server dependencies and scripts
│
├── client/                          # Frontend React Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Layout.jsx      # Main app layout with sidebar
│   │   │   │   └── ProtectedRoute.jsx # Route protection component
│   │   │   │
│   │   │   └── ui/                 # shadcn/ui components
│   │   │       ├── button.jsx
│   │   │       ├── card.jsx
│   │   │       ├── input.jsx
│   │   │       └── label.jsx
│   │   │
│   │   ├── lib/
│   │   │   ├── api.js              # Axios API client with all endpoints
│   │   │   └── utils.js            # Utility functions (cn, etc.)
│   │   │
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx       # Login page
│   │   │   │   └── Register.jsx    # Registration page
│   │   │   │
│   │   │   ├── Admin/
│   │   │   │   ├── ActivityList.jsx        # List all activities
│   │   │   │   ├── ActivityBuilder.jsx     # Create/edit activities
│   │   │   │   ├── QuestionLibrary.jsx     # Question library view
│   │   │   │   └── QuestionBuilder.jsx     # Create/edit questions
│   │   │   │
│   │   │   └── User/
│   │   │       ├── Dashboard.jsx           # User dashboard
│   │   │       ├── ActivityTaking.jsx      # Take activity interface
│   │   │       └── SubmissionHistory.jsx   # View submission history
│   │   │
│   │   ├── store/
│   │   │   └── authStore.js        # Zustand auth state management
│   │   │
│   │   ├── App.jsx                 # Main app component with routing
│   │   ├── main.jsx                # React entry point
│   │   └── index.css               # Global styles with Tailwind
│   │
│   ├── index.html                  # HTML template
│   ├── vite.config.js              # Vite configuration
│   ├── tailwind.config.js          # Tailwind CSS configuration
│   ├── postcss.config.js           # PostCSS configuration
│   ├── .env.example                # Environment variables template
│   ├── .gitignore                  # Git ignore rules
│   └── package.json                # Client dependencies and scripts
│
├── .gitignore                      # Root git ignore
├── package.json                    # Root package with helper scripts
├── README.md                       # Main documentation
├── QUICKSTART.md                   # Quick start guide
└── PROJECT_STRUCTURE.md            # This file
```

## Database Schema

### Core Tables

1. **users** - System users with role-based access
2. **activities** - Learning activities
3. **activity_versions** - Activity version history
4. **activity_permissions** - Role/user-based permissions
5. **questions** - Reusable questions with HTML body
6. **question_versions** - Question version history
7. **question_permissions** - Question access control
8. **question_interactive_elements** - Interactive elements within questions
9. **activity_elements** - Activity structure (sections/questions)
10. **activity_element_versions** - Element version history
11. **activity_element_permissions** - Element access control
12. **user_activity_submissions** - User submissions
13. **user_activity_submission_versions** - Submission version history
14. **user_activity_submission_permissions** - Submission access control
15. **user_activity_submission_answers** - Individual answers
16. **user_activity_submission_answer_versions** - Answer version history
17. **user_activity_submission_answer_permissions** - Answer access control

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Activities
- `GET /api/activities` - List activities
- `POST /api/activities` - Create activity
- `GET /api/activities/:id` - Get activity details
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id/archive` - Archive activity
- `GET /api/activities/:id/versions` - Get version history

### Activity Elements
- `GET /api/activity-elements` - List elements
- `POST /api/activity-elements` - Create element
- `GET /api/activity-elements/:id` - Get element with nested children
- `PUT /api/activity-elements/:id` - Update element
- `DELETE /api/activity-elements/:id/archive` - Archive element

### Questions
- `GET /api/questions` - List questions
- `POST /api/questions` - Create question
- `GET /api/questions/:id` - Get question (with inheritance resolution)
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id/archive` - Archive question
- `GET /api/questions/:id/versions` - Get version history

### Submissions
- `GET /api/submissions` - List submissions
- `POST /api/submissions` - Create submission
- `GET /api/submissions/:id` - Get submission with answers
- `PUT /api/submissions/:id` - Update submission
- `DELETE /api/submissions/:id/archive` - Archive submission
- `GET /api/submissions/:id/versions` - Get version history

### Submission Answers
- `GET /api/submission-answers` - List answers
- `POST /api/submission-answers` - Create answer
- `GET /api/submission-answers/:id` - Get answer
- `PUT /api/submission-answers/:id` - Update answer
- `DELETE /api/submission-answers/:id/archive` - Archive answer
- `GET /api/submission-answers/:id/versions` - Get version history

## Frontend Routes

### Public Routes
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (All Users)
- `/dashboard` - Main dashboard
- `/activities/:id` - Take activity
- `/submissions` - Submission history

### Admin/Teacher Only Routes
- `/admin/activities` - Activity management
- `/admin/activities/new` - Create activity
- `/admin/activities/:id/edit` - Edit activity
- `/admin/questions` - Question library
- `/admin/questions/new` - Create question
- `/admin/questions/:id/edit` - Edit question

## Key Features Implementation

### 1. Versioning System
- Every update to activities, questions, and submissions increments version number
- Complete snapshot saved in `*_versions` tables
- Version history accessible via API

### 2. Permissions System
- Role-based: admin, teacher, student
- Permissions stored in `*_permissions` tables
- Supports both user-level and role-level permissions

### 3. Question Inheritance
- Questions can have `parent_question_id`
- Child questions inherit HTML body from parent
- Override capability supported
- Recursive inheritance resolution

### 4. Nested Activity Elements
- Unlimited nesting depth
- Elements can be "section" or "question" type
- Sections act as containers
- Order maintained via `order_index`

### 5. Interactive Elements
- HTML with special data attributes:
  - `data-element-uuid` - Unique identifier
  - `data-element-type` - Type (text_input, textarea, radio, checkbox, etc.)
  - `data-element-label` - Label for the element
- Extracted and stored in `question_interactive_elements`
- Referenced in submission answers

## State Management

### Zustand Stores

**authStore.js**
```javascript
{
  user: {...},           // Current user object
  token: "...",          // JWT token
  isAuthenticated: bool, // Auth status
  setAuth(),            // Set user and token
  logout(),             // Clear auth state
  updateUser()          // Update user info
}
```

## Security Features

1. **JWT Authentication**
   - Tokens stored in localStorage
   - Included in all API requests via Authorization header
   - Auto-logout on 401 responses

2. **Password Hashing**
   - bcryptjs with salt rounds
   - Passwords never stored in plain text

3. **Role-Based Access Control**
   - Middleware checks user role
   - Route-level protection
   - Component-level protection

4. **SQL Injection Prevention**
   - Prepared statements via better-sqlite3
   - Input validation with express-validator

## Code Organization Principles

1. **Modularity**: Each route, component, and feature is self-contained
2. **Separation of Concerns**: Database, business logic, and presentation are separated
3. **Reusability**: Components and utilities are designed for reuse
4. **Maintainability**: Clear naming conventions and file structure
5. **Scalability**: Architecture supports future enhancements

## Dependencies

### Server
- express - Web framework
- better-sqlite3 - SQLite database
- jsonwebtoken - JWT auth
- bcryptjs - Password hashing
- express-validator - Input validation
- cors - CORS support
- helmet - Security headers
- morgan - Logging

### Client
- react - UI library
- react-router-dom - Routing
- axios - HTTP client
- zustand - State management
- tailwindcss - Styling
- shadcn/ui - Component library
- lucide-react - Icons
- date-fns - Date formatting

## Build and Deployment

### Development
```bash
npm run dev              # Run both client and server
npm run dev:client       # Run client only
npm run dev:server       # Run server only
```

### Production Build
```bash
cd client
npm run build            # Creates dist/ folder

cd ../server
npm start               # Run production server
```

## Testing Strategy (Future)

1. **Backend**: Jest + Supertest for API testing
2. **Frontend**: Vitest + React Testing Library
3. **E2E**: Playwright or Cypress
4. **Coverage**: Aim for 80%+ coverage

## Future Enhancements

See README.md for complete list of planned features.
