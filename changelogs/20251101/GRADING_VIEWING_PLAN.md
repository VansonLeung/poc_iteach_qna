# Grading & Scoring Viewing Feature Plan

## Design Decisions & Assumptions

### ✅ Confirmed Approach

1. **Scoring & Grading**
   - ✅ Auto-grade objective questions (multiple choice, checkboxes, short answer) immediately upon submission
   - ✅ Essay questions remain pending until admin manually grades
   - ✅ Use existing `autoGrader.js` logic and enhance as needed

2. **Score Visibility**
   - ✅ Students see partial scores immediately for auto-graded questions
   - ✅ Display "X questions pending review" indicator for ungraded essays
   - ✅ Admin can "release" essay scores when done grading (scores visible immediately after admin grades)
   - ✅ Students can always see their own answers and auto-graded scores

3. **Partial Grading Display**
   - ✅ Show format: "75/100 points (7/10 questions graded, 3 pending)"
   - ✅ Percentage calculated only on graded questions with note
   - ✅ Full percentage shown after all questions graded

4. **Multiple Submissions**
   - ✅ Students can submit multiple attempts per activity (unlimited by default)
   - ✅ Each submission stored separately with unique ID and timestamp
   - ✅ "Latest submission" = most recent `submitted_at` timestamp
   - ✅ Display shows: **Best score prominently** + full history accessible

5. **Submission Versioning**
   - ✅ Use latest version of each answer within a submission
   - ✅ `UserActivitySubmissionAnswerVersion` tracks edit history
   - ✅ Score calculated on current/latest version only

6. **Privacy & Visibility**
   - ✅ Students see correct answers after submission (for objective questions)
   - ✅ Students see detailed rubric breakdown after grading
   - ❌ Students CANNOT see other students' scores (even anonymized) - no class rank
   - ❌ No class average visible to students (admin only)
   - ✅ Admin sees all student data and analytics

7. **Activity Reports Scope**
   - ✅ Show ALL students enrolled in system (or class if implemented later)
   - ✅ Include "Not Started" status for students with no submissions
   - ✅ Default view: Latest submission per student
   - ✅ Filterable by status: All / Submitted / Graded / Not Started
   - ⏳ Class/Section filtering: Not in MVP, but structure allows future addition

8. **Rubric Details**
   - ✅ Students see full rubric breakdown:
     - Each criterion name
     - Points earned / possible per criterion
     - Selected level descriptor text
   - ✅ Admin can add general written feedback/comments per essay question
   - ✅ Display both structured rubric scores + free-form comments

9. **Export Format (CSV)**
   - ✅ Columns: Student Name, Email, Score (points), Score (%), Submission Date, Status, Time Spent
   - ✅ Optional: Individual question scores in separate columns
   - ✅ Generate filename: `ActivityName_Report_YYYY-MM-DD.csv`

10. **Expected Scale (MVP)**
    - Up to 100 students per activity
    - Up to 50 questions per activity
    - APIs paginated for future scalability
    - Optimize for <2 second load times

11. **Historical Data Migration**
    - ✅ Create migration script to calculate scores for existing submissions
    - ✅ Run on deployment to backfill `total_score`, `max_possible_score`, `score_percentage`
    - ✅ Mark existing essay questions as "pending" grading status

---

## Current State Analysis

### What Exists:
- ✅ Students can submit activity answers
- ✅ Submissions are stored in `user_activity_submissions` table
- ✅ Individual answers stored in `user_activity_submission_answers` table
- ✅ Grading system exists in backend (`/server/src/utils/autoGrader.js`)
- ✅ Question scoring configurations exist (`QuestionScoring` model)
- ✅ Rubrics system exists for essay questions
- ✅ Admin grading interface exists (`/client/src/pages/Admin/GradingInterface.jsx`)

### What's Missing:
- ❌ Students cannot view their scores after submission
- ❌ Students cannot see which questions they got right/wrong
- ❌ Students cannot see detailed feedback on their submissions
- ❌ Admin dashboard to view all students' submissions by activity
- ❌ Admin dashboard to view individual student's submission history
- ❌ Aggregated scoring/analytics views

---

## Feature Requirements

### 1. Student Score Viewing
**User Story**: As a student, I want to see my scores for each submission so I can understand my performance.

**Acceptance Criteria**:
- [ ] Student can view list of all their submissions from "My Submissions" page
- [ ] Each submission card/row shows:
  - Activity name
  - Submission date/time
  - **Best score highlighted** (e.g., "Best: 95/100")
  - **Latest attempt score** (if different from best)
  - Overall score with format: "85/100 points (85%)"
  - Status badges:
    - "Fully Graded" (green) - all questions scored
    - "Partially Graded" (yellow) - some pending
    - "Pending Review" (gray) - all essays pending
  - Number of questions answered vs total
  - Number of attempts (e.g., "Attempt 3 of 3")
- [ ] Click "View Details" to see detailed submission breakdown
- [ ] Detailed view shows:
  - Activity title and description
  - Submission timestamp
  - Overall score with visual progress bar
  - Breakdown: "7 of 10 questions graded (3 essays pending)"
  - Question-by-question list with:
    - Question number and text
    - Question type indicator
    - Student's answer (formatted appropriately)
    - **Correct answer shown** (for objective questions)
    - Points earned / possible points (e.g., "8/10 points")
    - Status: "Correct" ✓ / "Incorrect" ✗ / "Partial Credit" / "Pending Review"
    - For essay questions:
      - Rubric breakdown table (criterion, level selected, points)
      - Admin's written feedback/comments
      - "Pending Review" message if not yet graded
  - "View All Attempts" button to see submission history
  - "Back to My Submissions" navigation

### 2. Admin View - Individual Student Submissions
**User Story**: As an admin/teacher, I want to see all submissions from a specific student to track their progress.

**Acceptance Criteria**:
- [ ] Admin can access "Students" page from admin menu
- [ ] Students page shows table with all users (excluding admins):
  - Name (sortable)
  - Email
  - Total submissions across all activities
  - Average score across all submissions (%)
  - Best score achieved
  - Last activity date
  - "View Details" button
- [ ] Search/filter students by name or email
- [ ] Click student row to navigate to student detail page
- [ ] Student detail page (`/admin/students/:userId`) shows:
  - Student info header (name, email, registration date)
  - Summary statistics:
    - Total attempts across all activities
    - Average score
    - Best score
    - Activities completed (submitted at least once)
  - Submission history table:
    - Activity name (link to activity)
    - Attempt number
    - Submission date/time
    - Score (points and %)
    - Status (Fully Graded / Partially Graded / Pending)
    - "View/Grade" button
  - Chart: Score progression over time (line chart)
  - Filter by activity dropdown
  - Sort by date (newest first by default), score, activity
- [ ] Click "View/Grade" to open submission detail (same as student view + grading tools)
- [ ] Admin can add private notes/comments about student (not visible to student)

### 3. Admin View - Activity-Based Student Scores
**User Story**: As an admin/teacher, I want to see all students' latest submissions for each activity to evaluate class performance.

**Acceptance Criteria**:
- [ ] Admin can access "Activity Reports" page from admin menu
- [ ] Page shows:
  - Activity selector dropdown (searchable, shows all activities)
  - Selected activity title and description displayed prominently
- [ ] Summary statistics panel (top of page):
  - Total students in system
  - Submission rate: "45 of 60 students submitted (75%)"
  - Average score: "78.5%" with trend indicator (↑/↓ vs previous activity if available)
  - Median score: "82%"
  - Score range: "Min: 45%, Max: 98%"
  - Completion rate: Circular progress indicator
- [ ] Score distribution chart (histogram):
  - X-axis: Score ranges (0-59%, 60-69%, 70-79%, 80-89%, 90-100%)
  - Y-axis: Number of students
  - Color-coded bars (red, orange, yellow, light green, green)
- [ ] Student submissions data table:
  - Columns:
    - Student name (sortable, searchable)
    - Latest submission date (sortable)
    - Score (sortable, color-coded):
      - Red: <60%
      - Orange: 60-69%
      - Yellow: 70-79%
      - Light green: 80-89%
      - Green: ≥90%
    - Status badge (Fully Graded / Partially Graded / Pending / Not Started)
    - Number of attempts (e.g., "3 attempts")
    - Best score (if multiple attempts)
    - Time spent (calculated from start to submit)
    - Actions: "View" button
  - Shows ALL students including those who haven't started
  - "Not Started" students show empty score with gray status
- [ ] Filtering options:
  - Status: All / Submitted / Fully Graded / Partially Graded / Not Started
  - Score range slider: e.g., 70-100%
  - Search by student name
- [ ] Sorting: Click column headers to sort (default: latest submission date desc)
- [ ] Pagination: 25 students per page
- [ ] "Export to CSV" button:
  - Generates CSV with all filtered data
  - Filename format: `ActivityName_Report_2025-11-01.csv`
  - Includes columns: Name, Email, Score (Points), Score (%), Date, Status, Attempts, Time Spent
  - Optional: Checkbox to include individual question scores (expands columns)
- [ ] Click "View" button to open submission in new tab (or modal)
- [ ] Click student name to go to student detail page
- [ ] "Grade Pending Submissions" quick action button (opens grading interface filtered to this activity)

---

## Technical Implementation Plan

### Phase 1: Backend API Endpoints

#### Task 1.1: Student Submission History API
**File**: `/server/src/routes/submissions.js`

- [ ] Create `GET /api/submissions/my-submissions` endpoint
  - Returns all submissions for authenticated user
  - Includes activity details (name, description)
  - Includes calculated scores (total_score, max_possible_score, score_percentage)
  - Includes grading status (fully_graded, partially_graded, pending_review)
  - Groups by activity, shows all attempts with best score highlighted
  - Sorted by submission date (newest first)
  - Response format:
    ```json
    {
      "submissions": [
        {
          "id": "uuid",
          "activityId": "uuid",
          "activityName": "Intro to JavaScript",
          "submittedAt": "2025-11-01T10:30:00Z",
          "totalScore": 85,
          "maxPossibleScore": 100,
          "scorePercentage": 85.0,
          "gradingStatus": "partially_graded",
          "questionsGraded": 7,
          "totalQuestions": 10,
          "attemptNumber": 3,
          "isBestScore": true
        }
      ],
      "bestScores": { "activityId": 95 }
    }
    ```

- [ ] Create `GET /api/submissions/:submissionId/details` endpoint
  - Returns detailed submission with all answers and scores
  - Includes question text, student answer, correct answer (if applicable)
  - Includes points earned, max points per question
  - Includes rubric breakdown for essay questions
  - Includes admin feedback/comments
  - Response includes question type for proper rendering
  - Response format:
    ```json
    {
      "submission": {
        "id": "uuid",
        "activityId": "uuid",
        "activityName": "Intro to JavaScript",
        "activityDescription": "...",
        "submittedAt": "2025-11-01T10:30:00Z",
        "totalScore": 85,
        "maxPossibleScore": 100,
        "scorePercentage": 85.0,
        "gradingStatus": "partially_graded",
        "questionsGraded": 7,
        "totalQuestions": 10
      },
      "answers": [
        {
          "questionId": "uuid",
          "questionTitle": "What is JavaScript?",
          "questionType": "essay",
          "questionText": "...",
          "studentAnswer": "JavaScript is...",
          "correctAnswer": null,
          "pointsEarned": 8,
          "maxPoints": 10,
          "isGraded": true,
          "rubricScores": [
            { "criterion": "Clarity", "pointsEarned": 4, "maxPoints": 5, "levelDescription": "Clear" }
          ],
          "adminFeedback": "Good explanation, could be more detailed."
        }
      ]
    }
    ```

#### Task 1.2: Admin Submission Analytics APIs
**File**: `/server/src/routes/submissions.js` or new `/server/src/routes/analytics.js`

- [ ] Create `GET /api/admin/students` endpoint
  - Returns list of all non-admin users
  - Includes aggregate stats per student:
    - Total submissions count
    - Average score across all submissions
    - Best score achieved
    - Last activity date
  - Supports search by name/email (query param: `?search=john`)
  - Supports pagination (query params: `?page=1&limit=25`)
  - Requires admin authentication

- [ ] Create `GET /api/admin/students/:userId/submissions` endpoint
  - Returns all submissions for a specific student
  - Includes activity details, scores, dates, attempt numbers
  - Includes grading status for each submission
  - Optionally filter by activity (query param: `?activityId=uuid`)
  - Sorted by date (newest first)
  - Requires admin authentication

- [ ] Create `GET /api/admin/activities/:activityId/submissions` endpoint
  - Returns latest submission for each student for specified activity
  - Includes user details (name, email)
  - Includes score, status, submission date
  - Includes attempt count and best score (if multiple attempts)
  - Includes students who haven't submitted (status: "not_started")
  - Supports filtering (query params: `?status=fully_graded&minScore=70`)
  - Supports sorting (query param: `?sortBy=score&sortOrder=desc`)
  - Supports pagination
  - Response format:
    ```json
    {
      "activity": {
        "id": "uuid",
        "title": "Intro to JavaScript",
        "description": "..."
      },
      "submissions": [
        {
          "userId": "uuid",
          "userName": "John Doe",
          "userEmail": "john@example.com",
          "submissionId": "uuid",
          "submittedAt": "2025-11-01T10:30:00Z",
          "totalScore": 85,
          "maxPossibleScore": 100,
          "scorePercentage": 85.0,
          "gradingStatus": "fully_graded",
          "attemptCount": 3,
          "bestScore": 90,
          "timeSpentMinutes": 45
        },
        {
          "userId": "uuid2",
          "userName": "Jane Smith",
          "userEmail": "jane@example.com",
          "submissionId": null,
          "submittedAt": null,
          "totalScore": null,
          "status": "not_started"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 25,
        "total": 60,
        "pages": 3
      }
    }
    ```
  - Requires admin authentication

- [ ] Create `GET /api/admin/activities/:activityId/statistics` endpoint
  - Returns aggregate statistics for an activity
  - Calculates:
    - Total students in system
    - Number of students who submitted
    - Submission rate (percentage)
    - Average score (mean)
    - Median score
    - Min and max scores
    - Score distribution (counts per range: 0-59, 60-69, 70-79, 80-89, 90-100)
    - Average time spent
  - Response format:
    ```json
    {
      "totalStudents": 60,
      "submittedCount": 45,
      "submissionRate": 75.0,
      "averageScore": 78.5,
      "medianScore": 82.0,
      "minScore": 45,
      "maxScore": 98,
      "scoreDistribution": {
        "0-59": 5,
        "60-69": 8,
        "70-79": 12,
        "80-89": 15,
        "90-100": 5
      },
      "averageTimeMinutes": 42.3
    }
    ```
  - Requires admin authentication

#### Task 1.3: Scoring Calculation Enhancement
**File**: `/server/src/utils/autoGrader.js` or new `/server/src/utils/scoringService.js`

- [ ] Enhance auto-grading to immediately score objective questions on submission
  - Multiple choice: Exact match
  - Checkboxes: All correct options selected, no incorrect options
  - Short answer: Exact match or fuzzy match (case-insensitive, trim whitespace)
  - Store individual question scores in `question_scores` table

- [ ] Create `calculateSubmissionScore(submissionId)` function
  - Aggregates all question scores for a submission
  - Calculates:
    - `total_score`: Sum of all earned points
    - `max_possible_score`: Sum of all possible points
    - `score_percentage`: (total_score / max_possible_score) * 100
    - `grading_status`: 
      - "fully_graded" if all questions have scores
      - "partially_graded" if some questions scored, some pending
      - "pending_review" if no questions scored yet
    - `questions_graded_count`: Count of questions with scores
  - Updates `user_activity_submissions` table with calculated values
  - Returns calculated scores object

- [ ] Create trigger/hook to auto-calculate scores:
  - After submission is created (run auto-grader on objective questions)
  - After admin manually grades an essay (recalculate total)
  - After admin updates a rubric score (recalculate total)

- [ ] Create `recalculateAllSubmissionScores()` utility function
  - Iterates through all existing submissions
  - Calculates and updates scores for each
  - Used for migration/backfill of historical data
  - Logs progress and errors

- [ ] Store scoring metadata:
  - `graded_at` timestamp per question
  - `graded_by` user ID (null for auto-graded, admin ID for manual)
  - `auto_graded` boolean flag per question score

### Phase 2: Frontend - Student Views

#### Task 2.1: Student Submission History Page
**File**: `/client/src/pages/User/SubmissionHistory.jsx` (already exists, needs enhancement)

- [ ] Fetch submissions from `GET /api/submissions/my-submissions`
- [ ] Group submissions by activity
- [ ] For each activity, show:
  - Activity name as header
  - Best score badge (highlighted, e.g., "Best: 95/100 ⭐")
  - All attempts listed chronologically (newest first)
- [ ] Each submission card displays:
  - Attempt number (e.g., "Attempt 3")
  - Submission date (formatted: "Nov 1, 2025 10:30 AM")
  - Score with progress bar:
    - Points: "85/100"
    - Percentage: "85%"
    - Visual bar colored by performance (red/orange/yellow/light green/green)
  - Status badge:
    - "Fully Graded" (green) - all questions scored
    - "Partially Graded" (yellow) - X questions pending
    - "Pending Review" (gray) - all pending
  - Grading info: "7 of 10 questions graded"
  - "View Details" button
- [ ] Handle empty state:
  - "No submissions yet" message
  - Link to available activities
- [ ] Handle loading state with skeleton cards
- [ ] Handle error state with retry button
- [ ] Add "Filter by Activity" dropdown
- [ ] Add search functionality (search activity names)
- [ ] Responsive design (mobile-friendly cards)

#### Task 2.2: Student Submission Detail Page
**File**: `/client/src/pages/User/SubmissionDetail.jsx` (NEW)

**Component Structure**:
```
SubmissionDetail
├── Header Section
│   ├── Activity name
│   ├── Attempt info (e.g., "Attempt 3 of 5")
│   ├── Submission date
│   ├── Overall score with progress bar
│   └── Navigation (Back to History, View Other Attempts dropdown)
├── Summary Section
│   ├── Statistics cards
│   │   ├── Total Score: "85/100 (85%)"
│   │   ├── Graded: "7 of 10 questions"
│   │   ├── Time Spent: "45 minutes"
│   │   └── Submitted: "Nov 1, 2025 10:30 AM"
│   └── Status indicator
├── Questions List (scrollable)
│   └── For each question:
│       ├── Question number badge
│       ├── Question text
│       ├── Question type indicator
│       ├── Points: "8/10" with mini progress bar
│       ├── Your Answer section (rendered by question type)
│       ├── Correct Answer section (if auto-graded or graded)
│       ├── Rubric Breakdown (if rubric-based)
│       │   ├── Criterion name
│       │   ├── Points earned/possible
│       │   ├── Level achieved (highlighted)
│       │   └── Level description
│       ├── Feedback (if provided by instructor)
│       └── Status badge (Graded/Pending)
└── Footer
    ├── "Back to History" button
    └── "View Other Attempts" dropdown
```

**Detailed Requirements**:

- [ ] Create new route `/submissions/:submissionId`
- [ ] Fetch submission details from `GET /api/submissions/:id`
- [ ] Header Section:
  - Activity name as page title
  - Attempt info: "Attempt X of Y" with navigation dropdown
  - Formatted submission date (e.g., "Submitted on Nov 1, 2025 at 10:30 AM")
  - Overall score display:
    - Large score text: "85/100 (85%)"
    - Colored progress bar (full width, performance-based colors)
    - Grading status: "7 of 10 questions graded"
  - Breadcrumb navigation: Home > My Submissions > [Activity Name] > Attempt X

- [ ] Summary Statistics Panel:
  - Card-based layout with 4 key stats
  - Total Score card (primary, larger): "85/100 (85%)"
  - Graded Questions card: "7/10 graded, 3 pending"
  - Time Spent card: "45 minutes" (if tracked)
  - Submission Date card: formatted date/time

- [ ] Questions List:
  - Display all questions with answers in submission order
  - Each question in expandable/collapsible card
  - Default: all expanded (or option to expand/collapse all)

- [ ] Question Card Layout:
  - **Header**:
    - Question number badge (e.g., "Q5")
    - Question type icon (MC, checkbox, short answer, essay, etc.)
    - Points badge: "8/10" or "Pending" (colored by status)
  - **Question Text**:
    - Display question content (formatted, with images if any)
  - **Your Answer Section**:
    - Label: "Your Answer"
    - Render based on question type:
      - **Multiple Choice**: Show selected option with radio indicator
      - **Checkbox**: Show all selected options with check indicators
      - **Short Answer**: Show text answer in bordered box
      - **Essay**: Show full text in expandable text area
      - **File Upload**: Show file name with download link
    - If wrong (auto-graded): Red border/background tint
    - If correct (auto-graded): Green border/background tint
  - **Correct Answer Section** (if available):
    - Label: "Correct Answer" (for auto-graded)
    - Show correct option(s) with green highlight
    - Only show if question is graded
    - For essay/rubric-based: "Graded by instructor"
  - **Rubric Breakdown Section** (if rubric exists):
    - Label: "Grading Rubric"
    - For each criterion:
      - Criterion name and weight (e.g., "Organization (30%)")
      - Points earned: "8/10"
      - Levels displayed as pills/badges
      - Achieved level highlighted in green
      - Level description shown below
    - Total rubric points at bottom
  - **Feedback Section** (if provided):
    - Label: "Instructor Feedback"
    - Display feedback text in styled box (light yellow background)
    - Show instructor name and feedback date
  - **Status Footer**:
    - Status badge: "Graded" (green) or "Pending Review" (gray)
    - If graded: Show "Graded by [Name] on [Date]"

- [ ] Answer Rendering by Type:
  - **Multiple Choice**:
    - Radio button indicators (read-only)
    - Selected option highlighted
    - If graded: correct option in green, wrong selection in red
  - **Checkbox**:
    - Checkbox indicators (read-only)
    - All selected options shown
    - If graded: correct selections in green, wrong/missing in red
  - **Short Answer**:
    - Text displayed in bordered input-style box
    - If graded against expected answer: show comparison
  - **Essay**:
    - Full text in expandable/collapsible area
    - Word count if available
  - **File Upload**:
    - File icon with file name
    - Download button
    - File size and upload date

- [ ] Navigation:
  - "Back to History" button (top and bottom)
  - "View Other Attempts" dropdown:
    - Shows all attempts for this activity
    - Displays attempt number, date, score
    - Highlights current attempt
    - Click to navigate to other attempt
  - "Next Attempt" / "Previous Attempt" buttons if applicable

- [ ] States:
  - Loading: Show skeleton for question cards
  - Error: Show error message with retry
  - Empty: Shouldn't occur, but handle gracefully
  - Partial Grading: Show pending questions differently
    - Gray out pending sections
    - Show "Pending Review" badge
    - Hide correct answers/rubric for pending questions

- [ ] Responsive Design:
  - Mobile: Stack cards vertically, compact layout
  - Tablet: 1-2 column layout
  - Desktop: Sidebar navigation (optional), main content area

- [ ] Print/Export:
  - "Print" button that triggers browser print dialog
  - CSS print styles for clean printable submission
  - Hide navigation, show all questions expanded
  - Include student name, activity, date, score on print header

### Phase 3: Frontend - Admin Views

#### Task 3.1: Student List Page
**File**: `/client/src/pages/Admin/StudentList.jsx` (NEW)

**Component Structure**:
```
StudentList
├── Header
│   ├── Page title: "Students"
│   └── Total count: "45 students"
├── Search & Filters
│   ├── Search input (name/email)
│   └── Filter dropdown (All/Active/Has Submissions/No Submissions)
├── Student Table/Cards
│   └── For each student:
│       ├── Avatar/initials
│       ├── Name (link to detail)
│       ├── Email
│       ├── Statistics:
│       │   ├── Submissions count
│       │   ├── Average score
│       │   └── Last activity date
│       └── Actions: "View Submissions" button
└── Pagination
```

**Detailed Requirements**:

- [ ] Create new page at `/admin/students`
- [ ] Fetch all users (non-admin) from `GET /api/admin/users`
- [ ] Header Section:
  - Page title: "Students"
  - Total count badge: "45 students"
  - Optional: "Export CSV" button

- [ ] Search Functionality:
  - Search input with placeholder "Search by name or email..."
  - Real-time search (debounced)
  - Highlight matching text in results

- [ ] Filter Options:
  - "All Students" (default)
  - "Has Submissions" (students with at least 1 submission)
  - "No Submissions" (students with 0 submissions)
  - "Active This Week" (recent activity)

- [ ] Student Display (Table Layout):
  - **Columns**:
    - Avatar: First initial in colored circle
    - Name: Clickable link to submission history
    - Email: Display with mail icon
    - Submissions: "12 submissions" (numeric, sortable)
    - Avg Score: "85%" with mini progress bar (color-coded, sortable)
    - Last Activity: Relative time "2 hours ago" (sortable)
    - Actions: "View Submissions" button
  - Sortable columns (click header to sort ascending/descending)
  - Hover row to highlight
  - Click anywhere on row to navigate to student submissions

- [ ] Color Coding for Scores:
  - Red (<60%): Poor performance
  - Orange (60-75%): Below average
  - Yellow (75-85%): Average
  - Green (>85%): Excellent

- [ ] Pagination:
  - Show 25 students per page
  - Page numbers with prev/next arrows
  - Jump to page input
  - Display "Showing 1-25 of 45"

- [ ] Empty States:
  - No students: "No students found. Students will appear here once they register."
  - No search results: "No students match your search for '{query}'"

- [ ] Loading & Error States:
  - Skeleton rows while loading (show 10 skeleton rows)
  - Error message with retry button: "Failed to load students. [Retry]"

- [ ] Add to Admin Navigation:
  - Menu item: "Students" with user-group icon
  - Badge showing total count (optional): "Students (45)"

- [ ] Responsive Design:
  - Desktop: Full table view with all columns
  - Tablet: Hide Last Activity column, smaller fonts
  - Mobile: Card view (stack information vertically)

#### Task 3.2: Student Submission History (Admin View)
**File**: `/client/src/pages/Admin/StudentSubmissions.jsx` (NEW)

**Component Structure**:
```
StudentSubmissions
├── Header
│   ├── Back button to Students list
│   ├── Student info card (name, email, avatar)
│   └── Overall statistics panel
├── Performance Chart
│   └── Score progression over time (line chart)
├── Submissions List
│   └── For each submission:
│       ├── Activity name
│       ├── Attempt number
│       ├── Date & time
│       ├── Score with progress bar
│       ├── Status badge
│       └── Actions: View, Grade, Add Note
└── Notes/Comments Section
    └── Teacher notes (add/edit/delete)
```

**Detailed Requirements**:

- [ ] Create new page at `/admin/students/:userId/submissions`
- [ ] Fetch student details from `GET /api/admin/users/:userId`
- [ ] Fetch all submissions from `GET /api/admin/users/:userId/submissions`

- [ ] Header Section:
  - Back button: "← Back to Students"
  - Student Info Card:
    - Large avatar with student initials
    - Student name (prominent)
    - Email address
    - Join date: "Member since Nov 2025"
  - Overall Statistics Panel:
    - Total Submissions: "24"
    - Average Score: "82%" with progress bar
    - Best Score: "95%"
    - Last Activity: "2 hours ago"
    - Activities Completed: "8 of 12"

- [ ] Performance Chart:
  - Line chart showing score progression over time
  - X-axis: Submission date
  - Y-axis: Score percentage (0-100%)
  - Points: Each submission as dot on line
  - Hover: Show activity name, date, score
  - Color: Green line with gradient fill
  - Optional: Add trend line

- [ ] Submissions List:
  - Group by activity (collapsible sections)
  - For each activity:
    - Activity name as header
    - Show all attempts chronologically
  - Each submission card:
    - Attempt badge: "Attempt 2 of 3"
    - Submission date & time: "Nov 1, 2025 at 10:30 AM"
    - Score display:
      - Points: "85/100"
      - Percentage: "85%"
      - Progress bar (color-coded)
    - Grading status badge:
      - "Fully Graded" (green)
      - "Partially Graded - 3 pending" (yellow)
      - "Pending Review" (gray)
    - Time spent: "45 minutes"
    - Actions:
      - "View Details" button → Navigate to submission detail
      - "Grade" button → Navigate to grading interface (if pending)
      - "Add Note" icon → Open note modal

- [ ] Filters & Sorting:
  - Filter by activity (dropdown)
  - Filter by status (All/Graded/Pending)
  - Sort by: Date (newest/oldest), Score (high/low), Activity

- [ ] Notes/Comments Section:
  - Collapsed by default, expandable
  - Teacher can add private notes about student
  - Notes not visible to student
  - Each note shows:
    - Teacher name
    - Date/time
    - Note text
    - Edit/Delete buttons
  - "Add Note" button opens modal:
    - Text area for note
    - Save/Cancel buttons

- [ ] Quick Actions:
  - "Send Email" button (mailto link or compose modal)
  - "Export Report" button (PDF/CSV of student's submissions)
  - "View in Grading Interface" button (next ungraded submission)

- [ ] Empty States:
  - No submissions: "This student hasn't submitted any activities yet."
  - No notes: "No notes yet. Add a note to track observations or feedback."

- [ ] Loading & Error States:
  - Skeleton for student info and submissions
  - Error with retry: "Failed to load student data. [Retry]"

- [ ] Responsive Design:
  - Desktop: Chart + list side-by-side or stacked
  - Mobile: Stack all sections, compact cards

#### Task 3.3: Activity Reports Page
**File**: `/client/src/pages/Admin/ActivityReports.jsx` (NEW)

**Component Structure**:
```
ActivityReports
├── Header
│   ├── Page title: "Activity Reports"
│   └── Activity selector dropdown
├── Summary Statistics Panel
│   ├── Total Students: "45"
│   ├── Submitted: "32 (71%)"
│   ├── Average Score: "82%"
│   └── Score Distribution Chart (histogram)
├── Filters & Search
│   ├── Search by student name
│   ├── Status filter (All/Graded/Pending/Not Started)
│   └── Score range filter
├── Student Submissions Table
│   └── For each student:
│       ├── Name (sortable)
│       ├── Score (sortable, color-coded)
│       ├── Status (sortable)
│       ├── Submitted Date (sortable)
│       └── Actions: View, Grade
└── Actions Bar
    ├── Export to CSV button
    └── Bulk actions (optional)
```

**Detailed Requirements**:

- [ ] Create new page at `/admin/reports/activities`
- [ ] Activity Selector:
  - Dropdown with all activities
  - Default: Select first activity or most recent
  - Change selection to load different activity data
  - Show activity description below selector

- [ ] Fetch data from `GET /api/admin/activities/:activityId/submissions`
- [ ] Fetch statistics from `GET /api/admin/activities/:activityId/statistics`

- [ ] Summary Statistics Panel (Cards):
  - **Total Students Card**:
    - Large number: "45"
    - Label: "Total Students"
    - Icon: user-group
  - **Submitted Card**:
    - Number: "32"
    - Percentage: "71%"
    - Label: "Submitted"
    - Progress bar (71% filled, green)
  - **Average Score Card**:
    - Large percentage: "82%"
    - Label: "Average Score"
    - Trend indicator: ↑ +3% from previous activity (optional)
    - Color-coded (green if >75%, yellow if 60-75%, red if <60%)
  - **Not Started Card**:
    - Number: "13"
    - Percentage: "29%"
    - Label: "Not Started"
    - Gray color

- [ ] Score Distribution Chart:
  - Histogram/bar chart
  - X-axis: Score ranges (0-20, 21-40, 41-60, 61-80, 81-100)
  - Y-axis: Number of students
  - Bars color-coded (red to green)
  - Hover: Show exact count

- [ ] Search & Filters:
  - **Search Input**:
    - Placeholder: "Search by student name..."
    - Real-time search (debounced)
  - **Status Filter Dropdown**:
    - All (default)
    - Fully Graded
    - Partially Graded
    - Pending Review
    - Not Started
  - **Score Range Filter**:
    - All Scores (default)
    - 90-100% (A)
    - 80-89% (B)
    - 70-79% (C)
    - 60-69% (D)
    - Below 60% (F)
    - Not Graded

- [ ] Student Submissions Table:
  - **Columns**:
    - Student Name (sortable, with avatar)
    - Score (sortable, with progress bar)
    - Status (sortable, with badge)
    - Submitted Date (sortable, relative time)
    - Actions (View/Grade buttons)
  - **Sortable Columns**:
    - Click header to sort ascending/descending
    - Active sort indicated by arrow icon
    - Default sort: By name (A-Z)
  - **Score Column**:
    - Display: "85/100 (85%)"
    - Mini progress bar below
    - Color-coded: red (<60%), orange (60-75%), yellow (75-85%), green (>85%)
    - If not submitted: "—" (em dash)
  - **Status Column**:
    - Badge with icon:
      - "Fully Graded" (green checkmark)
      - "Partially Graded - X pending" (yellow clock)
      - "Pending Review" (gray hourglass)
      - "Not Started" (gray dash)
  - **Submitted Date Column**:
    - Relative time: "2 hours ago", "3 days ago"
    - Tooltip with full date/time on hover
    - If not submitted: "Not submitted"
  - **Actions Column**:
    - "View" button: Navigate to submission detail
    - "Grade" button: Navigate to grading interface (if pending)
    - Disabled if not submitted

- [ ] Pagination:
  - Show 25 students per page
  - Page controls at bottom
  - Display "Showing 1-25 of 45"

- [ ] Export to CSV:
  - Button: "Export to CSV" with download icon
  - Exports current filtered/sorted data
  - CSV Columns:
    - Student Name
    - Student Email
    - Score (numeric)
    - Percentage
    - Status
    - Submitted Date (ISO format)
    - Time Spent (minutes)
    - Graded Date
    - Graded By
  - Filename: `{activity-name}-report-{date}.csv`
  - Include all students (not just visible page)
  - Success toast: "Report exported successfully"

- [ ] Empty States:
  - No students: "No students have been assigned this activity."
  - No submissions: "No students have submitted this activity yet."
  - No search results: "No students match '{query}'"

- [ ] Loading & Error States:
  - Skeleton for statistics cards and table
  - Error with retry: "Failed to load report data. [Retry]"

- [ ] Add to Admin Navigation:
  - Menu item: "Reports" with chart icon
  - Submenu: "Activity Reports"

- [ ] Responsive Design:
  - Desktop: Full table with all columns
  - Tablet: Hide Submitted Date, smaller text
  - Mobile: Card view instead of table
    - Each student as card with key info
    - Tap to expand for more details

#### Task 3.4: Enhanced Grading Interface Integration
**File**: `/client/src/pages/Admin/GradingInterface.jsx` (ENHANCE)

**Current State**: GradingInterface exists and allows instructors to grade submissions.

**Enhancements Needed**:

- [ ] Add navigation from reports directly to grading interface
  - Support URL param: `/admin/grading?submissionId={id}`
  - Auto-load submission if ID provided
  - Highlight in breadcrumb: Reports > Activity > Student > Grading

- [ ] Pre-populate with selected student and activity
  - If coming from Activity Reports: Load specific submission
  - If coming from Student Submissions: Load specific submission
  - Show context: "Grading [Student Name] - [Activity Name] - Attempt X"

- [ ] Add "Next Student" / "Previous Student" navigation
  - Buttons at top of interface
  - "Next Ungraded" button (jump to next pending submission)
  - "Previous Student" button (go back to previous in list)
  - Maintain activity context (stay within same activity)
  - Keyboard shortcuts: `n` for next, `p` for previous

- [ ] Show score as it updates in real-time
  - Live calculation of total score as instructor grades
  - Display running total at top: "Current Score: 75/100 (75%)"
  - Update progress bar dynamically
  - Show "X of Y questions graded" counter

- [ ] Add quick feedback templates
  - Dropdown: "Insert Template"
  - Templates stored in local storage or database
  - Common templates:
    - "Great work! Your answer demonstrates clear understanding."
    - "Good effort, but consider..."
    - "Needs improvement. Please review..."
    - "Excellent analysis!"
  - Allow custom templates (add/edit/delete)
  - Insert template into feedback field with one click

- [ ] Auto-save functionality
  - Save progress every 30 seconds
  - Show "Saving..." indicator
  - Show "Saved" confirmation
  - Prevent data loss on navigation

- [ ] Submission Summary Sidebar (optional):
  - Student info (name, email, avatar)
  - Attempt number
  - Submission date
  - Current overall score
  - Grading progress: "5 of 10 graded"
  - Quick stats

- [ ] Enhanced Question Navigation:
  - Question list sidebar (show all questions)
  - Click to jump to specific question
  - Visual indicators: graded (green check), pending (yellow dot)
  - "Jump to Next Ungraded" button

- [ ] Grading History (optional):
  - Show previous attempts by this student (if any)
  - Compare scores across attempts
  - "View Previous Attempt" link

- [ ] Keyboard Shortcuts:
  - `Ctrl/Cmd + S`: Save progress
  - `Ctrl/Cmd + Enter`: Save and next question
  - `n`: Next student
  - `p`: Previous student
  - `Esc`: Close/go back

- [ ] Confirmation on Navigation:
  - If unsaved changes, show warning: "You have unsaved changes. Save before leaving?"
  - Options: Save & Leave, Discard, Cancel

- [ ] Success Actions after Grading:
  - Show success toast: "Submission graded successfully"
  - Options:
    - "Grade Next Student" button
    - "Back to Reports" button
    - "View Student's Other Submissions" link

### Phase 4: UI/UX Enhancements

#### Task 4.1: Score Visualization Components
**Files**: `/client/src/components/ui/score-badge.jsx`, `/client/src/components/ui/progress-bar.jsx` (NEW)

**Purpose**: Reusable components for consistent score display across the app.

**Components to Create**:

1. **ScoreBadge Component** (`/client/src/components/ui/score-badge.jsx`):
   - Props:
     - `score`: number (points earned)
     - `maxScore`: number (total possible)
     - `percentage`: number (optional, calculated if not provided)
     - `size`: "sm" | "md" | "lg" (default: "md")
     - `showPercentage`: boolean (default: true)
     - `status`: "graded" | "pending" | "none" (optional)
   - Display:
     - Shows "85/100" or "85/100 (85%)" format
     - Color-coded by performance:
       - Red (<60%): #EF4444
       - Orange (60-75%): #F97316
       - Yellow (75-85%): #EAB308
       - Light Green (85-95%): #84CC16
       - Green (>95%): #22C55E
     - If pending: Gray color with "Pending" text
   - Variants:
     - Small: Compact text only
     - Medium: Text with subtle background
     - Large: Prominent display with icon

2. **ProgressBar Component** (`/client/src/components/ui/progress-bar.jsx`):
   - Props:
     - `value`: number (0-100 percentage)
     - `max`: number (default: 100)
     - `height`: "xs" | "sm" | "md" | "lg" (default: "md")
     - `showLabel`: boolean (default: false)
     - `animated`: boolean (default: false)
     - `status`: "success" | "warning" | "error" | "default"
   - Display:
     - Horizontal bar with filled portion
     - Same color scheme as ScoreBadge
     - Optional percentage label inside or above bar
     - Smooth animation on value change
   - Variants:
     - XS: 2px height (mini indicator)
     - SM: 4px height
     - MD: 8px height
     - LG: 16px height with label

3. **StatusBadge Component** (`/client/src/components/ui/status-badge.jsx`):
   - Props:
     - `status`: "fully_graded" | "partially_graded" | "pending" | "not_started"
     - `pendingCount`: number (optional, for partially graded)
     - `size`: "sm" | "md" | "lg"
   - Display:
     - Pill-shaped badge with icon + text
     - "Fully Graded" (green, checkmark icon)
     - "Partially Graded - X pending" (yellow, clock icon)
     - "Pending Review" (gray, hourglass icon)
     - "Not Started" (gray, dash icon)

4. **PerformanceIndicator Component** (`/client/src/components/ui/performance-indicator.jsx`):
   - Props:
     - `percentage`: number
     - `label`: string (optional)
     - `variant`: "circle" | "bar" | "minimal"
   - Display:
     - Circle variant: Circular progress (donut chart)
     - Bar variant: Horizontal bar with label
     - Minimal variant: Just colored dot + percentage
     - Animated on mount

**Implementation Checklist**:

- [ ] Create `/client/src/components/ui/score-badge.jsx`
- [ ] Create `/client/src/components/ui/progress-bar.jsx`
- [ ] Create `/client/src/components/ui/status-badge.jsx`
- [ ] Create `/client/src/components/ui/performance-indicator.jsx`
- [ ] Define color palette constants in `/client/src/lib/constants.js`:
  ```js
  export const SCORE_COLORS = {
    excellent: { min: 95, color: '#22C55E', label: 'Excellent' },
    good: { min: 85, color: '#84CC16', label: 'Good' },
    average: { min: 75, color: '#EAB308', label: 'Average' },
    belowAverage: { min: 60, color: '#F97316', label: 'Below Average' },
    poor: { min: 0, color: '#EF4444', label: 'Poor' }
  };
  ```
- [ ] Create utility function `getScoreColor(percentage)` in `/client/src/lib/utils.js`
- [ ] Add Storybook stories for each component (optional but recommended)
- [ ] Replace hardcoded score displays across the app:
  - SubmissionHistory.jsx
  - SubmissionDetail.jsx
  - ActivityReports.jsx
  - StudentSubmissions.jsx
  - Dashboard.jsx
- [ ] Ensure accessibility:
  - Add ARIA labels (e.g., `aria-label="Score: 85 out of 100"`)
  - Ensure color contrast meets WCAG AA standards
  - Don't rely solely on color (use icons/text)
- [ ] Add unit tests for color logic
- [ ] Document components in README or Storybook

#### Task 4.2: Statistics Dashboard Components
**Files**: `/client/src/components/Statistics/` (NEW directory)

**Purpose**: Reusable chart and statistics components for admin analytics.

**Components to Create**:

1. **ScoreDistributionChart Component** (`ScoreDistributionChart.jsx`):
   - Props:
     - `scores`: array of numbers (percentages)
     - `height`: number (default: 300px)
     - `showLegend`: boolean (default: true)
   - Display:
     - Histogram showing distribution of scores
     - X-axis: Score ranges (0-20, 21-40, 41-60, 61-80, 81-100)
     - Y-axis: Number of students
     - Bars color-coded (red to green gradient)
     - Hover: Show exact count + percentage
   - Libraries: Consider using Chart.js, Recharts, or Victory
   - Example:
     ```
     15 |     ███
     10 |     ███ ███
      5 | ███ ███ ███ ███
      0 |─────────────────
          0-20 21-40 41-60 61-80 81-100
     ```

2. **SummaryStatsCards Component** (`SummaryStatsCards.jsx`):
   - Props:
     - `stats`: object with { average, median, min, max, totalStudents, totalSubmitted }
     - `layout`: "horizontal" | "grid" (default: "grid")
   - Display:
     - Grid of 4-6 cards showing key statistics
     - Each card:
       - Icon at top
       - Large number (e.g., "82%")
       - Label below (e.g., "Average Score")
       - Optional: Trend indicator (↑ +3%)
   - Cards:
     - **Average Score**: Mean percentage with trend
     - **Median Score**: Middle value
     - **Highest Score**: Max percentage with student name (optional)
     - **Lowest Score**: Min percentage
     - **Completion Rate**: Submitted/Total with progress circle
     - **Total Students**: Count of all students

3. **CompletionRateCircle Component** (`CompletionRateCircle.jsx`):
   - Props:
     - `completed`: number
     - `total`: number
     - `size`: "sm" | "md" | "lg" (default: "md")
     - `showLabel`: boolean (default: true)
   - Display:
     - Circular progress indicator (donut chart)
     - Percentage in center: "71%"
     - Label below: "32 of 45 submitted"
     - Animated fill on mount
     - Color: Green if >80%, yellow if 50-80%, red if <50%
   - Sizes:
     - SM: 80px diameter
     - MD: 120px diameter
     - LG: 160px diameter

4. **TrendChart Component** (`TrendChart.jsx`):
   - Props:
     - `data`: array of { date, score } objects
     - `height`: number (default: 250px)
     - `showDataPoints`: boolean (default: true)
     - `showTrendLine`: boolean (default: false)
   - Display:
     - Line chart showing score progression over time
     - X-axis: Dates (formatted)
     - Y-axis: Score percentage (0-100%)
     - Line: Green with gradient fill below
     - Points: Dots at each submission
     - Hover: Show date, activity name, score
     - Optional: Add linear regression trend line
   - Use cases:
     - Student's performance over time (Student Submissions page)
     - Activity average scores over time (admin analytics)

5. **QuickStatsPanel Component** (`QuickStatsPanel.jsx`):
   - Props:
     - `stats`: array of { label, value, icon, color } objects
     - `orientation`: "horizontal" | "vertical"
   - Display:
     - Compact list of key stats
     - Each stat: Icon + Label + Value
     - Color-coded icons
   - Example:
     ```
     📊 Total Submissions: 32
     ✅ Fully Graded: 28
     ⏳ Pending: 4
     📈 Average: 82%
     ```

6. **GradingProgressBar Component** (`GradingProgressBar.jsx`):
   - Props:
     - `graded`: number
     - `total`: number
     - `showBreakdown`: boolean (default: true)
   - Display:
     - Stacked progress bar
     - Green segment: Fully graded
     - Yellow segment: Partially graded
     - Gray segment: Pending
     - Label: "28 fully graded, 3 partial, 1 pending"

**Implementation Checklist**:

- [ ] Create `/client/src/components/Statistics/` directory
- [ ] Install charting library if needed:
  - Option 1: `npm install chart.js react-chartjs-2`
  - Option 2: `npm install recharts`
  - Option 3: `npm install victory`
- [ ] Create `ScoreDistributionChart.jsx`
- [ ] Create `SummaryStatsCards.jsx`
- [ ] Create `CompletionRateCircle.jsx`
- [ ] Create `TrendChart.jsx`
- [ ] Create `QuickStatsPanel.jsx`
- [ ] Create `GradingProgressBar.jsx`
- [ ] Create utility functions for data transformation:
  - `calculateScoreDistribution(scores)` - bucket scores into ranges
  - `calculateStats(scores)` - compute avg, median, min, max
  - `calculateTrend(data)` - compute trend line (optional)
- [ ] Add sample data generators for testing/Storybook
- [ ] Integrate components into:
  - ActivityReports.jsx (distribution chart, summary stats)
  - StudentSubmissions.jsx (trend chart, quick stats)
  - Dashboard.jsx (completion rate, summary cards)
- [ ] Ensure responsive design (charts adapt to container width)
- [ ] Add loading skeletons for charts
- [ ] Add empty states (e.g., "No data to display")
- [ ] Optimize performance for large datasets (>100 students)
- [ ] Add accessibility: Screen reader descriptions for charts

#### Task 4.3: Navigation Updates
**Files**: 
- `/client/src/components/Layout/Layout.jsx`
- Navigation component

**Current Navigation**: Basic navigation exists with admin/user role separation.

**Updates Needed**:

**For Students (User Role)**:

- [ ] Add "My Submissions" menu item
  - Route: `/submissions`
  - Icon: Document/file icon
  - Badge: Show count of unviewed graded submissions (optional)
  - Position: After "Dashboard", before other items

- [ ] Update "Dashboard" to show submission summary
  - Quick stats widget: Recent submissions, average score
  - "View All Submissions" link

**For Instructors (Admin Role)**:

- [ ] Add "Students" menu item
  - Route: `/admin/students`
  - Icon: User group icon
  - Badge: Show total student count (optional)
  - Position: In admin section

- [ ] Add "Reports" menu section
  - Parent menu item with dropdown (if multi-level nav)
  - Sub-items:
    - "Activity Reports" → `/admin/reports/activities`
    - "Student Overview" → `/admin/students` (duplicate link)
  - Icon: Chart/analytics icon

- [ ] Update "Activities" menu to show grading status
  - Badge: Show count of pending grading tasks
  - E.g., "Activities (5 pending)"

- [ ] Update "Grading" menu item (if exists)
  - Route: `/admin/grading`
  - Badge: Count of ungraded submissions
  - Icon: Clipboard/checkmark icon

**Active State Indicators**:

- [ ] Highlight active menu item
  - Use `useLocation()` hook to detect current route
  - Apply active class: Bold text, colored background, left border
  - Example: If on `/admin/students/:userId/submissions`, highlight "Students"

- [ ] Breadcrumb navigation (optional but recommended)
  - Add breadcrumb component to page headers
  - Examples:
    - `Home > My Submissions > Intro to JavaScript > Attempt 2`
    - `Admin > Students > John Doe > Submissions`
    - `Admin > Reports > Activity Reports > Intro to JavaScript`
  - Clickable links for each level

**Mobile Navigation**:

- [ ] Ensure hamburger menu includes new items
- [ ] Collapse sub-menus by default on mobile
- [ ] Add bottom navigation bar (optional)
  - Quick access to: Dashboard, Submissions, Profile, Settings

**Navigation Component Structure**:

```jsx
// Layout.jsx
<nav>
  {user.role === 'user' ? (
    <ul>
      <li><Link to="/dashboard">Dashboard</Link></li>
      <li><Link to="/submissions">My Submissions</Link></li>
      <li><Link to="/activities">Available Activities</Link></li>
      <li><Link to="/profile">Profile</Link></li>
    </ul>
  ) : (
    <ul>
      <li><Link to="/admin/dashboard">Dashboard</Link></li>
      <li><Link to="/admin/activities">Activities</Link></li>
      <li><Link to="/admin/questions">Questions</Link></li>
      <li><Link to="/admin/rubrics">Rubrics</Link></li>
      <li><Link to="/admin/students">Students</Link></li>
      <li>
        <details>
          <summary>Reports</summary>
          <ul>
            <li><Link to="/admin/reports/activities">Activity Reports</Link></li>
          </ul>
        </details>
      </li>
      <li><Link to="/admin/grading">Grading</Link></li>
    </ul>
  )}
</nav>
```

**Implementation Checklist**:

- [ ] Update `/client/src/components/Layout/Layout.jsx`
- [ ] Add "My Submissions" link for students
- [ ] Add "Students" link for admins
- [ ] Add "Reports" section with "Activity Reports" sub-item
- [ ] Implement active state highlighting:
  - Use `useLocation()` from `react-router-dom`
  - Compare `location.pathname` with menu routes
  - Apply `active` class conditionally
- [ ] Add navigation badges (optional):
  - Fetch counts from API (e.g., ungraded submissions)
  - Display badge with count next to menu item
- [ ] Create Breadcrumb component (`/client/src/components/ui/breadcrumb.jsx`)
- [ ] Integrate Breadcrumb into page headers
- [ ] Update mobile navigation (hamburger menu)
- [ ] Test navigation on all pages
- [ ] Ensure keyboard navigation works (Tab, Enter)
- [ ] Add ARIA labels for accessibility

### Phase 5: Database & Data Integrity

#### Task 5.1: Add Score Fields to Submissions
**File**: `/server/database/migrations/YYYYMMDDHHMMSS-add-score-fields-to-submissions.js` (NEW)

**Current State**: `user_activity_submissions` table exists but may not have all score-related fields.

**Migration Requirements**:

- [ ] Create new migration file with timestamp
- [ ] Add columns to `user_activity_submissions` table:
  - `total_score` DECIMAL(10, 2) - Sum of points earned across all questions
  - `max_possible_score` DECIMAL(10, 2) - Sum of maximum points for all questions
  - `score_percentage` DECIMAL(5, 2) - Calculated as (total_score / max_possible_score) * 100
  - `grading_status` VARCHAR(50) DEFAULT 'pending' - Enum: pending, partially_graded, fully_graded
  - `graded_question_count` INTEGER DEFAULT 0 - Number of questions graded
  - `total_question_count` INTEGER - Total number of questions in the activity
  - `last_calculated_at` TIMESTAMP - Timestamp of last score calculation
  - `auto_graded` BOOLEAN DEFAULT false - Indicates if submission was auto-graded

- [ ] Add indexes for performance:
  - `CREATE INDEX idx_grading_status ON user_activity_submissions(grading_status);`
  - `CREATE INDEX idx_user_activity ON user_activity_submissions(user_id, activity_id);`
  - `CREATE INDEX idx_score_percentage ON user_activity_submissions(score_percentage);`

- [ ] Update `/server/src/models/UserActivitySubmission.js` model:
  ```javascript
  totalScore: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'total_score',
    defaultValue: 0
  },
  maxPossibleScore: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'max_possible_score'
  },
  scorePercentage: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'score_percentage'
  },
  gradingStatus: {
    type: DataTypes.ENUM('pending', 'partially_graded', 'fully_graded'),
    field: 'grading_status',
    defaultValue: 'pending'
  },
  gradedQuestionCount: {
    type: DataTypes.INTEGER,
    field: 'graded_question_count',
    defaultValue: 0
  },
  totalQuestionCount: {
    type: DataTypes.INTEGER,
    field: 'total_question_count'
  },
  lastCalculatedAt: {
    type: DataTypes.DATE,
    field: 'last_calculated_at'
  },
  autoGraded: {
    type: DataTypes.BOOLEAN,
    field: 'auto_graded',
    defaultValue: false
  }
  ```

**Data Migration**:

- [ ] Create script to populate fields for existing submissions
- [ ] Loop through all existing submissions
- [ ] For each submission, call `calculateSubmissionScore(submissionId)`
- [ ] Update fields with calculated values
- [ ] Handle errors gracefully (log and continue)
- [ ] Verify data integrity after migration

**Testing**:

- [ ] Test migration on local database first
- [ ] Test on staging environment
- [ ] Backup production database before running migration
- [ ] Plan rollback strategy (create rollback migration)

#### Task 5.2: Scoring Calculation Service & Background Jobs
**File**: `/server/src/utils/scoringService.js` (NEW)

**Purpose**: Centralized service for calculating and updating submission scores.

**Service Functions**:

1. **`calculateSubmissionScore(submissionId)`** (Already specified in Task 1.3, implementation here):
   - Fetch submission with all answers and question scores
   - For each answer:
     - Check if `question_scores` record exists (graded)
     - If graded: Add `score_earned` to total
     - Add `max_points` to max possible score
   - Calculate:
     - `totalScore` = sum of all score_earned
     - `maxPossibleScore` = sum of all max_points
     - `scorePercentage` = (totalScore / maxPossibleScore) * 100
     - `gradedQuestionCount` = count of graded questions
     - `totalQuestionCount` = total questions
     - `gradingStatus`:
       - 'pending' if gradedQuestionCount === 0
       - 'fully_graded' if gradedQuestionCount === totalQuestionCount
       - 'partially_graded' otherwise
   - Update `user_activity_submissions` table with calculated values
   - Set `last_calculated_at` to current timestamp
   - Return updated submission

2. **`recalculateAllSubmissionScores()`** (Batch processing):
   - Fetch all submissions from database
   - For each submission, call `calculateSubmissionScore(submissionId)`
   - Process in batches of 50 to avoid memory issues
   - Log progress (e.g., "Processed 100 of 500 submissions")
   - Handle errors gracefully (skip failed submissions, log error)
   - Return summary: { total, succeeded, failed, errors }

3. **`recalculateActivityScores(activityId)`** (Activity-specific recalculation):
   - Fetch all submissions for a specific activity
   - For each submission, call `calculateSubmissionScore(submissionId)`
   - Used when activity structure changes (questions added/removed)

4. **`recalculateUserScores(userId)`** (User-specific recalculation):
   - Fetch all submissions for a specific user
   - For each submission, call `calculateSubmissionScore(submissionId)`
   - Used when grading multiple submissions for one student

5. **`scheduleScoreRecalculation(submissionId, delay = 0)`** (Queue job):
   - Add submission ID to job queue
   - Process after `delay` milliseconds (default: immediate)
   - Useful for background processing after grading

**Implementation Details**:

```javascript
// /server/src/utils/scoringService.js
const { UserActivitySubmission, UserActivitySubmissionAnswer, QuestionScore, Question } = require('../models');

async function calculateSubmissionScore(submissionId) {
  try {
    const submission = await UserActivitySubmission.findByPk(submissionId, {
      include: [
        {
          model: UserActivitySubmissionAnswer,
          as: 'answers',
          include: [
            { model: QuestionScore, as: 'score' },
            { model: Question, as: 'question' }
          ]
        }
      ]
    });

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    let totalScore = 0;
    let maxPossibleScore = 0;
    let gradedQuestionCount = 0;
    const totalQuestionCount = submission.answers.length;

    for (const answer of submission.answers) {
      const maxPoints = answer.question.maxPoints || 0;
      maxPossibleScore += maxPoints;

      if (answer.score) {
        totalScore += answer.score.scoreEarned || 0;
        gradedQuestionCount++;
      }
    }

    const scorePercentage = maxPossibleScore > 0 
      ? (totalScore / maxPossibleScore) * 100 
      : 0;

    let gradingStatus = 'pending';
    if (gradedQuestionCount === 0) {
      gradingStatus = 'pending';
    } else if (gradedQuestionCount === totalQuestionCount) {
      gradingStatus = 'fully_graded';
    } else {
      gradingStatus = 'partially_graded';
    }

    await submission.update({
      totalScore,
      maxPossibleScore,
      scorePercentage: Math.round(scorePercentage * 100) / 100,
      gradingStatus,
      gradedQuestionCount,
      totalQuestionCount,
      lastCalculatedAt: new Date()
    });

    return submission;
  } catch (error) {
    console.error(`Error calculating score for submission ${submissionId}:`, error);
    throw error;
  }
}

async function recalculateAllSubmissionScores() {
  const batchSize = 50;
  let offset = 0;
  let hasMore = true;
  const results = { total: 0, succeeded: 0, failed: 0, errors: [] };

  while (hasMore) {
    const submissions = await UserActivitySubmission.findAll({
      limit: batchSize,
      offset,
      attributes: ['id']
    });

    if (submissions.length === 0) {
      hasMore = false;
      break;
    }

    results.total += submissions.length;

    for (const submission of submissions) {
      try {
        await calculateSubmissionScore(submission.id);
        results.succeeded++;
      } catch (error) {
        results.failed++;
        results.errors.push({ submissionId: submission.id, error: error.message });
      }
    }

    console.log(`Processed ${offset + submissions.length} submissions...`);
    offset += batchSize;
  }

  console.log(`Recalculation complete:`, results);
  return results;
}

module.exports = {
  calculateSubmissionScore,
  recalculateAllSubmissionScores,
  // ... other functions
};
```

**Integration Points**:

- [ ] Call `calculateSubmissionScore()` after:
  - Instructor grades a question (in grading interface)
  - Auto-grader completes grading
  - Question score is updated/changed
  - Rubric is applied or modified

- [ ] Add Sequelize hooks in `QuestionScore` model:
  ```javascript
  QuestionScore.addHook('afterCreate', async (score) => {
    const answer = await score.getAnswer();
    const submission = await answer.getSubmission();
    await calculateSubmissionScore(submission.id);
  });

  QuestionScore.addHook('afterUpdate', async (score) => {
    const answer = await score.getAnswer();
    const submission = await answer.getSubmission();
    await calculateSubmissionScore(submission.id);
  });
  ```

- [ ] Create admin endpoint for manual recalculation:
  - `POST /api/admin/submissions/recalculate-all` (recalculate all)
  - `POST /api/admin/submissions/:id/recalculate` (single submission)
  - `POST /api/admin/activities/:id/recalculate-scores` (activity submissions)

**Background Job Option (Optional but Recommended)**:

- [ ] Install job queue library (e.g., `bull` or `bee-queue`)
- [ ] Create job queue for score calculations
- [ ] Process score calculations asynchronously
- [ ] Benefits: Non-blocking, retries on failure, better performance

**Testing**:

- [ ] Unit tests for `calculateSubmissionScore()`
- [ ] Test with various scenarios:
  - All questions graded
  - No questions graded
  - Partial grading
  - Mixed question types
  - Zero max points (edge case)
- [ ] Test batch recalculation with large datasets
- [ ] Test hook integration (score update triggers recalculation)
- [ ] Performance test: Time to recalculate 1000 submissions

### Phase 6: Testing & Polish

#### Task 6.1: Backend Testing
**Focus**: Ensure all API endpoints work correctly and handle edge cases.

- [ ] **Test All New API Endpoints**:
  - `GET /api/submissions/my-submissions` (student submissions)
  - `GET /api/submissions/:id` (submission details)
  - `GET /api/admin/users` (all students)
  - `GET /api/admin/users/:userId/submissions` (student's submissions)
  - `GET /api/admin/activities/:activityId/submissions` (activity submissions)
  - `GET /api/admin/activities/:activityId/statistics` (activity stats)
  - `POST /api/admin/submissions/recalculate-all` (batch recalculation)
  - `POST /api/admin/submissions/:id/recalculate` (single recalculation)

- [ ] **Test Authentication & Authorization**:
  - Verify students can only access their own submissions
  - Verify admins can access all submissions
  - Verify protected routes require valid JWT token
  - Test with expired/invalid tokens (should return 401)
  - Test accessing other user's data (should return 403)

- [ ] **Test Edge Cases**:
  - User with no submissions (should return empty array)
  - Activity with no submissions (should return empty stats)
  - Submission with no graded questions (should show pending)
  - Submission with all graded questions (should show fully graded)
  - Division by zero (0 max points - should handle gracefully)
  - Invalid submission ID (should return 404)
  - Malformed request data (should return 400)

- [ ] **Test Data Validation**:
  - Invalid query parameters (should ignore or return 400)
  - Missing required fields (should return 400)
  - SQL injection attempts (should be sanitized by Sequelize)
  - XSS attempts (should be sanitized)

- [ ] **Test Performance with Large Datasets**:
  - Test with 100 students
  - Test with 50 questions per activity
  - Test pagination with 1000+ records
  - Measure response times (should be <500ms for most endpoints)
  - Test recalculation job with 1000+ submissions

- [ ] **Test Scoring Calculation Logic**:
  - Verify `calculateSubmissionScore()` produces correct totals
  - Test with various question types (MC, checkbox, essay)
  - Test with rubric-based grading
  - Test auto-grading trigger
  - Verify `gradingStatus` updates correctly

- [ ] **Test Error Handling**:
  - Database connection errors (should return 500)
  - Model validation errors (should return 400)
  - Unhandled exceptions (should be caught by middleware)
  - Error messages should not expose sensitive info

**Testing Tools**:
- Use Jest for unit tests
- Use Supertest for API endpoint tests
- Mock database with sequelize-mock or test database
- Create test fixtures (sample users, activities, submissions)

**Test File Structure**:
```
/server/src/tests/
├── api/
│   ├── submissions.test.js
│   ├── admin-users.test.js
│   └── admin-activities.test.js
├── services/
│   └── scoringService.test.js
└── fixtures/
    ├── users.js
    ├── activities.js
    └── submissions.js
```

#### Task 6.2: Frontend Testing
**Focus**: Ensure all new pages and components work correctly across devices.

- [ ] **Test All New Pages**:
  - `/submissions` (Student Submission History)
  - `/submissions/:id` (Student Submission Detail)
  - `/admin/students` (Student List)
  - `/admin/students/:userId/submissions` (Student Submission History - Admin)
  - `/admin/reports/activities` (Activity Reports)
  - `/admin/grading` (Enhanced Grading Interface)

- [ ] **Test All New Components**:
  - ScoreBadge (various scores, sizes, statuses)
  - ProgressBar (various percentages, heights, animations)
  - StatusBadge (all status types)
  - PerformanceIndicator (circle, bar, minimal variants)
  - ScoreDistributionChart (with sample data)
  - SummaryStatsCards (with sample stats)
  - CompletionRateCircle (various completion rates)
  - TrendChart (with time series data)

- [ ] **Test Responsive Design**:
  - **Desktop (>1024px)**:
    - Full table views render correctly
    - Charts display properly
    - Sidebar navigation visible
  - **Tablet (768-1024px)**:
    - Tables adapt or switch to cards
    - Charts remain readable
    - Navigation collapses or simplifies
  - **Mobile (<768px)**:
    - Card views instead of tables
    - Charts stack vertically
    - Hamburger menu works
    - Touch targets are large enough (44x44px minimum)

- [ ] **Test Loading States**:
  - Skeleton loaders appear while fetching data
  - Spinners for button actions
  - Skeleton rows for tables
  - Skeleton cards for lists
  - Loading states don't flash too quickly (<500ms)

- [ ] **Test Error Handling**:
  - Network error: Show error message with retry button
  - 404 error: "Submission not found" message
  - 403 error: "Access denied" message
  - Empty states display correctly (no data available)
  - Error boundaries catch React errors gracefully

- [ ] **Test Navigation Flows**:
  - Click "My Submissions" → See list of submissions
  - Click submission → See detail page
  - Click "Back to History" → Return to list
  - Click "View Other Attempts" → Navigate to different attempt
  - Breadcrumb links work correctly
  - Admin navigation: Students → Student Detail → Submission Detail
  - Admin navigation: Reports → Activity Report → Grading Interface

- [ ] **Test Sorting and Filtering**:
  - Sort table columns (ascending/descending)
  - Filter by status (All/Graded/Pending/Not Started)
  - Filter by score range
  - Search by student name (real-time, debounced)
  - Clear filters resets to default view
  - Filters persist across pagination

- [ ] **Test Pagination**:
  - Page numbers work correctly
  - Next/Previous buttons function
  - Jump to page input works
  - Display count accurate ("Showing 1-25 of 100")
  - URL updates with page number (optional)

- [ ] **Test Data Display**:
  - Scores display correctly (format, colors)
  - Progress bars fill accurately
  - Status badges show correct status
  - Dates format correctly (relative time, full date on hover)
  - Charts render with correct data

- [ ] **Test Interactions**:
  - Buttons respond to clicks
  - Hover states work
  - Dropdowns open/close
  - Modals open/close
  - Forms validate input
  - Export CSV downloads file

- [ ] **Test Accessibility**:
  - Keyboard navigation (Tab, Enter, Esc)
  - Screen reader compatibility (test with NVDA/JAWS)
  - ARIA labels present and correct
  - Color contrast meets WCAG AA standards
  - Focus indicators visible
  - Alt text for images/charts

**Testing Tools**:
- Manual testing in Chrome, Firefox, Safari
- Playwright or Cypress for automated E2E tests
- React Testing Library for component tests
- Jest for unit tests
- Browser DevTools for responsive testing
- Lighthouse for accessibility audit

**Test File Structure**:
```
/client/src/
├── pages/
│   ├── User/
│   │   ├── SubmissionHistory.test.jsx
│   │   └── SubmissionDetail.test.jsx
│   └── Admin/
│       ├── StudentList.test.jsx
│       ├── StudentSubmissions.test.jsx
│       └── ActivityReports.test.jsx
└── components/
    ├── ui/
    │   ├── score-badge.test.jsx
    │   ├── progress-bar.test.jsx
    │   └── status-badge.test.jsx
    └── Statistics/
        ├── ScoreDistributionChart.test.jsx
        └── TrendChart.test.jsx
```

#### Task 6.3: Integration Testing
**Focus**: Test complete user flows and feature interactions.

- [ ] **Test Full User Flow: Submit → View Scores**:
  1. Student logs in
  2. Student navigates to available activities
  3. Student starts an activity
  4. Student completes and submits activity
  5. Auto-grader scores objective questions immediately
  6. Student navigates to "My Submissions"
  7. Student sees partial score (auto-graded questions only)
  8. Student clicks "View Details"
  9. Student sees question-by-question breakdown
  10. Student sees "Pending Review" for essay questions
  11. Instructor grades remaining questions
  12. Score recalculates automatically
  13. Student refreshes and sees updated score
  14. Student sees "Fully Graded" status

- [ ] **Test Full Admin Flow: View Reports → Grade → Scores Update**:
  1. Admin logs in
  2. Admin navigates to "Activity Reports"
  3. Admin selects an activity from dropdown
  4. Admin sees summary statistics (average, completion rate, distribution)
  5. Admin sees table of all students with submission status
  6. Admin filters by "Pending Review"
  7. Admin clicks "Grade" on a pending submission
  8. Grading interface opens with submission pre-loaded
  9. Admin grades questions and adds feedback
  10. Admin saves grading
  11. Score recalculates and updates in database
  12. Admin returns to Activity Reports
  13. Admin sees updated score for student in table
  14. Admin exports CSV with updated scores

- [ ] **Test Real-Time Updates** (if implemented):
  - Admin grades a submission
  - Score updates immediately in Activity Reports (without refresh)
  - Student's submission list updates with new score (without refresh)
  - WebSocket or polling mechanism works correctly

- [ ] **Test with Different Question Types**:
  - **Multiple Choice**: Auto-graded, correct answer shown
  - **Checkbox**: Auto-graded, partial credit for partial matches
  - **Short Answer**: Auto-graded or manual, comparison shown
  - **Essay**: Manual grading only, rubric applied
  - **File Upload**: Manual grading, file downloadable
  - Verify each type displays correctly in submission detail
  - Verify scoring logic is correct for each type

- [ ] **Test Export Functionality**:
  - Admin clicks "Export to CSV" on Activity Reports
  - CSV file downloads with correct filename
  - CSV contains all expected columns (name, email, score, status, etc.)
  - CSV data matches displayed data
  - CSV handles special characters (commas, quotes) correctly
  - CSV opens correctly in Excel/Google Sheets

- [ ] **Test Multiple Attempts**:
  - Student submits activity (Attempt 1)
  - Student submits again (Attempt 2)
  - Both attempts appear in submission history
  - Best score is highlighted
  - Latest submission is clearly marked
  - "View Other Attempts" dropdown works
  - Admin sees all attempts in student submission history

- [ ] **Test Partial Grading Workflow**:
  - Submission has 10 questions (5 objective, 5 essay)
  - Auto-grader grades 5 objective questions immediately
  - Status shows "Partially Graded - 5 pending"
  - Score shows "50/100" (only auto-graded questions)
  - Instructor grades 3 essay questions
  - Status updates to "Partially Graded - 2 pending"
  - Score updates to "80/100"
  - Instructor grades final 2 essay questions
  - Status updates to "Fully Graded"
  - Score updates to "95/100"

- [ ] **Test Edge Cases**:
  - Student with 0 submissions (empty state)
  - Activity with 0 submissions (empty state)
  - Activity with 100% completion (all students submitted)
  - Activity with 0% completion (no students submitted)
  - Submission with all questions scoring 0 (edge case)
  - Submission with perfect score (100%)
  - Very long activity name (truncation)
  - Very long student name (truncation)
  - Activity with 100 questions (performance)

- [ ] **Test Concurrent Access**:
  - Multiple admins viewing same report simultaneously
  - Multiple admins grading different submissions simultaneously
  - Admin grading while student views their submission
  - Ensure no race conditions or data corruption

- [ ] **Test Browser Compatibility**:
  - Test in Chrome (latest)
  - Test in Firefox (latest)
  - Test in Safari (latest)
  - Test in Edge (latest)
  - Test in mobile browsers (iOS Safari, Chrome on Android)

**Testing Tools**:
- Playwright or Cypress for E2E tests
- Postman for API testing
- Manual testing for user flows
- Load testing tools (optional): k6, Artillery

**Integration Test Structure**:
```
/tests/e2e/
├── student-submission-flow.spec.js
├── admin-grading-flow.spec.js
├── multiple-attempts.spec.js
├── partial-grading.spec.js
└── export-functionality.spec.js
```

#### Task 6.4: Polish & Documentation
**Focus**: Final touches, user experience improvements, and documentation.

**Polish Tasks**:

- [ ] **Add Help Text & Tooltips**:
  - Submission History: Tooltip explaining "Best Score" badge
  - Activity Reports: Help icon explaining score distribution chart
  - Status badges: Tooltips explaining each status
  - Filters: Tooltips for what each filter does
  - Grading Interface: Help text for rubric application
  - Example: "?" icon next to "Partially Graded" → "Some questions are still pending review by the instructor"

- [ ] **Ensure Consistent Styling**:
  - Verify all buttons use consistent styles (primary, secondary, danger)
  - Verify all cards have consistent padding, shadows, borders
  - Verify all text uses consistent font sizes and weights
  - Verify color palette is consistent (use Tailwind theme)
  - Verify spacing is consistent (use Tailwind spacing scale)
  - Verify form inputs have consistent styles
  - Run design review with all new pages side-by-side

- [ ] **Add Loading Skeletons**:
  - Submission History: Skeleton cards while loading
  - Submission Detail: Skeleton for header, questions
  - Student List: Skeleton table rows
  - Activity Reports: Skeleton for charts and table
  - Use consistent skeleton design (gray pulse animation)
  - Skeleton should match actual content layout

- [ ] **Improve Empty States**:
  - Add illustrations or icons to empty states
  - Provide actionable next steps:
    - "No submissions yet. [Browse Available Activities]"
    - "No students found. [Invite Students]"
    - "No data for this activity. [View Other Activities]"
  - Use friendly, encouraging language
  - Make empty states visually appealing

- [ ] **Add Success/Error Toasts**:
  - Success: "Submission graded successfully!"
  - Success: "Report exported successfully!"
  - Success: "Score recalculated!"
  - Error: "Failed to load submissions. Please try again."
  - Error: "Failed to export report. Please try again."
  - Use toast library (already have `use-toast.js`)
  - Toasts auto-dismiss after 3-5 seconds
  - Toasts are accessible (ARIA live regions)

- [ ] **Add Confirmation Dialogs**:
  - Confirm before recalculating all scores: "This will recalculate scores for all submissions. Continue?"
  - Confirm before leaving grading interface with unsaved changes
  - Confirm before deleting (if applicable)

- [ ] **Optimize Performance**:
  - Lazy load charts (only load when visible)
  - Debounce search inputs (already planned)
  - Memoize expensive calculations (React.useMemo)
  - Optimize images (compress, use WebP)
  - Code-split large components (React.lazy)
  - Minimize bundle size (check with webpack-bundle-analyzer)

- [ ] **Add Keyboard Shortcuts** (optional):
  - `Ctrl/Cmd + K`: Focus search
  - `n`: Next student (in grading interface)
  - `p`: Previous student
  - `Ctrl/Cmd + S`: Save (in grading interface)
  - Display shortcuts in a help modal (`Shift + ?`)

- [ ] **Add Print Styles**:
  - Student Submission Detail: Clean print layout
  - Activity Reports: Print-friendly table
  - Hide navigation, buttons when printing
  - Ensure charts print correctly (convert to static images if needed)

**Documentation Tasks**:

- [ ] **Update User Documentation** (`/docs/USER_GUIDE.md` or similar):
  - Add section: "Viewing Your Submissions"
    - How to access submission history
    - How to interpret scores
    - How to view detailed feedback
  - Add section: "Understanding Your Score"
    - Explanation of grading statuses
    - How partial grading works
    - When scores are available
  - Add FAQ section:
    - "Why is my score pending?"
    - "Can I retake an activity?"
    - "How is my score calculated?"

- [ ] **Create Admin Guide** (`/docs/ADMIN_GUIDE.md` or similar):
  - Add section: "Viewing Student Submissions"
    - How to access student list
    - How to view individual student progress
  - Add section: "Activity Reports"
    - How to generate reports
    - How to interpret statistics
    - How to export data
  - Add section: "Grading Workflow"
    - Best practices for grading
    - How to use feedback templates
    - How to navigate between students
  - Add section: "Score Recalculation"
    - When scores are recalculated automatically
    - How to manually trigger recalculation
    - Troubleshooting scoring issues

- [ ] **Update README.md**:
  - Add "Features" section mentioning grading/scoring views
  - Update screenshots if applicable
  - Add notes about new dependencies (charting library)

- [ ] **Create Inline Documentation**:
  - Add JSDoc comments to all new functions
  - Add prop-types or TypeScript types to components
  - Document utility functions
  - Add comments for complex logic

- [ ] **Create Video Tutorial** (optional but recommended):
  - Screen recording showing:
    - Student viewing submissions
    - Admin viewing reports
    - Admin grading and scores updating
  - 3-5 minute overview
  - Host on YouTube or embed in docs

**Final Checklist**:

- [ ] All pages accessible via navigation
- [ ] All features work on production build
- [ ] No console errors or warnings
- [ ] Lighthouse score >90 (Performance, Accessibility, Best Practices)
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete
- [ ] Documentation complete and reviewed
- [ ] User acceptance testing (UAT) with real users
- [ ] Code review complete
- [ ] Ready for deployment

**Deployment Notes**:

- [ ] Run database migration on production
- [ ] Run score recalculation job for existing submissions
- [ ] Monitor error logs for first 24 hours
- [ ] Announce new features to users
- [ ] Provide support for user questions

---

## Implementation Timeline

### Sprint 1 (Week 1): Foundation
- Backend APIs (Tasks 1.1, 1.2, 1.3)
- Database migrations (Task 5.1)
- Score calculation service (Task 5.2)

### Sprint 2 (Week 2): Student Features
- Student submission history page (Task 2.1)
- Student submission detail page (Task 2.2)
- Score visualization components (Task 4.1)
- Navigation updates (Task 4.3)

### Sprint 3 (Week 3): Admin Features Part 1
- Student list page (Task 3.1)
- Student submission history admin view (Task 3.2)
- Enhanced grading interface (Task 3.4)

### Sprint 4 (Week 4): Admin Features Part 2
- Activity reports page (Task 3.3)
- Statistics components (Task 4.2)
- Export functionality

### Sprint 5 (Week 5): Testing & Polish
- All testing tasks (6.1, 6.2, 6.3)
- Polish and documentation (Task 6.4)
- Bug fixes and refinements

---

## Success Metrics

- [ ] Students can view all their submission scores within 2 clicks
- [ ] Admin can view class performance for any activity within 3 clicks
- [ ] Page load time < 2 seconds for reports with 100+ submissions
- [ ] Export functionality works for 1000+ records
- [ ] Mobile-responsive design works on screens 375px and up
- [ ] Zero unauthorized data access (students can't see others' data)

---

## Future Enhancements (Post-MVP)

- [ ] Email notifications when submissions are graded
- [ ] Comparative analytics (student vs class average)
- [ ] Progress tracking over multiple activities
- [ ] Predictive analytics (identify struggling students)
- [ ] Peer comparison (anonymized)
- [ ] Downloadable progress reports (PDF)
- [ ] Integration with LMS (Canvas, Blackboard, etc.)
- [ ] Mobile app for viewing scores
