# Joineazy – Student, Group & Assignment Management System

[![Node.js](https://img.shields.io/badge/Node.js-v22.12-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker_Compose-Supported-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)](#)
[![Test Suite](https://img.shields.io/badge/Tests-39%20Passing%20(100%25)-success)](#)

---

## 1. Project Overview

**Joineazy** is an enterprise-grade Full Stack Web Application designed for university academic departments and training bootcamps. It bridges the gap between student group collaboration, assignment submission management through cloud storage (OneDrive/SharePoint), and administrative oversight with real-time analytics.

Built for the **Joineazy Internship Technical Assignment**, this platform implements strict role-based access control, relational database consistency, transactional integrity, and a clean, modern SaaS dashboard experience.

---

## 2. Problem Statement & Objectives

### Problem
In collaborative academic courses:
1. Students struggle with disorganized group formations, duplicate memberships across multiple teams, and lack of clarity on assignment deliverables.
2. Managing file uploads directly through web servers causes bandwidth bottlenecks and storage bloat; universities increasingly use OneDrive/SharePoint folders instead.
3. Professors and administrators lack a unified real-time dashboard to monitor which student groups have uploaded their work, who confirmed the submission, and which teams are falling behind.

### Objectives
- **Strict Role-Based Access Control**: Separate workflows for Students and Professors (Admins).
- **Group Governance**: Enforce a strict single-active-group constraint for students, automatic leader assignment, and leader-managed rosters.
- **Dynamic Assignment Allocation**: Support assignments allocated to **all enrolled students** or selectively to **specific groups**.
- **Two-Step Submission Confirmation**: Ensure only group leaders can confirm final OneDrive submissions on behalf of their team with double-confirmation dialogs.
- **Relational Consistency**: Maintain referential integrity, foreign key cascades, and atomic SQL transactions using PostgreSQL.
- **Real-Time Analytics**: Calculate class progress percentages, completed vs pending groups, and on-time submission ratios.

---

## 3. Core Features

### 🎓 Student Features
- **Authentication**: Secure registration and login using JWT tokens and bcrypt password hashing.
- **Group Management**:
  - Create a new group; creator automatically becomes the **Group Leader**.
  - Unique formatted Group Code generation (e.g. `GRP-4ED477`) with one-click clipboard copying.
  - Leaders can add students by **registered email** or **Student ID**.
  - Leaders can remove members (leaders cannot remove themselves).
  - Strict prevention against students joining or creating multiple active groups.
- **Assignment Tracking**:
  - View assignments allocated to all students or specifically to their team.
  - Assignment cards display due dates, overdue warnings, and direct OneDrive launch buttons.
- **Two-Step Submission Confirmation**:
  - Step 1: Click "Yes, I have submitted".
  - Step 2: Confirmation modal verifies upload to OneDrive with leader-only authorization and certification checkbox.
  - Prevents duplicate confirmations and records confirming student ID and timestamp.
- **Personal Dashboard**:
  - Real-time KPI cards: Total Assigned, Completed, Pending, Overdue.
  - Visual animated progress bar with group completion percentage.

### 🛡️ Admin (Professor) Features
- **Secure Authentication**:
  - Role-protected endpoints (`requireAdmin`). Public registration is strictly restricted to students.
- **Assignment Management (CRUD)**:
  - Create, view, edit, and delete coursework assignments with title, description, due date, and OneDrive URL.
  - Flexible Allocation: Assign to **All Students** or **Selected Groups** with multi-select checkboxes.
  - Validates OneDrive and SharePoint URLs.
- **Group Monitoring**:
  - View all student groups, unique codes, leader contacts, and member counts.
  - Detailed modal inspection of group rosters (names, emails, student IDs, leader indicators).
- **Submission Tracking Grid**:
  - Filter by assignment to see an allocation matrix of all expected groups.
  - Distinguish Submitted groups (with confirming leader name and exact timestamp) from Pending groups.
- **Real-Time Analytics**:
  - Summary metrics: Total Students, Total Groups, Total Assignments, Completed Teams, Pending Teams.
  - SVG Radial Gauge for overall class completion rate.
  - Comparative horizontal bar charts comparing group performance.

---

## 4. Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS, React Router DOM v6, Axios, Lucide React Icons |
| **Backend** | Node.js v22 LTS, Express.js 4, PostgreSQL Driver (`pg`), JWT (`jsonwebtoken`), bcryptjs, CORS, Dotenv |
| **Database** | PostgreSQL 16.16 (Relational tables, foreign keys, cascade deletes, partial unique indexes, transactions) |
| **DevOps & Containers** | Docker, Docker Compose, Multi-stage Dockerfiles, Nginx Alpine, Persistent Volumes |
| **Testing Harness** | Node.js native test scripts (`test-auth.js`, `test-groups.js`, `test-assignments.js`, `test-submissions.js`, `test-e2e-workflow.js`) |

---

## 5. System Architecture

```mermaid
graph TD
    subgraph Client ["Frontend (React + Vite + Tailwind CSS)"]
        UI["Modern SaaS Dashboard"]
        AuthContext["Auth Context & Token Interceptor"]
        Router["React Router DOM (Protected Routes)"]
    end

    subgraph Server ["Backend (Node.js + Express.js REST API)"]
        Middleware["Auth & Role Middlewares"]
        Controllers["Auth, Groups, Assignments, Submissions, Admin"]
        PGPool["PostgreSQL Client Pool (pg)"]
    end

    subgraph Storage ["Database (PostgreSQL 16)"]
        Users[("users")]
        Groups[("groups")]
        GroupMembers[("group_members")]
        Assignments[("assignments")]
        AssignmentGroups[("assignment_groups")]
        Submissions[("submissions")]
    end

    UI --> Router
    Router --> AuthContext
    AuthContext -->|HTTP + JWT Bearer| Middleware
    Middleware --> Controllers
    Controllers -->|Parameterized SQL & Transactions| PGPool
    PGPool --> Storage
```

---

## 6. PostgreSQL Database Design & ER Diagram

The database schema strictly adheres to third normal form (3NF) with foreign key constraints (`ON DELETE CASCADE`), unique constraints, and lookup indexes.

```mermaid
erDiagram
    users ||--o{ groups : "leads"
    users ||--o{ group_members : "belongs to"
    users ||--o{ assignments : "creates (admin)"
    users ||--o{ submissions : "confirms"
    
    groups ||--o{ group_members : "contains"
    groups ||--o{ assignment_groups : "allocated to"
    groups ||--o{ submissions : "submits"

    assignments ||--o{ assignment_groups : "allocates"
    assignments ||--o{ submissions : "receives"

    users {
        int id PK
        varchar name
        varchar email UK
        varchar student_id UK "nullable for admin"
        varchar password_hash
        varchar role "student or admin"
        timestamp created_at
    }

    groups {
        int id PK
        varchar name
        varchar group_code UK
        int leader_id FK
        timestamp created_at
    }

    group_members {
        int id PK
        int group_id FK
        int user_id FK "UK (single active group)"
        timestamp joined_at
    }

    assignments {
        int id PK
        varchar title
        text description
        timestamp due_date
        text onedrive_link
        int created_by FK
        timestamp created_at
        timestamp updated_at
    }

    assignment_groups {
        int id PK
        int assignment_id FK
        int group_id FK "nullable for all-students"
    }

    submissions {
        int id PK
        int assignment_id FK
        int group_id FK
        int confirmed_by FK
        timestamp confirmed_at
    }
```

### Key Relational Rules:
1. **Single Active Group Rule**: The unique index `uq_group_members_user_id` on `group_members(user_id)` guarantees that no student can ever belong to more than one group concurrently.
2. **Global vs Group Allocation**: If an assignment is allocated to all students, a row with `group_id IS NULL` is inserted into `assignment_groups`. Partial unique index `uq_assignment_groups_all` prevents duplicate global allocations. If allocated to specific groups, rows are inserted with explicit `group_id`s.
3. **Submission Uniqueness**: Unique constraint `(assignment_id, group_id)` on `submissions` guarantees no duplicate group submissions can be recorded.

---

## 7. Project Folder Structure

```
Dashboard/
├── backend/
│   ├── config/
│   │   └── db.js                 # PostgreSQL Pool connection & health probe
│   ├── controllers/
│   │   ├── adminController.js       # Admin monitoring, groups, analytics
│   │   ├── assignmentController.js  # Assignment CRUD & allocation logic
│   │   ├── authController.js        # JWT Login, Student Registration, /me
│   │   ├── groupController.js       # Group CRUD, leader checks, membership
│   │   └── submissionController.js  # 2-step submission confirmation & progress
│   ├── database/
│   │   ├── migrate.js               # Standalone DDL migration runner
│   │   ├── schema.sql               # PostgreSQL Relational DDL
│   │   ├── seed.js                  # Standalone database seed runner
│   │   ├── seed.sql                 # Demo users, groups, assignments, submissions
│   │   └── start-pg.js              # Dedicated PostgreSQL startup script
│   ├── middleware/
│   │   ├── authMiddleware.js        # verifyToken, requireAdmin, requireStudent
│   │   └── errorHandler.js          # Centralized error & 404 handlers
│   ├── routes/
│   │   ├── adminRoutes.js           # /api/admin endpoints
│   │   ├── assignmentRoutes.js      # /api/assignments endpoints
│   │   ├── authRoutes.js            # /api/auth endpoints
│   │   ├── groupRoutes.js           # /api/groups endpoints
│   │   └── submissionRoutes.js       # /api/submissions endpoints
│   ├── utils/
│   │   ├── jwt.js                   # JWT token signing & verification
│   │   └── response.js              # Standardized API response formatters
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile                   # Production Node 22 Alpine container
│   ├── package.json
│   ├── server.js                    # Express app entry point
│   ├── test-auth.js                 # Authentication test suite
│   ├── test-groups.js               # Groups & membership test suite
│   ├── test-assignments.js          # Assignments & allocation test suite
│   ├── test-submissions.js          # Submission & progress test suite
│   └── test-e2e-workflow.js         # Complete end-to-end integration test
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminLayout.jsx      # Professor portal sidebar & header
│   │   │   ├── ProtectedRoute.jsx   # Role-based route guard
│   │   │   ├── StudentLayout.jsx    # Student portal sidebar & header
│   │   │   └── SubmissionModal.jsx  # Two-step confirmation modal
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Reactive auth & profile state
│   │   │   └── ToastContext.jsx     # Sleek notification toasts
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminAnalytics.jsx     # Charts & comparative progress
│   │   │   │   ├── AdminDashboard.jsx     # Summary KPIs & recent submissions
│   │   │   │   ├── ManageAssignments.jsx  # Full assignment CRUD & modals
│   │   │   │   ├── ManageGroups.jsx       # Groups list & roster modal
│   │   │   │   └── SubmissionTracking.jsx # Assignment-wise tracking matrix
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx              # Login with demo autofill buttons
│   │   │   │   └── Register.jsx           # Student registration
│   │   │   └── student/
│   │   │       ├── MyGroup.jsx            # Group details & member management
│   │   │       ├── Profile.jsx            # Student academic profile
│   │   │       ├── StudentAssignments.jsx # Searchable coursework list
│   │   │       └── StudentDashboard.jsx   # Welcome banner, KPIs & progress bar
│   │   ├── services/
│   │   │   └── api.js                     # Axios instance & token interceptors
│   │   ├── App.jsx                        # React Router DOM route hierarchy
│   │   ├── index.css                      # Tailwind base & custom scrollbars
│   │   └── main.jsx                       # React root entry
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile                         # Multi-stage Vite + Nginx Alpine
│   ├── index.html
│   ├── nginx.conf                         # SPA routing & compression config
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vercel.json                        # Vercel SPA rewrites
│   └── vite.config.js
├── .dockerignore
├── .env.example                           # Root environment variable documentation
├── .gitignore                             # Ignores .env, node_modules, pgdata
├── docker-compose.yml                     # Multi-service composition
├── render.yaml                            # Render Blueprint Infrastructure-as-Code
└── README.md
```

---

## 8. API Reference Documentation

All protected endpoints require the HTTP header:  
`Authorization: Bearer <JWT_TOKEN>`

### Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new student (`name`, `email`, `student_id`, `password`). Enforces student role. |
| `POST` | `/api/auth/login` | Public | Login with email and password. Returns signed JWT and user info. |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current authenticated user profile, student ID, and active group. |

### Group Management Endpoints (`/api/groups`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/groups` | Student | Create a new group (`name`). Creator automatically becomes Leader. Uses SQL transactions. |
| `GET` | `/api/groups` | Authenticated | Students see their active group; Admins see all registered groups. |
| `GET` | `/api/groups/:id` | Authenticated | View group details and member roster. Students restricted to their own group. |
| `POST` | `/api/groups/:id/members` | Leader / Admin | Add member by registered email or Student ID. Prevents multiple group memberships. |
| `DELETE`| `/api/groups/:id/members/:userId` | Leader / Admin | Remove member from group. Leaders cannot remove themselves. |

### Assignment Management Endpoints (`/api/assignments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/assignments` | Authenticated | Students see allocated coursework; Admins see all assignments with allocation details. |
| `GET` | `/api/assignments/:id` | Authenticated | Get assignment details, due date, OneDrive URL, and group submission status. |
| `POST` | `/api/assignments` | Admin | Create assignment (`title`, `description`, `due_date`, `onedrive_link`, `allocation_type`, `group_ids`). |
| `PUT` | `/api/assignments/:id` | Admin | Update assignment details and synchronize group allocations. |
| `DELETE`| `/api/assignments/:id` | Admin | Delete assignment with cascade cleanup of submissions. |

### Submission Endpoints (`/api/submissions`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/submissions/confirm` | Student (Leader) | Confirm assignment submission. Enforces leader-only policy and prevents duplicates. |
| `GET` | `/api/submissions` | Authenticated | Students see their group submissions; Admins see system-wide submissions. |
| `GET` | `/api/submissions/progress` | Authenticated | Student group metrics (total, completed, pending, overdue, %) or Admin system progress. |
| `GET` | `/api/submissions/assignment/:id` | Authenticated | Allocation grid showing which groups have submitted and which are pending. |

### Admin Monitoring Endpoints (`/api/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | Admin | Executive summary metrics, class completion rate, and recent submissions. |
| `GET` | `/api/admin/groups` | Admin | Comprehensive list of groups with member counts and progress. |
| `GET` | `/api/admin/analytics` | Admin | On-time vs late ratios, overall percentage, and comparative performance. |

---

## 9. In-Depth Workflow Explanations

### 1. Global vs Group-Specific Assignment Allocation
- **Global Assignments**: When an assignment is created with `allocation_type: 'all'`, an allocation record is stored in `assignment_groups` with `group_id = NULL`. Every student automatically sees this assignment in their dashboard regardless of team affiliation.
- **Group-Specific Assignments**: When created with `allocation_type: 'groups'`, explicit records linking `assignment_id` and each selected `group_id` are inserted. A student in Group 1 will see their exclusive assignment, while students in Group 2 are restricted from viewing or accessing it.

### 2. Two-Step Group Leader Submission Confirmation
- To prevent accidental submissions and ensure academic accountability:
  1. **Step 1**: The student views the assignment card and clicks the primary button **"Yes, I have submitted"**.
  2. **Step 2**: The accessible `SubmissionModal` dialog opens, prompting: *"Have you uploaded your assignment to the OneDrive submission link?"*.
  3. The modal displays a direct shortcut to open the target OneDrive folder in a new browser tab for final verification.
  4. If the caller is **not** the group leader, a warning is displayed and submission is disabled.
  5. The leader checks the mandatory certification checkbox and clicks **"Confirm Submission"**.
  6. The backend records `confirmed_by = leader.id` and `confirmed_at = NOW()`.
  7. The frontend immediately updates the assignment badge to **"Submitted"** and recalculates the group progress percentage.

---

## 10. Local Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v20 or v22 LTS
- [npm](https://www.npmjs.com/) v10+
- [PostgreSQL](https://www.postgresql.org/) v14+ or active local cluster

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/joineazy-management-system.git
cd joineazy-management-system
```

### Step 2: Configure Environment Variables
Create `.env` inside `backend/`:
```bash
# backend/.env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/joineazy_db
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=joineazy_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=super_secret_jwt_key_joineazy_2026_dev
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

Create `.env` inside `frontend/`:
```bash
# frontend/.env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 4: Initialize and Seed Database
```bash
cd backend
# Run migration DDL
npm run db:init

# Seed initial demo accounts, groups, and coursework
npm run db:seed
```

### Step 5: Start Development Servers
In Terminal 1 (Backend):
```bash
cd backend
npm run dev
# Server running at http://localhost:5000
```

In Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# Frontend running at http://localhost:5173
```

---

## 11. Docker Setup & Instructions

The complete three-tier architecture (PostgreSQL, Express Backend, Nginx Frontend) can be launched using Docker Compose.

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Build images and start containers in background
docker compose up --build -d

# 3. View live application logs
docker compose logs -f

# 4. Access applications:
#    Frontend: http://localhost:3000
#    Backend API: http://localhost:5000/api/health
#    PostgreSQL: localhost:5432

# 5. Stop containers
docker compose down

# 6. Stop containers and reset database volume
docker compose down -v
```

---

## 12. Test Execution & Verified Results

The repository includes automated test suites executing directly against the live PostgreSQL database:

```bash
cd backend
npm run test:all
```

### Actual Test Suite Execution Results:
```text
> joineazy-backend@1.0.0 test:all
> node test-auth.js && node test-groups.js && node test-assignments.js && node test-submissions.js && node test-e2e-workflow.js

✅ Connected to real PostgreSQL database: "joineazy_db"
   Engine: PostgreSQL 16.16, compiled by Visual C++ build 1944, 64-bit

1. Auth Suite (test-auth.js):
   ✓ Health endpoint OK (200)
   ✓ Admin Login OK (Role: admin)
   ✓ Student Leader Login OK (Group: Alpha Innovators)
   ✓ Invalid Password rejected (401)
   ✓ GET /api/auth/me authenticated (200)
   ✓ GET /api/auth/me unauthenticated rejected (401)
   ✓ Student Registration with role escalation prevention OK (201)
   ✓ Duplicate Registration rejected with 409 Conflict
   🎉 ALL 8 AUTHENTICATION TESTS PASSED!

2. Groups Suite (test-groups.js):
   ✓ Group Creation & Auto-Leader Assignment (201)
   ✓ Prevented student from creating multiple groups (400)
   ✓ Added member by email (201)
   ✓ Added member by Student ID (201)
   ✓ Duplicate member addition rejected (409)
   ✓ Adding student already in another group rejected (409)
   ✓ Non-leader member cannot add/remove members (403)
   ✓ Leader cannot remove themselves (400)
   ✓ Student can only view own group details (403 for other groups)
   ✓ Admin retrieves all groups with member counts (200)
   🎉 ALL 8 GROUP TESTS PASSED!

3. Assignments Suite (test-assignments.js):
   ✓ Non-OneDrive URL rejected (400)
   ✓ Admin created global assignment (201)
   ✓ Student assignment creation rejected (403)
   ✓ Admin created group-specific assignment (201)
   ✓ Group 1 sees exclusive assignment; Group 2 cannot see it
   ✓ Cross-group assignment access rejected (403)
   ✓ Admin updated assignment (200)
   ✓ Student editing rejected (403)
   ✓ Malformed/missing IDs return 400 and 404
   ✓ Admin deleted assignment with cascade cleanup (200)
   🎉 ALL 9 ASSIGNMENT TESTS PASSED!

4. Submissions Suite (test-submissions.js):
   ✓ Non-leader member confirmation rejected (403)
   ✓ Cross-group confirmation spoof rejected (403)
   ✓ Group leader successfully confirmed submission (201)
   ✓ Stored confirming student ID and timestamp
   ✓ Duplicate submission rejected (409)
   ✓ Progress percentage calculated accurately
   ✓ Student sees only own group submissions
   ✓ Admin monitoring summary and group breakdown (200)
   ✓ Assignment tracking grid verifies submitted vs pending teams
   🎉 ALL 8 SUBMISSION TESTS PASSED!

5. End-to-End Workflow Suite (test-e2e-workflow.js):
   ✓ Student Workflow: Register -> Login -> Create Group -> Add Peer -> View Coursework -> Confirm Submission -> Progress Updated
   ✓ Admin Workflow: Login -> Create Group Assignment -> Dashboard -> Groups View -> Analytics -> Tracking Grid
   🎉 ALL 6 E2E WORKFLOW TESTS PASSED!

TOTAL: 39/39 TESTS PASSING WITH 100% SUCCESS
```

---

## 13. Pre-Seeded Demo Credentials

The database contains pre-configured test accounts for instant evaluation:

| Role | Name | Email | Password | Student ID / Details |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Professor Alan Turing | `admin@joineazy.edu` | `Admin@123` | Department Administrator |
| **Student Leader** | Sarah Connor | `leader@joineazy.edu` | `Student@123` | `STU-1001` (Leader of *Alpha Innovators*) |
| **Student Member** | John Doe | `john@joineazy.edu` | `Student@123` | `STU-1002` (Member of *Alpha Innovators*) |
| **Student Member** | Alice Smith | `alice@joineazy.edu` | `Student@123` | `STU-1003` (Member of *Alpha Innovators*) |
| **Student Leader** | Bob Dylan | `bob@joineazy.edu` | `Student@123` | `STU-1004` (Leader of *Beta Developers*) |
| **Unassigned Student** | Emma Watson | `emma@joineazy.edu` | `Student@123` | `STU-1006` (Unassigned; ready to create group) |

> Quick login buttons are embedded directly into the login screen for one-click autofill!

---

## 14. Deployment Instructions

### Frontend Deployment (Vercel)
1. Push repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Select your repository and configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`
5. Click **Deploy**. SPA rewrites are automatically handled by `frontend/vercel.json`.

### Backend & Database Deployment (Render)
1. Create a Managed PostgreSQL Database on [Render](https://render.com/):
   - Name: `joineazy-postgres`
   - Database: `joineazy_db`
   - User: `joineazy_user`
2. Create a Web Service for the Backend:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV`: `production`
     - `DATABASE_URL`: `Internal Connection String from Render PostgreSQL`
     - `DB_SSL`: `true`
     - `JWT_SECRET`: Generate a secure 32+ character random secret
     - `JWT_EXPIRES_IN`: `7d`
     - `CORS_ORIGIN`: `https://your-frontend-app.vercel.app`
3. Initialize the Remote Database:
   - Connect via Render Shell or run:
     ```bash
     npm run db:init
     npm run db:seed
     ```

---

## 15. Screenshots & UI Previews

*(Placeholders for application UI screenshots)*

| Screen | Description |
| :--- | :--- |
| ![Student Dashboard Placeholder](https://via.placeholder.com/800x450.png?text=Joineazy+Student+Dashboard+Preview) | **Student Dashboard**: Real-time KPI metrics, group progress bar, and assignment cards. |
| ![Two-Step Confirmation Modal Placeholder](https://via.placeholder.com/800x450.png?text=Two-Step+OneDrive+Submission+Modal) | **Two-Step Submission Modal**: Verification prompt, OneDrive link shortcut, and leader certification. |
| ![Admin Monitoring Placeholder](https://via.placeholder.com/800x450.png?text=Professor+Monitoring+and+Tracking+Grid) | **Professor Portal**: Submission tracking matrix, student confirmations, and analytics dial. |

---

## 16. License & Author

- **Project**: Joineazy Internship Technical Assignment
- **Developer**: Senior Full-Stack Developer
- **License**: MIT License