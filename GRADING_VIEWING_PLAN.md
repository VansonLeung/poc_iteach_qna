# Grading & Scoring Viewing Feature Plan

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
- [ ] Student can view list of all their submissions
- [ ] Each submission shows:
  - Activity name
  - Submission date/time
  - Overall score (e.g., 85/100 or 85%)
  - Status (submitted, graded, partially graded)
  - Number of questions answered
- [ ] Student can click on a submission to see detailed results
- [ ] Detailed view shows:
  - Question-by-question breakdown
  - Their answer vs correct answer (for objective questions)
  - Points earned vs possible points for each question
  - Rubric-based feedback for essay questions
  - Overall performance summary

### 2. Admin View - Individual Student Submissions
**User Story**: As an admin/teacher, I want to see all submissions from a specific student to track their progress.

**Acceptance Criteria**:
- [ ] Admin can access a "Students" page listing all users
- [ ] Admin can click on a student to view their submission history
- [ ] View shows:
  - Student name and details
  - List of all submissions (all activities)
  - Submission date, activity name, score
  - Ability to drill down into each submission
- [ ] Admin can see the same detailed view as students see
- [ ] Admin can manually grade/adjust scores for essay questions

### 3. Admin View - Activity-Based Student Scores
**User Story**: As an admin/teacher, I want to see all students' latest submissions for each activity to evaluate class performance.

**Acceptance Criteria**:
- [ ] Admin can access an "Activity Reports" page
- [ ] Admin can select an activity from a list
- [ ] View shows a table with:
  - Student name
  - Latest submission date
  - Score (percentage and points)
  - Status (submitted, graded, not started)
  - Completion time
  - Link to view detailed submission
- [ ] Table is sortable by name, score, date
- [ ] Table is filterable by status
- [ ] Export to CSV functionality
- [ ] Summary statistics:
  - Average score
  - Median score
  - Highest/lowest scores
  - Completion rate
  - Distribution chart (histogram)

---

## Technical Implementation Plan

### Phase 1: Backend API Endpoints

#### Task 1.1: Student Submission History API
**File**: `/server/src/routes/submissions.js`

- [ ] Create `GET /api/submissions/my-submissions` endpoint
  - Returns all submissions for authenticated user
  - Includes activity details, scores, dates
  - Sorted by date (newest first)

- [ ] Create `GET /api/submissions/:submissionId/details` endpoint
  - Returns detailed submission with all answers and scores
  - Includes question text, student answer, correct answer, points
  - Includes rubric feedback for essays

#### Task 1.2: Admin Submission Analytics APIs
**File**: `/server/src/routes/submissions.js` or new `/server/src/routes/analytics.js`

- [ ] Create `GET /api/admin/students/:userId/submissions` endpoint
  - Returns all submissions for a specific student
  - Requires admin authentication
  - Includes scores and activity details

- [ ] Create `GET /api/admin/activities/:activityId/submissions` endpoint
  - Returns all submissions for a specific activity
  - Groups by student (latest submission per student)
  - Includes user details and scores
  - Requires admin authentication

- [ ] Create `GET /api/admin/activities/:activityId/statistics` endpoint
  - Returns aggregate statistics for an activity
  - Calculates average, median, min, max scores
  - Completion rates
  - Score distribution data

#### Task 1.3: Scoring Calculation Enhancement
**File**: `/server/src/utils/autoGrader.js` or new scoring utility

- [ ] Ensure all submission scores are calculated and stored
- [ ] Create function to recalculate scores for a submission
- [ ] Store total score and percentage in submission record
- [ ] Handle partial grading (some questions graded, some pending)

### Phase 2: Frontend - Student Views

#### Task 2.1: Student Submission History Page
**File**: `/client/src/pages/User/SubmissionHistory.jsx` (already exists, needs enhancement)

- [ ] Fetch and display all user submissions
- [ ] Show activity name, date, score, status
- [ ] Add card/table layout with visual score indicators
- [ ] Add "View Details" button for each submission
- [ ] Handle loading and error states
- [ ] Add empty state when no submissions

#### Task 2.2: Student Submission Detail Page
**File**: `/client/src/pages/User/SubmissionDetail.jsx` (NEW)

- [ ] Create new route `/submissions/:submissionId`
- [ ] Fetch detailed submission data
- [ ] Display:
  - Activity title and description
  - Overall score with visual progress bar
  - Question-by-question breakdown
  - Each question shows:
    - Question text
    - Student's answer (rendered appropriately)
    - Correct answer (for objective questions)
    - Points earned / possible points
    - Feedback (if available)
- [ ] Handle different question types (essay, multiple choice, checkboxes, short answer)
- [ ] Add "Back to History" navigation
- [ ] Print/export functionality

### Phase 3: Frontend - Admin Views

#### Task 3.1: Student List Page
**File**: `/client/src/pages/Admin/StudentList.jsx` (NEW)

- [ ] Create new page at `/admin/students`
- [ ] Fetch and display all users (non-admin)
- [ ] Show table with:
  - Name
  - Email
  - Number of submissions
  - Average score across all activities
  - Last activity date
- [ ] Add search/filter functionality
- [ ] Click on student to view their submission history
- [ ] Add to admin navigation menu

#### Task 3.2: Student Submission History (Admin View)
**File**: `/client/src/pages/Admin/StudentSubmissions.jsx` (NEW)

- [ ] Create new page at `/admin/students/:userId/submissions`
- [ ] Fetch and display all submissions for selected student
- [ ] Show student info header (name, email)
- [ ] Display submission list similar to student view
- [ ] Add ability to view/edit each submission
- [ ] Show progression over time (chart/graph)
- [ ] Add notes/comments feature for teacher

#### Task 3.3: Activity Reports Page
**File**: `/client/src/pages/Admin/ActivityReports.jsx` (NEW)

- [ ] Create new page at `/admin/reports/activities`
- [ ] Dropdown/selector to choose an activity
- [ ] Fetch latest submissions for all students for selected activity
- [ ] Display data table with:
  - Student name (sortable)
  - Score (sortable, with color coding)
  - Submission date (sortable)
  - Status indicator
  - View button
- [ ] Add filters (status, score range)
- [ ] Add search by student name
- [ ] Display summary statistics panel:
  - Total submissions
  - Average score with trend indicator
  - Completion rate
  - Score distribution chart (bar chart/histogram)
- [ ] Add export to CSV button
- [ ] Add to admin navigation menu

#### Task 3.4: Enhanced Grading Interface Integration
**File**: `/client/src/pages/Admin/GradingInterface.jsx` (ENHANCE)

- [ ] Add navigation from reports directly to grading interface
- [ ] Pre-populate with selected student and activity
- [ ] Add "Next Student" / "Previous Student" navigation
- [ ] Show score as it updates in real-time
- [ ] Add quick feedback templates

### Phase 4: UI/UX Enhancements

#### Task 4.1: Score Visualization Components
**File**: `/client/src/components/ScoreIndicator.jsx` (NEW)

- [ ] Create reusable score display component
- [ ] Show percentage with color coding (red < 60%, yellow 60-79%, green >= 80%)
- [ ] Circular progress indicator option
- [ ] Bar chart option
- [ ] Badge/pill option

#### Task 4.2: Statistics Dashboard Components
**File**: `/client/src/components/Statistics/` (NEW)

- [ ] Create `ScoreDistributionChart.jsx` - histogram of score ranges
- [ ] Create `SummaryStats.jsx` - cards showing avg, median, min, max
- [ ] Create `CompletionRate.jsx` - progress circle with percentage
- [ ] Create `TrendChart.jsx` - line chart showing performance over time

#### Task 4.3: Navigation Updates
**Files**: 
- `/client/src/components/Layout/Layout.jsx`
- Navigation component

- [ ] Add "My Submissions" link to user menu
- [ ] Add "Students" link to admin menu
- [ ] Add "Activity Reports" link to admin menu
- [ ] Update active states

### Phase 5: Database & Data Integrity

#### Task 5.1: Add Score Fields to Submissions
**File**: `/server/database/migrations/` (NEW migration)

- [ ] Add `total_score` column to `user_activity_submissions`
- [ ] Add `max_possible_score` column to `user_activity_submissions`
- [ ] Add `score_percentage` column to `user_activity_submissions`
- [ ] Add `grading_status` column (not_graded, partially_graded, fully_graded)
- [ ] Create migration script
- [ ] Run migration

#### Task 5.2: Scoring Calculation Job
**File**: `/server/src/utils/scoringService.js` (NEW)

- [ ] Create service to calculate scores for a submission
- [ ] Aggregate scores from all answers
- [ ] Update submission record with totals
- [ ] Handle partial scoring (when essays aren't graded yet)
- [ ] Create background job to recalculate existing submissions

### Phase 6: Testing & Polish

#### Task 6.1: Backend Testing
- [ ] Test all new API endpoints
- [ ] Test authentication/authorization
- [ ] Test edge cases (no submissions, missing data)
- [ ] Test performance with large datasets

#### Task 6.2: Frontend Testing
- [ ] Test all new pages and components
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test loading states and error handling
- [ ] Test navigation flows
- [ ] Test sorting and filtering functionality

#### Task 6.3: Integration Testing
- [ ] Test full user flow: submit → view scores
- [ ] Test full admin flow: view reports → grade → scores update
- [ ] Test real-time updates
- [ ] Test with different question types
- [ ] Test export functionality

#### Task 6.4: Polish & Documentation
- [ ] Add help text/tooltips where needed
- [ ] Ensure consistent styling
- [ ] Add loading skeletons
- [ ] Update user documentation
- [ ] Create admin guide for using reports

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
