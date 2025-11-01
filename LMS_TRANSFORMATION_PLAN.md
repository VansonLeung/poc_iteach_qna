# LMS Transformation Plan: Multi-Tenant School Management System

## Executive Summary

This document outlines a comprehensive plan to transform the current iTeach Q&A POC into a full-featured Learning Management System (LMS) with multi-tenant organizational structure supporting schools, classes, terms/years, subjects, and courses.

---

## Table of Contents

1. [Current System Analysis](#current-system-analysis)
2. [Target LMS Architecture](#target-lms-architecture)
3. [Entity Relationship Model](#entity-relationship-model)
4. [Design Decisions & Clarifications Needed](#design-decisions--clarifications-needed)
5. [Database Schema Design](#database-schema-design)
6. [Backend Implementation Plan](#backend-implementation-plan)
7. [Frontend Implementation Plan](#frontend-implementation-plan)
8. [Migration Strategy](#migration-strategy)
9. [Implementation Timeline](#implementation-timeline)
10. [Security & Privacy Considerations](#security--privacy-considerations)

---

## Current System Analysis

### Existing Architecture

**Current Models:**
- `User` - Basic user with role (admin/teacher/student)
- `Activity` - Learning activities
- `Question` - Reusable questions
- `UserActivitySubmission` - Student submissions
- `Rubric` - Grading rubrics

**Current Limitations:**
- ❌ No organizational hierarchy (schools)
- ❌ No class/section management
- ❌ No academic term/year support
- ❌ No subject/course structure
- ❌ No teacher-class assignments
- ❌ No student enrollment management
- ❌ No multi-tenant isolation
- ❌ No academic calendar support
- ❌ Activities are not tied to specific courses/classes
- ❌ Teachers cannot be assigned to specific subjects/classes
- ❌ No gradebook by course/term
- ❌ No transcript or progress report generation

**Current Strengths:**
- ✅ Solid authentication system
- ✅ Version control for content
- ✅ Flexible question builder
- ✅ Grading and rubric system
- ✅ Submission tracking
- ✅ Role-based access control foundation

---

## Target LMS Architecture

### Organizational Hierarchy

```
School (Organization)
  ├── Academic Years / Terms
  │   ├── Fall 2024
  │   ├── Spring 2025
  │   └── Summer 2025
  ├── Departments
  │   ├── Mathematics
  │   ├── Science
  │   └── Languages
  ├── Subjects (within Departments)
  │   ├── Algebra 1
  │   ├── Geometry
  │   └── Calculus
  ├── Grade Levels / Years
  │   ├── Grade 9
  │   ├── Grade 10
  │   ├── Grade 11
  │   └── Grade 12
  └── Classes / Sections
      ├── Math-101-A (Fall 2024, Teacher: John Doe)
      │   ├── Students (25 enrolled)
      │   ├── Schedule (Mon/Wed/Fri 9:00-10:00)
      │   └── Courses/Units
      │       ├── Course 1: Introduction to Algebra
      │       │   ├── Activities (Assignments, Quizzes, Exams)
      │       │   ├── Resources
      │       │   └── Gradebook
      │       └── Course 2: Linear Equations
      └── Math-101-B (Fall 2024, Teacher: Jane Smith)
```

### Multi-Tenancy Strategy

**Options to Consider:**

1. **Single Database with Tenant Isolation** (Recommended for MVP)
   - All schools share one database
   - Every table has `school_id` or `organization_id` foreign key
   - Application-level filtering ensures data isolation
   - Pros: Easier maintenance, cost-effective, simpler backups
   - Cons: Less data isolation, shared resources

2. **Database-per-Tenant** (Future consideration)
   - Each school gets separate database
   - Complete data isolation
   - Pros: Better isolation, independent scaling, compliance
   - Cons: Complex migrations, higher maintenance

3. **Hybrid Approach**
   - Shared database for small/medium schools
   - Dedicated databases for large/premium schools

**Decision Needed:** Which multi-tenancy approach to implement?

---

## Entity Relationship Model

### Core LMS Entities

```
organizations (schools)
  ↓ one-to-many
academic_years
  ↓ one-to-many
terms
  ↓ many-to-many (via class_terms)
classes
  ↓ many-to-many
students (via enrollments)
teachers (via class_teachers)
courses (via class_courses)
  ↓ one-to-many
activities
  ↓ one-to-many
submissions
```

### Detailed Entity Model

#### 1. **Organization (School)**
- Properties:
  - ID, name, code (unique), type (K-12, university, corporate)
  - Address, contact info
  - Logo, branding settings
  - Status (active/inactive)
  - Subscription tier (free/basic/premium/enterprise)
  - Max students, max teachers
  - Settings (JSON: academic calendar, grading scale, etc.)

#### 2. **Academic Year**
- Properties:
  - ID, organization_id
  - Name (e.g., "2024-2025")
  - Start date, end date
  - Status (upcoming/active/completed/archived)
  - Is current year (boolean)

#### 3. **Term / Semester**
- Properties:
  - ID, organization_id, academic_year_id
  - Name (e.g., "Fall 2024", "Semester 1", "Quarter 3")
  - Term type (semester, quarter, trimester, custom)
  - Start date, end date
  - Status (upcoming/active/completed)

#### 4. **Department**
- Properties:
  - ID, organization_id
  - Name (e.g., "Mathematics", "Science")
  - Description
  - Department head (user_id)
  - Status (active/inactive)

#### 5. **Subject**
- Properties:
  - ID, organization_id, department_id (optional)
  - Name (e.g., "Algebra 1", "Biology", "World History")
  - Code (e.g., "MATH101", "BIO201")
  - Description
  - Credits (if applicable)
  - Status (active/archived)

#### 6. **Grade Level / Year**
- Properties:
  - ID, organization_id
  - Name (e.g., "Grade 9", "Freshman", "Year 1")
  - Order/level (numeric for sorting)
  - Description

#### 7. **Class / Section**
- Properties:
  - ID, organization_id, subject_id
  - Class name (e.g., "Math-101-A")
  - Class code (e.g., "MTH101A-F24")
  - Grade level (optional)
  - Room number
  - Max capacity
  - Schedule (JSON: days, times)
  - Status (active/completed/cancelled/archived)
  - Academic year, term

#### 8. **Course / Unit**
- Properties:
  - ID, organization_id, subject_id, class_id (optional)
  - Course name (e.g., "Introduction to Algebra")
  - Course code
  - Description
  - Duration (weeks)
  - Order/sequence
  - Status (draft/published/archived)
  - Learning objectives (JSON/text)

#### 9. **Enrollment** (Students in Classes)
- Properties:
  - ID, student_id, class_id, term_id
  - Enrollment date
  - Status (enrolled/withdrawn/completed/failed)
  - Final grade (optional)
  - Attendance count
  - Dropped date (if applicable)

#### 10. **Class Teacher Assignment**
- Properties:
  - ID, teacher_id, class_id, term_id
  - Role (primary/co-teacher/assistant)
  - Start date, end date
  - Status (active/inactive)

#### 11. **User Extensions**
- Enhanced User model:
  - organization_id (which school they belong to)
  - student_id (for students - external ID)
  - employee_id (for teachers - external ID)
  - Grade level (for students)
  - Department (for teachers)
  - Graduation year (for students)
  - Hire date (for teachers)

---

## Design Decisions & Clarifications Needed

### 🔴 Critical Decisions Required

#### 1. **Multi-Tenancy Approach**
**Question:** Should we use single shared database or database-per-school?

**Options:**
- **A) Single Database + Tenant Filtering** (Recommended)
  - Every table includes `organization_id`
  - Application enforces filtering
  - Simpler for MVP, easier to manage

- **B) Database-per-School**
  - Complete isolation
  - Better for enterprise clients
  - More complex infrastructure

**Recommendation:** Start with Option A, design for Option B compatibility.

---

#### 2. **Subject vs Course Distinction**
**Question:** What's the relationship between Subject, Course, and Activity?

**Options:**
- **Option A: Subject → Course → Activity**
  - Subject: "Mathematics" (broad category)
  - Course: "Algebra 1 - Unit 1: Linear Equations" (specific unit)
  - Activity: "Homework 1", "Quiz 1" (assignments)

- **Option B: Subject → Activity directly**
  - Subject: "Algebra 1"
  - Activity: Tagged with topics/units
  - No intermediate "Course" entity

- **Option C: Flexible hierarchy**
  - Support both: Activities can belong to Course or Subject
  - Course is optional organizational layer

**Recommendation:** Option A for structured LMS, Option C for flexibility.

---

#### 3. **Class Management Complexity**
**Question:** How granular should class scheduling/management be?

**Options:**
- **Minimal:** Just class roster + term + teacher
- **Standard:** + meeting times + room + capacity
- **Advanced:** + attendance tracking + seating charts + class announcements

**Recommendation:** Start with Standard, prepare for Advanced features.

---

#### 4. **Grade Scale & Grading Policies**
**Question:** Should grading scales be per-school, per-course, or system-wide?

**Considerations:**
- Different schools use different scales (letter grades, percentages, 4.0 GPA, IB scale)
- Some courses may have weighted grades
- Some schools have different scales per grade level

**Options:**
- **A) School-level default** with course-level overrides
- **B) Per-course grading policies**
- **C) Flexible: Support both**

**Recommendation:** Option A - School default, course override.

---

#### 5. **Activity Visibility & Assignment**
**Question:** How are activities assigned to students?

**Options:**
- **A) Class-level assignment:**
  - Teacher assigns activity to entire class
  - All enrolled students see it automatically

- **B) Individual assignment:**
  - Teacher can assign to specific students
  - Supports differentiation

- **C) Both:**
  - Default: class-wide
  - Optional: individual assignments

**Recommendation:** Option C for flexibility.

---

#### 6. **Term/Semester vs Continuous Enrollment**
**Question:** Should we support schools with no term structure (continuous/rolling enrollment)?

**Examples:**
- Traditional: Fall/Spring semesters
- Trimester: 3 terms per year
- Quarter system: 4 quarters
- Year-round: No breaks, rolling enrollment
- Self-paced: Students progress at own pace

**Recommendation:** Design for term-based, allow "ongoing" term type for continuous.

---

#### 7. **Content Sharing Across Schools**
**Question:** Can schools share questions/activities/courses?

**Options:**
- **A) Isolated:** Each school's content is private
- **B) Marketplace:** Public library of shared content
- **C) Hybrid:** Private + opt-in sharing

**Recommendation:** Option C - Start private, add sharing layer later.

---

#### 8. **Student Progression & Prerequisites**
**Question:** Should the system enforce prerequisites (e.g., must pass Algebra 1 before Algebra 2)?

**Options:**
- **A) No enforcement:** Teachers manually manage
- **B) Advisory warnings:** System suggests prerequisites
- **C) Hard enforcement:** System blocks enrollment

**Recommendation:** Option B for MVP, build towards C.

---

#### 9. **Gradebook Calculation**
**Question:** How should final grades be calculated?

**Considerations:**
- Weighted categories (Homework 20%, Quizzes 30%, Exams 50%)
- Drop lowest scores
- Extra credit
- Attendance/participation
- Curved grading
- Standards-based vs traditional

**Recommendation:** Weighted categories with configurable policies per course.

---

#### 10. **Parent/Guardian Access**
**Question:** Should parents have accounts to view student progress?

**Options:**
- **A) No parent access** (MVP)
- **B) Read-only parent portal**
- **C) Parent-teacher messaging**

**Recommendation:** Option A for MVP, Option B for v2.

---

### 🟡 Important Design Questions

#### 11. **Transfer Students**
**Question:** How to handle students transferring between schools?

**Options:**
- Create new account at new school
- Transfer account + history
- Linked accounts (view old school records)

---

#### 12. **Co-teaching & Team Teaching**
**Question:** Can multiple teachers manage one class?

**Recommendation:** Yes - support primary + co-teachers.

---

#### 13. **Class Sections vs Merged Classes**
**Question:** Can one activity be assigned to multiple sections at once?

**Recommendation:** Yes - support multi-section assignments.

---

#### 14. **Attendance Tracking**
**Question:** In scope for LMS or separate system?

**Recommendation:** Out of scope for MVP, add in v2.

---

#### 15. **Student Information System (SIS) Integration**
**Question:** Should LMS integrate with external SIS (PowerSchool, Infinite Campus)?

**Recommendation:** Design API for future integration, manual entry for MVP.

---

## Database Schema Design

### New Tables

#### 1. Organizations (Schools)

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- Short code like "JFKHS", "MIT"
  type TEXT NOT NULL CHECK(type IN ('k12', 'university', 'corporate', 'other')),

  -- Contact & Address
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'USA',
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Branding
  logo_url TEXT,
  primary_color TEXT, -- Hex color
  secondary_color TEXT,

  -- Subscription & Limits
  subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'basic', 'premium', 'enterprise')),
  max_students INTEGER DEFAULT 100,
  max_teachers INTEGER DEFAULT 10,
  max_storage_mb INTEGER DEFAULT 1000,

  -- Settings (JSON)
  settings TEXT, -- { "timezone", "locale", "gradingScale", "academicCalendar", etc. }

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_organizations_code ON organizations(code);
CREATE INDEX idx_organizations_status ON organizations(status);
```

---

#### 2. Academic Years

```sql
CREATE TABLE academic_years (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,

  name TEXT NOT NULL, -- "2024-2025", "AY 2024"
  start_date TEXT NOT NULL, -- ISO date
  end_date TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'active', 'completed', 'archived')),
  is_current INTEGER DEFAULT 0, -- Boolean: 1 if current year

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_academic_years_org ON academic_years(organization_id);
CREATE INDEX idx_academic_years_status ON academic_years(status);
CREATE INDEX idx_academic_years_current ON academic_years(is_current);
```

---

#### 3. Terms / Semesters

```sql
CREATE TABLE terms (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,

  name TEXT NOT NULL, -- "Fall 2024", "Semester 1", "Q3"
  term_type TEXT NOT NULL CHECK(term_type IN ('semester', 'quarter', 'trimester', 'summer', 'custom', 'ongoing')),
  term_number INTEGER, -- 1, 2, 3, 4 (for ordering)

  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'active', 'completed')),
  is_current INTEGER DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  UNIQUE(organization_id, academic_year_id, name)
);

CREATE INDEX idx_terms_org ON terms(organization_id);
CREATE INDEX idx_terms_year ON terms(academic_year_id);
CREATE INDEX idx_terms_status ON terms(status);
```

---

#### 4. Departments

```sql
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,

  name TEXT NOT NULL, -- "Mathematics", "Science"
  code TEXT, -- "MATH", "SCI"
  description TEXT,

  department_head_id TEXT, -- User ID of department head

  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (department_head_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_departments_head ON departments(department_head_id);
```

---

#### 5. Subjects

```sql
CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  department_id TEXT,

  name TEXT NOT NULL, -- "Algebra 1", "Biology", "World History"
  code TEXT, -- "ALG1", "BIO101"
  description TEXT,

  credits REAL, -- Credit hours/units
  grade_level TEXT, -- "9", "10-11", "all"

  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_subjects_org ON subjects(organization_id);
CREATE INDEX idx_subjects_dept ON subjects(department_id);
CREATE INDEX idx_subjects_status ON subjects(status);
```

---

#### 6. Grade Levels

```sql
CREATE TABLE grade_levels (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,

  name TEXT NOT NULL, -- "Grade 9", "Freshman", "Year 1"
  level_number INTEGER NOT NULL, -- For sorting: 9, 10, 11, 12
  description TEXT,

  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(organization_id, level_number)
);

CREATE INDEX idx_grade_levels_org ON grade_levels(organization_id);
```

---

#### 7. Classes / Sections

```sql
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  term_id TEXT NOT NULL,

  class_name TEXT NOT NULL, -- "Math-101-A", "Biology Period 3"
  class_code TEXT NOT NULL, -- "MTH101A-F24" (unique identifier)

  grade_level_id TEXT,
  room_number TEXT,
  max_capacity INTEGER DEFAULT 30,

  -- Schedule (JSON)
  schedule TEXT, -- {"monday": "09:00-10:00", "wednesday": "09:00-10:00"}

  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft', 'active', 'completed', 'cancelled', 'archived')),

  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  FOREIGN KEY (term_id) REFERENCES terms(id),
  FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE(organization_id, class_code)
);

CREATE INDEX idx_classes_org ON classes(organization_id);
CREATE INDEX idx_classes_subject ON classes(subject_id);
CREATE INDEX idx_classes_term ON classes(term_id);
CREATE INDEX idx_classes_status ON classes(status);
```

---

#### 8. Courses / Units

```sql
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,

  course_name TEXT NOT NULL, -- "Introduction to Algebra"
  course_code TEXT, -- "ALG1-U1"
  description TEXT,

  duration_weeks INTEGER,
  order_index INTEGER DEFAULT 0, -- Sequence within subject

  -- Learning objectives
  learning_objectives TEXT, -- JSON array or formatted text

  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),

  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_courses_org ON courses(organization_id);
CREATE INDEX idx_courses_subject ON courses(subject_id);
CREATE INDEX idx_courses_status ON courses(status);
```

---

#### 9. Class-Course Mapping

```sql
CREATE TABLE class_courses (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  course_id TEXT NOT NULL,

  order_index INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,

  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('scheduled', 'active', 'completed')),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE(class_id, course_id)
);

CREATE INDEX idx_class_courses_class ON class_courses(class_id);
CREATE INDEX idx_class_courses_course ON class_courses(course_id);
```

---

#### 10. Student Enrollments

```sql
CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  term_id TEXT NOT NULL,

  enrollment_date TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK(status IN ('enrolled', 'withdrawn', 'completed', 'failed')),

  -- Final grade
  final_grade_letter TEXT, -- "A", "B+", "C"
  final_grade_percentage REAL,
  final_grade_points REAL, -- GPA points

  -- Withdrawal info
  withdrawn_date TEXT,
  withdrawal_reason TEXT,

  -- Attendance
  attendance_count INTEGER DEFAULT 0,
  absence_count INTEGER DEFAULT 0,
  tardy_count INTEGER DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES terms(id),
  UNIQUE(student_id, class_id, term_id)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_class ON enrollments(class_id);
CREATE INDEX idx_enrollments_term ON enrollments(term_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

---

#### 11. Teacher-Class Assignments

```sql
CREATE TABLE class_teachers (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  term_id TEXT NOT NULL,

  role TEXT NOT NULL DEFAULT 'primary' CHECK(role IN ('primary', 'co-teacher', 'assistant', 'substitute')),

  start_date TEXT NOT NULL,
  end_date TEXT,

  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES terms(id),
  UNIQUE(teacher_id, class_id, term_id)
);

CREATE INDEX idx_class_teachers_teacher ON class_teachers(teacher_id);
CREATE INDEX idx_class_teachers_class ON class_teachers(class_id);
CREATE INDEX idx_class_teachers_term ON class_teachers(term_id);
```

---

#### 12. Activity-Course/Class Mapping

```sql
CREATE TABLE activity_assignments (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,

  -- Can be assigned to course OR class OR both
  course_id TEXT,
  class_id TEXT,

  -- Assignment dates
  assigned_date TEXT NOT NULL DEFAULT (datetime('now')),
  due_date TEXT,
  available_from TEXT,
  available_until TEXT,

  -- Grading
  weight REAL DEFAULT 1.0, -- Weight in gradebook
  category TEXT, -- "homework", "quiz", "exam", "project"

  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),

  assigned_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  CHECK ((course_id IS NOT NULL) OR (class_id IS NOT NULL))
);

CREATE INDEX idx_activity_assignments_activity ON activity_assignments(activity_id);
CREATE INDEX idx_activity_assignments_course ON activity_assignments(course_id);
CREATE INDEX idx_activity_assignments_class ON activity_assignments(class_id);
CREATE INDEX idx_activity_assignments_due ON activity_assignments(due_date);
```

---

#### 13. Individual Student Assignments (Optional)

```sql
-- For differentiated instruction: assign to specific students
CREATE TABLE student_activity_assignments (
  id TEXT PRIMARY KEY,
  activity_assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,

  due_date TEXT, -- Override class due date
  available_from TEXT,
  available_until TEXT,

  status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned', 'in_progress', 'submitted', 'graded', 'excused')),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (activity_assignment_id) REFERENCES activity_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(activity_assignment_id, student_id)
);

CREATE INDEX idx_student_assignments_activity ON student_activity_assignments(activity_assignment_id);
CREATE INDEX idx_student_assignments_student ON student_activity_assignments(student_id);
```

---

#### 14. Grading Scales

```sql
CREATE TABLE grading_scales (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,

  name TEXT NOT NULL, -- "Standard Letter Grades", "IB Scale"
  description TEXT,

  scale_type TEXT NOT NULL CHECK(scale_type IN ('letter', 'percentage', 'gpa', 'custom')),
  scale_config TEXT NOT NULL, -- JSON: {"A": {"min": 90, "gpa": 4.0}, "B": {...}}

  is_default INTEGER DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_grading_scales_org ON grading_scales(organization_id);
```

---

#### 15. Course Grading Policies

```sql
CREATE TABLE course_grading_policies (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL UNIQUE,
  grading_scale_id TEXT,

  -- Category weights (JSON)
  category_weights TEXT, -- {"homework": 0.2, "quizzes": 0.3, "exams": 0.5}

  -- Policies
  drop_lowest_count INTEGER DEFAULT 0, -- Drop N lowest scores
  allow_late_submissions INTEGER DEFAULT 1,
  late_penalty_percentage REAL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (grading_scale_id) REFERENCES grading_scales(id) ON DELETE SET NULL
);
```

---

### Modified Existing Tables

#### Users Table Updates

```sql
-- Add columns to existing users table
ALTER TABLE users ADD COLUMN organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN student_id TEXT; -- External student ID
ALTER TABLE users ADD COLUMN employee_id TEXT; -- External employee ID
ALTER TABLE users ADD COLUMN grade_level_id TEXT REFERENCES grade_levels(id);
ALTER TABLE users ADD COLUMN department_id TEXT REFERENCES departments(id);
ALTER TABLE users ADD COLUMN graduation_year INTEGER;
ALTER TABLE users ADD COLUMN hire_date TEXT;
ALTER TABLE users ADD COLUMN profile_photo_url TEXT;

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_grade_level ON users(grade_level_id);
CREATE INDEX idx_users_department ON users(department_id);
```

---

#### Activities Table Updates

```sql
-- Add organization context
ALTER TABLE activities ADD COLUMN organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN subject_id TEXT REFERENCES subjects(id);
ALTER TABLE activities ADD COLUMN activity_type TEXT CHECK(activity_type IN ('assignment', 'quiz', 'exam', 'project', 'discussion', 'resource'));
ALTER TABLE activities ADD COLUMN estimated_duration_minutes INTEGER;

CREATE INDEX idx_activities_organization ON activities(organization_id);
CREATE INDEX idx_activities_subject ON activities(subject_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
```

---

#### Questions Table Updates

```sql
ALTER TABLE questions ADD COLUMN organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE questions ADD COLUMN subject_id TEXT REFERENCES subjects(id);
ALTER TABLE questions ADD COLUMN difficulty_level TEXT CHECK(difficulty_level IN ('easy', 'medium', 'hard'));
ALTER TABLE questions ADD COLUMN is_public INTEGER DEFAULT 0; -- Can be shared across organizations

CREATE INDEX idx_questions_organization ON questions(organization_id);
CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
```

---

#### Submissions Table Updates

```sql
ALTER TABLE user_activity_submissions ADD COLUMN class_id TEXT REFERENCES classes(id);
ALTER TABLE user_activity_submissions ADD COLUMN enrollment_id TEXT REFERENCES enrollments(id);
ALTER TABLE user_activity_submissions ADD COLUMN late_submission INTEGER DEFAULT 0;
ALTER TABLE user_activity_submissions ADD COLUMN late_penalty_applied REAL;

CREATE INDEX idx_submissions_class ON user_activity_submissions(class_id);
CREATE INDEX idx_submissions_enrollment ON user_activity_submissions(enrollment_id);
```

---

## Backend Implementation Plan

### Phase 1: Foundation & Multi-Tenancy (Week 1-2)

#### Task 1.1: Organization Management APIs

**Files:**
- `/server/src/models/Organization.js` (NEW)
- `/server/src/routes/organizations.js` (NEW)
- `/server/src/middleware/tenantContext.js` (NEW)

**Implementation:**

1. **Create Organization Model**
   ```javascript
   // /server/src/models/Organization.js
   const Organization = sequelize.define('Organization', {
     id: { type: DataTypes.UUID, primaryKey: true },
     name: { type: DataTypes.STRING, allowNull: false },
     code: { type: DataTypes.STRING, unique: true, allowNull: false },
     type: { type: DataTypes.ENUM('k12', 'university', 'corporate', 'other') },
     // ... other fields
   });
   ```

2. **Tenant Context Middleware**
   ```javascript
   // /server/src/middleware/tenantContext.js
   // Extracts organization_id from JWT or subdomain
   // Injects into req.organizationId
   // All queries filtered by organization_id
   ```

3. **Organization CRUD APIs**
   - `POST /api/organizations` - Create organization (super admin only)
   - `GET /api/organizations/:id` - Get organization details
   - `PUT /api/organizations/:id` - Update organization
   - `DELETE /api/organizations/:id` - Archive organization

4. **Update Authentication**
   - JWT includes `organization_id`
   - Login checks user belongs to organization
   - Add organization selector for super admins

**Acceptance Criteria:**
- [ ] Multiple organizations can be created
- [ ] Users scoped to their organization
- [ ] Data isolated between organizations
- [ ] Super admin can manage all organizations

---

#### Task 1.2: Academic Year & Term Management

**Files:**
- `/server/src/models/AcademicYear.js` (NEW)
- `/server/src/models/Term.js` (NEW)
- `/server/src/routes/academicYears.js` (NEW)
- `/server/src/routes/terms.js` (NEW)

**APIs:**

**Academic Years:**
- `POST /api/academic-years` - Create academic year
- `GET /api/academic-years` - List all years for organization
- `GET /api/academic-years/:id` - Get year details
- `PUT /api/academic-years/:id` - Update year
- `PUT /api/academic-years/:id/set-current` - Set as current year
- `DELETE /api/academic-years/:id` - Archive year

**Terms:**
- `POST /api/terms` - Create term
- `GET /api/terms?academicYearId=uuid` - List terms
- `GET /api/terms/:id` - Get term details
- `PUT /api/terms/:id` - Update term
- `PUT /api/terms/:id/set-current` - Set as current term
- `DELETE /api/terms/:id` - Archive term

**Utilities:**
- `getCurrentAcademicYear(organizationId)` - Get active year
- `getCurrentTerm(organizationId)` - Get active term

**Acceptance Criteria:**
- [ ] Admin can create/manage academic years
- [ ] Admin can create terms within years
- [ ] System tracks "current" year/term
- [ ] Terms validate dates within year boundaries

---

#### Task 1.3: Department & Subject Management

**Files:**
- `/server/src/models/Department.js` (NEW)
- `/server/src/models/Subject.js` (NEW)
- `/server/src/routes/departments.js` (NEW)
- `/server/src/routes/subjects.js` (NEW)

**APIs:**

**Departments:**
- `POST /api/departments` - Create department
- `GET /api/departments` - List departments
- `GET /api/departments/:id` - Get department details
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Archive department

**Subjects:**
- `POST /api/subjects` - Create subject
- `GET /api/subjects?departmentId=uuid` - List subjects
- `GET /api/subjects/:id` - Get subject details
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Archive subject

**Acceptance Criteria:**
- [ ] Admin can organize departments
- [ ] Subjects linked to departments
- [ ] Subject codes are unique per organization
- [ ] Teachers can be assigned to departments

---

### Phase 2: Class & Enrollment Management (Week 3-4)

#### Task 2.1: Grade Level & Class Management

**Files:**
- `/server/src/models/GradeLevel.js` (NEW)
- `/server/src/models/Class.js` (NEW)
- `/server/src/routes/gradeLevels.js` (NEW)
- `/server/src/routes/classes.js` (NEW)

**APIs:**

**Grade Levels:**
- `POST /api/grade-levels` - Create grade level
- `GET /api/grade-levels` - List grade levels
- `PUT /api/grade-levels/:id` - Update grade level

**Classes:**
- `POST /api/classes` - Create class/section
- `GET /api/classes?termId=uuid&subjectId=uuid&teacherId=uuid` - List classes
- `GET /api/classes/:id` - Get class details with roster
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Archive class
- `GET /api/classes/:id/roster` - Get enrolled students
- `GET /api/classes/:id/schedule` - Get class schedule

**Acceptance Criteria:**
- [ ] Admin can create classes for terms
- [ ] Classes linked to subjects and terms
- [ ] Class codes are unique
- [ ] Schedule stored as structured JSON

---

#### Task 2.2: Student Enrollment System

**Files:**
- `/server/src/models/Enrollment.js` (NEW)
- `/server/src/routes/enrollments.js` (NEW)
- `/server/src/utils/enrollmentService.js` (NEW)

**APIs:**
- `POST /api/enrollments` - Enroll student in class
- `POST /api/enrollments/bulk` - Bulk enroll (CSV import)
- `GET /api/enrollments?classId=uuid&studentId=uuid` - List enrollments
- `GET /api/enrollments/:id` - Get enrollment details
- `PUT /api/enrollments/:id` - Update enrollment
- `PUT /api/enrollments/:id/withdraw` - Withdraw student
- `DELETE /api/enrollments/:id` - Delete enrollment

**Service Functions:**
- `enrollStudent(studentId, classId, termId)` - Enroll with validation
- `withdrawStudent(enrollmentId, reason)` - Withdraw with reason
- `getStudentSchedule(studentId, termId)` - Get all enrolled classes
- `checkEnrollmentCapacity(classId)` - Check if class full

**Acceptance Criteria:**
- [ ] Students can be enrolled in classes
- [ ] System checks capacity limits
- [ ] Students cannot enroll in conflicting classes (same time)
- [ ] Withdrawal tracked with reason and date
- [ ] Bulk enrollment via CSV

---

#### Task 2.3: Teacher-Class Assignments

**Files:**
- `/server/src/models/ClassTeacher.js` (NEW)
- `/server/src/routes/classTeachers.js` (NEW)

**APIs:**
- `POST /api/class-teachers` - Assign teacher to class
- `GET /api/class-teachers?classId=uuid&teacherId=uuid` - List assignments
- `PUT /api/class-teachers/:id` - Update assignment
- `DELETE /api/class-teachers/:id` - Remove teacher from class

**Utilities:**
- `getTeacherClasses(teacherId, termId)` - Get teacher's schedule
- `getClassTeachers(classId)` - Get all teachers for class

**Acceptance Criteria:**
- [ ] Teachers assigned to classes per term
- [ ] Support primary + co-teachers
- [ ] Teachers can view their assigned classes
- [ ] System prevents duplicate assignments

---

### Phase 3: Course & Activity Assignment (Week 5-6)

#### Task 3.1: Course/Unit Management

**Files:**
- `/server/src/models/Course.js` (NEW)
- `/server/src/models/ClassCourse.js` (NEW)
- `/server/src/routes/courses.js` (NEW)

**APIs:**
- `POST /api/courses` - Create course/unit
- `GET /api/courses?subjectId=uuid` - List courses
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Archive course
- `POST /api/classes/:classId/courses` - Add course to class
- `GET /api/classes/:classId/courses` - Get class courses

**Acceptance Criteria:**
- [ ] Courses created for subjects
- [ ] Courses can be sequenced (order_index)
- [ ] Courses assigned to classes
- [ ] Learning objectives stored

---

#### Task 3.2: Activity Assignment System

**Files:**
- `/server/src/models/ActivityAssignment.js` (NEW)
- `/server/src/models/StudentActivityAssignment.js` (NEW)
- `/server/src/routes/activityAssignments.js` (NEW)

**APIs:**
- `POST /api/activity-assignments` - Assign activity to class/course
- `GET /api/activity-assignments?classId=uuid&courseId=uuid` - List assignments
- `GET /api/activity-assignments/:id` - Get assignment details
- `PUT /api/activity-assignments/:id` - Update assignment
- `DELETE /api/activity-assignments/:id` - Delete assignment
- `POST /api/activity-assignments/:id/students` - Assign to specific students
- `GET /api/students/:studentId/assignments` - Get student's assignments

**Service Functions:**
- `assignActivityToClass(activityId, classId, dueDate, category)` - Assign to class
- `assignActivityToStudent(activityId, studentId, dueDate)` - Individual assignment
- `getStudentAssignments(studentId, classId, status)` - Get assignments for student
- `checkAssignmentAvailability(assignmentId, studentId)` - Check if available

**Acceptance Criteria:**
- [ ] Teachers assign activities to entire class
- [ ] Teachers can assign to individual students
- [ ] Due dates and availability windows enforced
- [ ] Students see only their assignments
- [ ] Activities categorized (homework, quiz, exam)

---

### Phase 4: Grading & Gradebook (Week 7-8)

#### Task 4.1: Grading Scale Configuration

**Files:**
- `/server/src/models/GradingScale.js` (NEW)
- `/server/src/models/CourseGradingPolicy.js` (NEW)
- `/server/src/routes/gradingScales.js` (NEW)

**APIs:**
- `POST /api/grading-scales` - Create grading scale
- `GET /api/grading-scales` - List scales for organization
- `PUT /api/grading-scales/:id` - Update scale
- `DELETE /api/grading-scales/:id` - Delete scale
- `POST /api/courses/:courseId/grading-policy` - Set course policy
- `GET /api/courses/:courseId/grading-policy` - Get course policy

**Utilities:**
- `calculateLetterGrade(percentage, scalingId)` - Convert to letter grade
- `calculateGPA(letterGrade, scaleId)` - Calculate GPA points

**Acceptance Criteria:**
- [ ] Organizations define grading scales
- [ ] Courses can override default scale
- [ ] Weighted category grading supported
- [ ] Drop lowest scores supported

---

#### Task 4.2: Enhanced Submission with Enrollment Context

**Files:**
- `/server/src/routes/submissions.js` (MODIFY)
- `/server/src/utils/scoringService.js` (MODIFY)

**Updates:**
- Link submissions to enrollments
- Track late submissions
- Apply late penalties per policy
- Calculate grades with category weights

**New APIs:**
- `GET /api/classes/:classId/submissions?activityId=uuid` - All class submissions
- `GET /api/students/:studentId/grades?classId=uuid` - Student grades for class
- `GET /api/classes/:classId/gradebook` - Full gradebook view

**Acceptance Criteria:**
- [ ] Submissions linked to class enrollment
- [ ] Late submissions flagged
- [ ] Penalties applied per policy
- [ ] Gradebook aggregates all activity grades

---

#### Task 4.3: Final Grade Calculation

**Files:**
- `/server/src/utils/gradeCalculator.js` (NEW)

**Functions:**
- `calculateCourseGrade(studentId, courseId)` - Calculate final grade
- `calculateCategoryGrade(studentId, courseId, category)` - Grade per category
- `applyWeights(scores, weights)` - Apply category weights
- `dropLowestScores(scores, count)` - Drop N lowest
- `calculateClassGPA(classId)` - Class average GPA

**Acceptance Criteria:**
- [ ] Category weights applied correctly
- [ ] Drop lowest implemented
- [ ] Final grades calculated accurately
- [ ] GPA calculated per scale

---

### Phase 5: User Management Enhancements (Week 9)

#### Task 5.1: Enhanced User Profiles

**Files:**
- `/server/src/routes/users.js` (MODIFY)
- `/server/src/routes/students.js` (NEW)
- `/server/src/routes/teachers.js` (NEW)

**APIs:**

**Student APIs:**
- `GET /api/students?gradeLevel=9&classId=uuid` - List students
- `GET /api/students/:id/schedule` - Student schedule
- `GET /api/students/:id/transcript` - Student transcript
- `PUT /api/students/:id` - Update student profile

**Teacher APIs:**
- `GET /api/teachers?departmentId=uuid` - List teachers
- `GET /api/teachers/:id/schedule` - Teacher schedule
- `GET /api/teachers/:id/classes` - Teacher's classes

**Acceptance Criteria:**
- [ ] Students have grade levels, student IDs
- [ ] Teachers have departments, employee IDs
- [ ] Profiles include additional metadata
- [ ] Student schedules generated from enrollments
- [ ] Teacher schedules generated from assignments

---

#### Task 5.2: Bulk User Import

**Files:**
- `/server/src/routes/import.js` (NEW)
- `/server/src/utils/importService.js` (NEW)

**APIs:**
- `POST /api/import/students` - Import students via CSV
- `POST /api/import/teachers` - Import teachers via CSV
- `POST /api/import/enrollments` - Import enrollments via CSV

**CSV Format:**
```csv
student_id,first_name,last_name,email,grade_level,classes
S12345,John,Doe,john@school.com,9,"Math-101-A,ENG-101-B"
```

**Acceptance Criteria:**
- [ ] CSV import for students
- [ ] CSV import for teachers
- [ ] CSV import for enrollments
- [ ] Validation errors reported
- [ ] Dry-run mode supported

---

### Phase 6: Reporting & Analytics (Week 10)

#### Task 6.1: Academic Reports

**Files:**
- `/server/src/routes/reports.js` (NEW)
- `/server/src/utils/reportGenerator.js` (NEW)

**APIs:**
- `GET /api/reports/class-roster/:classId` - Class roster PDF/CSV
- `GET /api/reports/gradebook/:classId` - Gradebook export
- `GET /api/reports/transcript/:studentId` - Student transcript
- `GET /api/reports/student-progress/:studentId` - Progress report
- `GET /api/reports/teacher-summary/:teacherId` - Teacher summary

**Acceptance Criteria:**
- [ ] Generate class rosters
- [ ] Export gradebooks to CSV/Excel
- [ ] Generate student transcripts
- [ ] Generate progress reports

---

## Frontend Implementation Plan

### Phase 1: Organization & Setup (Week 1)

#### Task F1.1: Organization Selector & Context

**Files:**
- `/client/src/contexts/OrganizationContext.jsx` (NEW)
- `/client/src/components/OrganizationSelector.jsx` (NEW)

**Implementation:**
- Organization context provides current organization
- Organization selector for super admins
- All API calls include organization context
- Store organization in localStorage

**Acceptance Criteria:**
- [ ] Organization context available app-wide
- [ ] Super admins can switch organizations
- [ ] Regular users see only their organization

---

#### Task F1.2: Navigation Updates

**Files:**
- `/client/src/components/Layout/Navigation.jsx` (MODIFY)

**New Menu Items:**

**Admin Menu:**
- Dashboard
- **Organization Settings** (NEW)
  - Academic Years
  - Terms
  - Departments
  - Subjects
  - Grade Levels
  - Grading Scales
- **Classes** (NEW)
  - My Classes (teacher view)
  - All Classes (admin view)
- Activities
- Questions
- **Students** (NEW)
- **Teachers** (NEW)
- Reports
- Rubrics

**Teacher Menu:**
- Dashboard
- My Classes
- Activities
- Questions
- Students (in my classes)
- Gradebook
- Reports

**Student Menu:**
- Dashboard
- My Classes
- Assignments
- Grades
- My Submissions

**Acceptance Criteria:**
- [ ] Role-based navigation menus
- [ ] New pages accessible from menu
- [ ] Active state highlighting works

---

### Phase 2: Admin Setup Pages (Week 2-3)

#### Task F2.1: Academic Year & Term Management

**Files:**
- `/client/src/pages/Admin/AcademicYears/AcademicYearList.jsx` (NEW)
- `/client/src/pages/Admin/AcademicYears/AcademicYearForm.jsx` (NEW)
- `/client/src/pages/Admin/Terms/TermList.jsx` (NEW)
- `/client/src/pages/Admin/Terms/TermForm.jsx` (NEW)

**Page: Academic Year List**
- Table of all academic years
- Columns: Name, Start Date, End Date, Status, Current
- Actions: Create, Edit, Set Current, Archive
- Filter by status

**Page: Academic Year Form**
- Create/Edit academic year
- Fields: Name, Start Date, End Date
- Auto-create default terms (optional)

**Page: Term List**
- Table of terms within academic year
- Columns: Name, Type, Dates, Status
- Actions: Create, Edit, Set Current

**Acceptance Criteria:**
- [ ] Admin can create academic years
- [ ] Admin can create terms
- [ ] One year/term marked as current
- [ ] Visual calendar view (optional)

---

#### Task F2.2: Department & Subject Management

**Files:**
- `/client/src/pages/Admin/Departments/DepartmentList.jsx` (NEW)
- `/client/src/pages/Admin/Departments/DepartmentForm.jsx` (NEW)
- `/client/src/pages/Admin/Subjects/SubjectList.jsx` (NEW)
- `/client/src/pages/Admin/Subjects/SubjectForm.jsx` (NEW)

**Page: Department List**
- Card/table view of departments
- Columns: Name, Code, Head, Subject Count
- Actions: Create, Edit, Archive

**Page: Subject List**
- Table of subjects
- Columns: Name, Code, Department, Credits, Status
- Filter by department
- Actions: Create, Edit, Archive

**Acceptance Criteria:**
- [ ] Admin creates/edits departments
- [ ] Admin creates/edits subjects
- [ ] Subjects grouped by department
- [ ] Subject codes validated for uniqueness

---

#### Task F2.3: Grade Level Management

**Files:**
- `/client/src/pages/Admin/GradeLevels/GradeLevelList.jsx` (NEW)
- `/client/src/pages/Admin/GradeLevels/GradeLevelForm.jsx` (NEW)

**Page: Grade Level List**
- Simple list/table
- Columns: Name, Level Number
- Actions: Create, Edit, Reorder

**Acceptance Criteria:**
- [ ] Admin defines grade levels
- [ ] Sortable by level number
- [ ] Used in student profiles

---

### Phase 3: Class & Enrollment Management (Week 4-5)

#### Task F3.1: Class Management

**Files:**
- `/client/src/pages/Admin/Classes/ClassList.jsx` (NEW)
- `/client/src/pages/Admin/Classes/ClassForm.jsx` (NEW)
- `/client/src/pages/Admin/Classes/ClassDetail.jsx` (NEW)

**Page: Class List**
- Table/card view of classes
- Columns: Class Code, Name, Subject, Teacher, Term, Enrolled Count, Status
- Filters: Term, Subject, Teacher, Status
- Search by class code/name
- Actions: Create, View, Edit, Archive

**Page: Class Form**
- Create/Edit class
- Fields:
  - Subject (dropdown)
  - Academic Year (dropdown)
  - Term (dropdown)
  - Class Name
  - Class Code (auto-generated or manual)
  - Grade Level (optional)
  - Room Number
  - Max Capacity
  - Schedule (day/time picker)
- Assign Primary Teacher

**Page: Class Detail**
- Class info header
- Tabs:
  - **Roster:** Enrolled students table
  - **Teachers:** Assigned teachers
  - **Courses:** Courses in this class
  - **Assignments:** Activities assigned
  - **Gradebook:** Full class gradebook
  - **Settings:** Class settings

**Acceptance Criteria:**
- [ ] Admin creates classes
- [ ] Classes linked to subject, term
- [ ] Schedule stored and displayed
- [ ] Class detail shows all info

---

#### Task F3.2: Student Enrollment Interface

**Files:**
- `/client/src/pages/Admin/Classes/EnrollmentManagement.jsx` (NEW)
- `/client/src/pages/Admin/Students/StudentEnrollments.jsx` (NEW)

**Page: Enrollment Management (within Class Detail)**
- Current roster table
- Actions:
  - **Add Students:** Modal with student search/select
  - **Bulk Add:** CSV upload
  - **Remove:** Withdraw student with reason
- Show enrollment status (enrolled/withdrawn)

**Page: Student Enrollments (within Student Profile)**
- Table of student's enrollments
- Columns: Class, Term, Status, Enrollment Date
- Actions: Withdraw, View Class

**Acceptance Criteria:**
- [ ] Admin enrolls students in classes
- [ ] Bulk enrollment via CSV
- [ ] Student enrollment history visible
- [ ] Withdrawal tracked with reason

---

#### Task F3.3: Teacher Assignment Interface

**Files:**
- `/client/src/pages/Admin/Classes/TeacherAssignment.jsx` (NEW)

**Page: Teacher Assignment (within Class Detail)**
- Current teachers table
- Columns: Teacher Name, Role, Start Date, Status
- Actions:
  - **Add Teacher:** Modal with teacher select + role
  - **Remove Teacher:** Remove from class

**Acceptance Criteria:**
- [ ] Admin assigns teachers to classes
- [ ] Support primary + co-teachers
- [ ] Teacher assignment history

---

### Phase 4: Teacher & Student Dashboards (Week 6-7)

#### Task F4.1: Teacher Dashboard

**Files:**
- `/client/src/pages/Teacher/TeacherDashboard.jsx` (NEW)
- `/client/src/pages/Teacher/MyClasses.jsx` (NEW)
- `/client/src/pages/Teacher/ClassDashboard.jsx` (NEW)

**Page: Teacher Dashboard**
- Overview of teacher's classes (current term)
- Quick stats:
  - Total students across all classes
  - Pending grading count
  - Upcoming assignments
- Recent activity feed
- Quick actions: Create Assignment, Grade Submissions

**Page: My Classes**
- Card view of teacher's classes
- Each card shows:
  - Class name + code
  - Subject, Term
  - Enrolled count
  - Pending grading count
  - Quick links: Roster, Assignments, Gradebook

**Page: Class Dashboard**
- Single class overview
- Tabs:
  - **Assignments:** All assigned activities
  - **Gradebook:** Student grades
  - **Roster:** Student list
  - **Reports:** Class reports

**Acceptance Criteria:**
- [ ] Teachers see their assigned classes
- [ ] Dashboard shows key metrics
- [ ] Quick access to grading/assignments
- [ ] Class-specific dashboard

---

#### Task F4.2: Student Dashboard

**Files:**
- `/client/src/pages/Student/StudentDashboard.jsx` (MODIFY)
- `/client/src/pages/Student/MyClasses.jsx` (NEW)
- `/client/src/pages/Student/ClassView.jsx` (NEW)

**Page: Student Dashboard**
- Overview of enrolled classes (current term)
- Upcoming assignments with due dates
- Recent grades
- GPA / grade summary
- Quick actions: View Assignments, View Grades

**Page: My Classes**
- Card view of enrolled classes
- Each card shows:
  - Class name, teacher
  - Current grade
  - Upcoming assignments
  - Recent activity

**Page: Class View (Student)**
- Single class view
- Tabs:
  - **Assignments:** All assignments for this class
  - **Grades:** Gradebook for student
  - **Resources:** Course materials (future)

**Acceptance Criteria:**
- [ ] Students see enrolled classes
- [ ] Dashboard shows assignments + grades
- [ ] Class-specific view
- [ ] Upcoming due dates highlighted

---

### Phase 5: Assignment & Submission Flow (Week 8-9)

#### Task F5.1: Activity Assignment Interface

**Files:**
- `/client/src/pages/Teacher/AssignActivity.jsx` (NEW)
- `/client/src/pages/Teacher/ManageAssignments.jsx` (NEW)

**Page: Assign Activity**
- Select Activity (from activity library)
- Assign to:
  - Entire Class (default)
  - Select Students (individual)
- Set Due Date, Available Dates
- Set Category (homework/quiz/exam)
- Set Weight
- Publish or Save as Draft

**Page: Manage Assignments**
- Table of all assignments for class
- Columns: Activity, Category, Due Date, Assigned To, Status, Submissions
- Actions: Edit, Delete, View Submissions

**Acceptance Criteria:**
- [ ] Teachers assign activities to classes
- [ ] Individual student assignments supported
- [ ] Due dates and categories set
- [ ] Draft vs published assignments

---

#### Task F5.2: Student Assignment View

**Files:**
- `/client/src/pages/Student/Assignments.jsx` (NEW)
- `/client/src/pages/Student/AssignmentDetail.jsx` (NEW)

**Page: Assignments**
- List of all assignments (all classes or filtered by class)
- Grouped by:
  - **Upcoming:** Not submitted, due soon
  - **Past Due:** Late submissions
  - **Submitted:** Awaiting grading
  - **Graded:** View feedback
- Each item shows:
  - Activity name
  - Class, Category
  - Due date (with countdown if soon)
  - Status badge
  - Grade (if graded)
- Actions: Start, Continue, View Feedback

**Page: Assignment Detail**
- Activity content
- Due date, status
- Submission status
- Actions: Submit, View Submission

**Acceptance Criteria:**
- [ ] Students see all assignments
- [ ] Filtered by status (upcoming/late/submitted/graded)
- [ ] Due date countdown
- [ ] Direct link to activity

---

### Phase 6: Gradebook & Reporting (Week 10-11)

#### Task F6.1: Teacher Gradebook

**Files:**
- `/client/src/pages/Teacher/Gradebook.jsx` (NEW)
- `/client/src/components/Gradebook/GradebookTable.jsx` (NEW)
- `/client/src/components/Gradebook/GradeEntry.jsx` (NEW)

**Page: Gradebook**
- Spreadsheet-like view
- Rows: Students
- Columns: Assignments (grouped by category)
- Cells: Grades (editable)
- Features:
  - Sort by name, grade
  - Filter by category
  - Color-coded by grade
  - Click to view submission
  - Inline grade entry
  - Final grade column (calculated)
- Actions:
  - Export to CSV
  - Email grades to students
  - Curve grades
  - Post final grades

**Component: Gradebook Table**
- Virtualized table for performance
- Editable cells
- Real-time save

**Acceptance Criteria:**
- [ ] Spreadsheet-like gradebook
- [ ] Inline grade entry
- [ ] Final grade calculation
- [ ] Export to CSV
- [ ] Color-coded grades

---

#### Task F6.2: Student Grade View

**Files:**
- `/client/src/pages/Student/Grades.jsx` (NEW)
- `/client/src/pages/Student/GradeDetail.jsx` (NEW)

**Page: Grades**
- List of enrolled classes
- Each class card shows:
  - Current grade (letter + percentage)
  - Grade breakdown by category
  - Progress bar
  - Recent grades
- Click class to see detailed grades

**Page: Grade Detail (Class)**
- Table of all assignments
- Columns: Assignment, Category, Score, Percentage, Date, Feedback
- Grade summary:
  - Category grades (weighted)
  - Final grade
- Chart: Grade progression over time

**Acceptance Criteria:**
- [ ] Students see grades per class
- [ ] Grade breakdown by category
- [ ] Visual progress indicators
- [ ] Feedback visible per assignment

---

#### Task F6.3: Reports & Transcripts

**Files:**
- `/client/src/pages/Admin/Reports/ReportDashboard.jsx` (NEW)
- `/client/src/pages/Admin/Reports/TranscriptGenerator.jsx` (NEW)
- `/client/src/pages/Student/Transcript.jsx` (NEW)

**Page: Report Dashboard (Admin)**
- Report types:
  - Class Rosters
  - Gradebook Exports
  - Student Transcripts
  - Progress Reports
  - Teacher Summaries
- Select report, configure, generate

**Page: Transcript Generator**
- Select student
- Select terms/years
- Include:
  - Classes taken
  - Grades
  - GPA
  - Credits
- Generate PDF

**Page: Student Transcript (Student View)**
- Read-only transcript
- All classes, grades, GPA
- Download as PDF

**Acceptance Criteria:**
- [ ] Admin generates reports
- [ ] Transcripts include all grades
- [ ] GPA calculated correctly
- [ ] Export to PDF

---

### Phase 7: Settings & Configuration (Week 12)

#### Task F7.1: Grading Scale Configuration

**Files:**
- `/client/src/pages/Admin/GradingScales/GradingScaleList.jsx` (NEW)
- `/client/src/pages/Admin/GradingScales/GradingScaleForm.jsx` (NEW)

**Page: Grading Scale List**
- Table of grading scales
- Columns: Name, Type, Default
- Actions: Create, Edit, Delete, Set Default

**Page: Grading Scale Form**
- Scale Type: Letter, Percentage, GPA, Custom
- Scale Definition:
  - Letter: Define ranges (A: 90-100, B: 80-89, etc.)
  - GPA: Define points per grade
- Preview

**Acceptance Criteria:**
- [ ] Admin defines grading scales
- [ ] Multiple scales supported
- [ ] One default scale per org
- [ ] Courses can override

---

#### Task F7.2: Course Grading Policy

**Files:**
- `/client/src/pages/Teacher/CourseSettings.jsx` (NEW)

**Page: Course Settings**
- Grading Scale: Select or use default
- Category Weights:
  - Homework: 20%
  - Quizzes: 30%
  - Exams: 50%
  - (Add/remove categories)
- Drop Lowest: Count per category
- Late Policy: Penalty percentage
- Save

**Acceptance Criteria:**
- [ ] Teachers configure course grading
- [ ] Category weights customizable
- [ ] Drop lowest scores configurable
- [ ] Late penalties configurable

---

## Migration Strategy

### Migrating Existing Data

#### Step 1: Create Default Organization
- Create "Default School" organization
- Assign all existing users to it
- Set as active organization

#### Step 2: Create Default Academic Structure
- Create "Academic Year 2024-2025" (current)
- Create "Fall 2024" term (current)
- Create "General" department

#### Step 3: Migrate Existing Activities
- Assign all activities to default organization
- Create "General" subject
- Link activities to "General" subject

#### Step 4: Create Transitional Classes
- Create default classes for existing submissions
- Enroll students based on submission history
- Assign teachers based on activity creators

#### Step 5: Update Submissions
- Link submissions to new class structure
- Update with enrollment context

### Backward Compatibility
- Keep existing APIs functional
- Add deprecation warnings
- Provide migration guide
- Run in parallel for grace period

---

## Implementation Timeline

### Month 1: Foundation
- **Week 1-2:** Organizations, Academic Years, Terms, Departments, Subjects
- **Week 3-4:** Classes, Enrollments, Teacher Assignments

### Month 2: Core Features
- **Week 5-6:** Courses, Activity Assignments, Enhanced Submissions
- **Week 7-8:** Grading Scales, Gradebook, Grade Calculation

### Month 3: Polish & Deploy
- **Week 9:** User Management, Bulk Import
- **Week 10:** Reports, Transcripts
- **Week 11:** Frontend Polish, Testing
- **Week 12:** Migration, Documentation, Deployment

---

## Security & Privacy Considerations

### Multi-Tenancy Security
- [ ] All queries filtered by organization_id
- [ ] Middleware enforces tenant context
- [ ] No cross-organization data leakage
- [ ] Test with penetration testing

### Role-Based Access Control
- [ ] Organization Admin: Full control within org
- [ ] Teacher: Access assigned classes only
- [ ] Student: Access enrolled classes only
- [ ] No student-to-student data visibility

### FERPA Compliance (US Schools)
- [ ] Student records protected
- [ ] Parent consent tracked (if applicable)
- [ ] Audit logs for grade changes
- [ ] Secure data export

### GDPR Compliance (EU)
- [ ] Data export (student can download all data)
- [ ] Right to erasure (delete student account + data)
- [ ] Consent tracking
- [ ] Privacy policy

### Data Backup & Recovery
- [ ] Daily automated backups
- [ ] Point-in-time recovery
- [ ] Disaster recovery plan
- [ ] Test restore procedures

---

## Success Metrics

### MVP Success Criteria
- [ ] 3+ pilot schools onboarded
- [ ] 100+ students enrolled
- [ ] 20+ teachers actively using
- [ ] 500+ activities/assignments created
- [ ] 1000+ submissions graded
- [ ] < 2 second page load times
- [ ] 99.5% uptime
- [ ] Zero data leakage incidents

---

## Future Enhancements (Post-LMS)

### Phase 2 Features
- [ ] Parent portal
- [ ] Attendance tracking
- [ ] Behavior/discipline tracking
- [ ] Standards-based grading
- [ ] Learning outcomes tracking
- [ ] Student portfolios
- [ ] Discussion forums
- [ ] Live video classes (Zoom integration)
- [ ] Mobile apps (iOS/Android)

### Phase 3 Features
- [ ] SIS integrations (PowerSchool, Infinite Campus)
- [ ] LTI integration (Canvas, Blackboard)
- [ ] Single Sign-On (SAML, OAuth)
- [ ] Advanced analytics & insights
- [ ] Predictive modeling (at-risk students)
- [ ] AI-powered grading assistance
- [ ] Plagiarism detection
- [ ] Content marketplace

---

## Open Questions & Risks

### Technical Risks
- **Risk:** Database performance with multi-tenancy
  - **Mitigation:** Proper indexing, query optimization, caching

- **Risk:** Data migration complexity
  - **Mitigation:** Thorough testing, phased rollout, rollback plan

- **Risk:** Timezone handling across schools
  - **Mitigation:** Store all dates in UTC, display in school's timezone

### Product Risks
- **Risk:** Complexity overwhelming users
  - **Mitigation:** Phased feature rollout, user training, documentation

- **Risk:** Schools resistant to change
  - **Mitigation:** Onboarding support, migration assistance, pilot programs

### Business Risks
- **Risk:** Competition from established LMS (Canvas, Moodle)
  - **Mitigation:** Focus on niche features, better UX, lower cost

---

## Conclusion

This transformation plan converts the iTeach Q&A POC into a full-featured multi-tenant LMS system with organizational hierarchy, class management, enrollment, grading, and reporting.

**Key Achievements:**
✅ Multi-tenant organization support
✅ Academic year/term structure
✅ Department/subject organization
✅ Class/section management
✅ Student enrollment system
✅ Teacher-class assignments
✅ Course/unit structure
✅ Activity assignment system
✅ Enhanced grading & gradebook
✅ Reports & transcripts
✅ Scalable architecture

**Next Steps:**
1. Review this plan with stakeholders
2. Clarify design decisions (marked with 🔴)
3. Prioritize features for MVP
4. Begin Phase 1 implementation
5. Set up testing/staging environments
6. Prepare migration scripts

---

**Document Version:** 1.0
**Last Updated:** 2025-11-01
**Status:** Draft - Awaiting Review
