# iTeach Q&A Platform - POC

An interactive Question-Answer Learning/Online Training Platform built with React, Node.js, Express, and SQLite.

## Features

### Core Functionality
- **Interactive Question Builder**: Create rich HTML questions with interactive elements (text inputs, textareas, radio buttons, checkboxes)
- **Activity Management**: Build and manage learning activities with nested sections and questions
- **User Submissions**: Students can complete activities and submit answers
- **Role-Based Access Control**: Admin, Teacher, and Student roles with appropriate permissions
- **Version Control**: Full version history for activities, questions, and submissions
- **Question Inheritance**: Questions can inherit from parent questions with override capabilities

### Technical Features
- RESTful API with Express.js
- JWT-based authentication
- SQLite database with full versioning support
- React frontend with shadcn/ui components
- Responsive design with Tailwind CSS
- Unlimited nesting support for activity elements

## Project Structure

```
poc_iteach_qna/
├── server/                 # Backend Node.js/Express application
│   ├── src/
│   │   ├── database/      # Database schema and connection
│   │   ├── middleware/    # Auth and error handling middleware
│   │   ├── routes/        # API route handlers
│   │   ├── utils/         # Utility functions
│   │   └── index.js       # Server entry point
│   └── package.json
│
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/          # API client and utilities
│   │   ├── pages/        # Page components
│   │   ├── store/        # State management (Zustand)
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   └── package.json
│
└── package.json           # Root package.json for scripts
```

## Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

## Installation

### 1. Install Root Dependencies

```bash
npm install
```

### 2. Install Server Dependencies

```bash
cd server
npm install
cd ..
```

### 3. Install Client Dependencies

```bash
cd client
npm install
cd ..
```

## Running the Application

### Option 1: Run Both Client and Server Concurrently (Recommended)

```bash
npm run dev
```

This will start:
- Server on http://localhost:3001
- Client on http://localhost:5173

### Option 2: Run Separately

**Terminal 1 - Server:**
```bash
npm run dev:server
```

**Terminal 2 - Client:**
```bash
npm run dev:client
```

## Database Setup

### Seed the Database with Sample Data

```bash
cd server
npm run db:seed
```

This will create:
- 3 sample users (admin, teacher, student)
- 3 sample questions with interactive elements
- 1 sample activity with nested elements

### Demo Credentials

After seeding, you can login with:

**Admin Account:**
- Email: `admin@example.com`
- Password: `admin123`

**Teacher Account:**
- Email: `teacher@example.com`
- Password: `teacher123`

**Student Account:**
- Email: `student@example.com`
- Password: `student123`

## API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "student",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer {token}
```

### Activity Endpoints

#### Get All Activities
```http
GET /activities?status=active&search=javascript&page=1&limit=20
Authorization: Bearer {token}
```

#### Get Activity by ID
```http
GET /activities/:id
Authorization: Bearer {token}
```

#### Create Activity
```http
POST /activities
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Introduction to JavaScript",
  "description": "Learn JavaScript basics",
  "tags": ["javascript", "beginner"]
}
```

#### Update Activity
```http
PUT /activities/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["javascript", "intermediate"]
}
```

#### Archive Activity
```http
DELETE /activities/:id/archive
Authorization: Bearer {token}
```

#### Get Activity Versions
```http
GET /activities/:id/versions
Authorization: Bearer {token}
```

### Question Endpoints

#### Get All Questions
```http
GET /questions?status=active&search=data&tags=javascript&page=1&limit=20
Authorization: Bearer {token}
```

#### Get Question by ID
```http
GET /questions/:id?resolveInheritance=true
Authorization: Bearer {token}
```

#### Create Question
```http
POST /questions
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "What is JavaScript?",
  "bodyHtml": "<div><p>Explain JavaScript</p><input data-element-uuid='uuid-here' data-element-type='text_input' /></div>",
  "parentQuestionId": null,
  "tags": ["javascript", "basics"]
}
```

#### Update Question
```http
PUT /questions/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Question Title",
  "bodyHtml": "<div>Updated HTML</div>",
  "tags": ["javascript"]
}
```

#### Archive Question
```http
DELETE /questions/:id/archive
Authorization: Bearer {token}
```

### Activity Element Endpoints

#### Get All Activity Elements
```http
GET /activity-elements?activityId=uuid&elementType=question&status=active
Authorization: Bearer {token}
```

#### Create Activity Element
```http
POST /activity-elements
Authorization: Bearer {token}
Content-Type: application/json

{
  "activityId": "activity-uuid",
  "elementType": "question",
  "questionId": "question-uuid",
  "orderIndex": 0,
  "parentElementId": null,
  "tags": []
}
```

### Submission Endpoints

#### Get All Submissions
```http
GET /submissions?activityId=uuid&userId=uuid&status=submitted
Authorization: Bearer {token}
```

#### Get Submission by ID
```http
GET /submissions/:id
Authorization: Bearer {token}
```

#### Create Submission
```http
POST /submissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "activityId": "activity-uuid"
}
```

#### Update Submission Status
```http
PUT /submissions/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "submitted"
}
```

### Submission Answer Endpoints

#### Create Submission Answer
```http
POST /submission-answers
Authorization: Bearer {token}
Content-Type: application/json

{
  "submissionId": "submission-uuid",
  "questionId": "question-uuid",
  "elementUuid": "element-uuid",
  "answerData": {
    "value": "User's answer here"
  }
}
```

#### Update Submission Answer
```http
PUT /submission-answers/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "answerData": {
    "value": "Updated answer"
  },
  "status": "submitted"
}
```

## Frontend Pages

### Public Pages
- `/login` - User login
- `/register` - User registration

### User Pages
- `/dashboard` - Main dashboard showing available activities and recent submissions
- `/activities/:id` - Take an activity (answer questions)
- `/submissions` - View submission history

### Admin/Teacher Pages
- `/admin/activities` - List and manage all activities
- `/admin/activities/new` - Create new activity
- `/admin/activities/:id/edit` - Edit activity
- `/admin/questions` - Question library
- `/admin/questions/new` - Create new question
- `/admin/questions/:id/edit` - Edit question

## Data Model

### Key Entities

1. **Users** - System users with role-based access
2. **Activities** - Learning activities containing elements
3. **Activity Elements** - Sections or questions within activities (supports unlimited nesting)
4. **Questions** - Reusable questions with HTML body and interactive elements
5. **Question Interactive Elements** - Tracked interactive elements within questions
6. **User Activity Submissions** - User attempts at activities
7. **User Activity Submission Answers** - Individual answers to questions

### Versioning
All main entities (Activities, Activity Elements, Questions, Submissions, Answers) support full version history:
- Each update increments the version number
- Complete snapshots are saved in version tables
- Version history can be retrieved via API

### Permissions
Role-based permissions:
- **Admin**: Full access to all features
- **Teacher**: Can create/edit activities and questions, view all submissions
- **Student**: Can view activities and submit answers, view own submissions

## Environment Variables

### Server (.env)
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
DATABASE_PATH=./database.sqlite
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### Client
```env
VITE_API_URL=http://localhost:3001/api
```

## Development Notes

### Question HTML Structure
Questions use HTML with special data attributes for interactive elements:

```html
<div class="question-content">
  <h3>Your Question Title</h3>
  <p>Question description...</p>

  <!-- Text Input -->
  <input
    type="text"
    data-element-uuid="unique-uuid-here"
    data-element-type="text_input"
    data-element-label="Your Answer"
    placeholder="Type here..."
  />

  <!-- Radio Buttons -->
  <label>
    <input
      type="radio"
      name="group1"
      data-element-uuid="unique-uuid-here"
      data-element-type="radio"
      data-element-label="Option 1"
      value="option1"
    />
    Option 1
  </label>

  <!-- Checkboxes -->
  <label>
    <input
      type="checkbox"
      data-element-uuid="unique-uuid-here"
      data-element-type="checkbox"
      data-element-label="Choice 1"
      value="choice1"
    />
    Choice 1
  </label>
</div>
```

### Nested Activity Elements
Activity elements can be nested infinitely:
- An activity can have multiple top-level elements
- Each element can be a "section" (container) or "question"
- Sections can contain other sections or questions
- Order is maintained via `order_index` field

## Future Enhancements

- [ ] Rich text editor (TipTap) integration for question builder
- [ ] Drag-and-drop activity element ordering
- [ ] File upload support for questions and answers
- [ ] Grading and feedback system
- [ ] Analytics dashboard
- [ ] Export submissions to CSV/PDF
- [ ] Email notifications
- [ ] Real-time collaboration
- [ ] Mobile app

## Tech Stack

### Backend
- Node.js & Express.js
- SQLite (better-sqlite3)
- JWT for authentication
- bcryptjs for password hashing

### Frontend
- React 18
- Vite
- React Router v6
- Zustand (state management)
- Axios (HTTP client)
- Tailwind CSS
- shadcn/ui components
- Lucide React (icons)
- date-fns (date formatting)

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
