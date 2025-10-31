# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                          │
│                     (React + Vite)                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Auth       │  │    Admin     │  │    User      │    │
│  │   Pages      │  │    Pages     │  │    Pages     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           Zustand Store (Auth State)                │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           Axios API Client (with JWT)               │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              │ JSON + JWT
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       SERVER TIER                           │
│                  (Node.js + Express)                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Middleware Layer                        │  │
│  │  • CORS  • Helmet  • Morgan  • JWT Auth             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │  Auth    │ │Activity  │ │Question  │ │Submission│    │
│  │  Routes  │ │  Routes  │ │  Routes  │ │  Routes  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Business Logic Layer                    │  │
│  │  • Versioning  • Permissions  • Validation          │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ SQL Queries
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE TIER                          │
│                   (SQLite + better-sqlite3)                 │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │  Users   │ │Activities│ │Questions │ │Submissions│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ Versions │ │Permissions│ │Elements  │                  │
│  └──────────┘ └──────────┘ └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### User Authentication Flow
```
┌──────┐      ┌────────┐      ┌──────────┐      ┌──────────┐
│ User │─────▶│ Login  │─────▶│  Server  │─────▶│ Database │
└──────┘      │  Page  │      │ /api/auth│      │  users   │
              └────────┘      │  /login  │      └──────────┘
                  │           └──────────┘            │
                  │                 │                 │
                  │                 │  Validate       │
                  │                 │  Password       │
                  │                 │◀────────────────┘
                  │                 │
                  │                 │  Generate JWT
                  │                 │
                  │◀────────────────┤
                  │   Return Token  │
                  │                 │
              Store Token
              in LocalStorage
```

### Activity Creation Flow (Admin/Teacher)
```
┌─────────┐      ┌──────────────┐      ┌─────────┐      ┌──────────┐
│ Teacher │─────▶│ Activity     │─────▶│ Server  │─────▶│ Database │
└─────────┘      │ Builder      │      │ /api/   │      │activities│
                 │ Form         │      │activities      └──────────┘
                 └──────────────┘      └─────────┘            │
                      │                     │                 │
                      │                     │ Validate        │
                      │                     │ Create Record   │
                      │                     │ Save Version    │
                      │                     │◀────────────────┘
                      │                     │
                      │◀────────────────────┤
                      │  Return Activity    │
                      │                     │
                 Navigate to
                 Activity List
```

### Student Activity Taking Flow
```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌──────────┐
│ Student │─────▶│ Activity │─────▶│ Server  │─────▶│ Database │
└─────────┘      │ Taking   │      │         │      └──────────┘
                 │ Interface│      │         │            │
                 └──────────┘      └─────────┘            │
                      │                 │                 │
                      │                 │ 1. Get Activity │
                      │                 │◀────────────────┤
                      │◀────────────────┤                 │
                      │  Activity Data  │                 │
                      │                 │                 │
                 Answer Questions       │                 │
                      │                 │                 │
                      │  Submit Answer  │                 │
                      │────────────────▶│                 │
                      │                 │ 2. Save Answer  │
                      │                 ├────────────────▶│
                      │                 │                 │
                 Complete Activity      │                 │
                      │                 │                 │
                      │  Submit Final   │                 │
                      │────────────────▶│                 │
                      │                 │ 3. Update Status│
                      │                 ├────────────────▶│
                      │                 │                 │
                      │◀────────────────┤                 │
                      │   Confirmation  │                 │
```

## Component Hierarchy

### Frontend Component Tree
```
App
├── BrowserRouter
│   └── Routes
│       ├── /login → Login
│       ├── /register → Register
│       └── ProtectedRoute
│           └── Layout
│               ├── Sidebar Navigation
│               └── Outlet
│                   ├── /dashboard → Dashboard
│                   ├── /activities/:id → ActivityTaking
│                   ├── /submissions → SubmissionHistory
│                   ├── /admin/activities → ActivityList
│                   ├── /admin/activities/new → ActivityBuilder
│                   ├── /admin/activities/:id/edit → ActivityBuilder
│                   ├── /admin/questions → QuestionLibrary
│                   ├── /admin/questions/new → QuestionBuilder
│                   └── /admin/questions/:id/edit → QuestionBuilder
```

## Database Relationships

### Entity Relationship Diagram
```
┌────────┐
│ Users  │
└────┬───┘
     │
     │ created_by
     │
     ├──────────────────────┬──────────────────┬─────────────────┐
     │                      │                  │                 │
     ▼                      ▼                  ▼                 ▼
┌──────────┐        ┌───────────┐      ┌──────────┐     ┌──────────┐
│Activities│        │ Questions │      │ Elements │     │Submissions│
└────┬─────┘        └─────┬─────┘      └────┬─────┘     └────┬─────┘
     │                    │                  │                │
     │ has_many           │ belongs_to       │ belongs_to     │ has_many
     │                    │                  │                │
     ▼                    ▼                  │                ▼
┌──────────┐        ┌──────────┐            │          ┌──────────┐
│ Elements │        │ Elements │            │          │ Answers  │
└────┬─────┘        └──────────┘            │          └──────────┘
     │                                       │
     │ parent_element_id (self-referencing) │
     └───────────────────────────────────────┘

Versioning Tables (parallel structure):
Each main entity has a corresponding *_versions table
that stores historical snapshots.

Permissions Tables (parallel structure):
Each main entity has a corresponding *_permissions table
for role/user-based access control.
```

## API Request Flow

### Typical Authenticated Request
```
1. Client Side
   ├─ User Action (e.g., click "Create Activity")
   ├─ Call API function from lib/api.js
   ├─ Axios interceptor adds JWT to headers
   └─ Send HTTP Request

2. Server Side
   ├─ Express receives request
   ├─ CORS middleware validates origin
   ├─ Helmet middleware adds security headers
   ├─ Morgan middleware logs request
   ├─ Auth middleware validates JWT
   │  ├─ Verify token signature
   │  ├─ Check expiration
   │  └─ Attach user to req.user
   ├─ Route handler receives request
   ├─ Express-validator validates input
   ├─ Business logic executes
   │  ├─ Database queries
   │  ├─ Version management
   │  └─ Permission checks
   ├─ Response formatted
   └─ Send HTTP Response

3. Client Side
   ├─ Axios receives response
   ├─ Axios interceptor handles errors
   ├─ Update UI state
   └─ Render updated component
```

## Security Architecture

### Authentication & Authorization Flow
```
┌──────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: HTTPS (Production)                            │
│  └─ Encrypted transport                                 │
│                                                          │
│  Layer 2: CORS                                          │
│  └─ Origin validation                                   │
│                                                          │
│  Layer 3: Helmet                                        │
│  └─ Security headers (XSS, CSP, etc.)                  │
│                                                          │
│  Layer 4: JWT Authentication                            │
│  ├─ Token validation                                    │
│  ├─ Expiration check                                    │
│  └─ User identity                                       │
│                                                          │
│  Layer 5: Role-Based Authorization                      │
│  ├─ Route-level checks                                  │
│  ├─ Resource-level checks                               │
│  └─ Permission validation                               │
│                                                          │
│  Layer 6: Input Validation                              │
│  ├─ express-validator                                   │
│  ├─ SQL injection prevention                            │
│  └─ XSS prevention                                      │
│                                                          │
│  Layer 7: Database Constraints                          │
│  ├─ Foreign key constraints                             │
│  ├─ CHECK constraints                                   │
│  └─ UNIQUE constraints                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Deployment Architecture (Production)

### Recommended Production Setup
```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                        │
│                       (nginx/AWS ALB)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌────────────────┐              ┌────────────────┐
│ Client Server  │              │ Client Server  │
│ (Static Files) │              │ (Static Files) │
│    (nginx)     │              │    (nginx)     │
└────────────────┘              └────────────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
                ┌────────────────┐
                │   API Gateway  │
                │   (nginx/AWS)  │
                └────────┬───────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌────────────────┐              ┌────────────────┐
│  API Server 1  │              │  API Server 2  │
│  (Node.js)     │              │  (Node.js)     │
└────────┬───────┘              └────────┬───────┘
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
                ┌────────────────┐
                │   Database     │
                │  (PostgreSQL)  │
                │  with Replicas │
                └────────────────┘
```

## Scalability Considerations

### Current POC Architecture
- Single server instance
- SQLite database (file-based)
- Stateless authentication (JWT)
- In-memory session management

### Production Scaling Options

1. **Horizontal Scaling**
   - Multiple Node.js instances
   - Load balancer distribution
   - Stateless design enables easy scaling

2. **Database Scaling**
   - Migrate to PostgreSQL/MySQL
   - Read replicas for queries
   - Write master for updates
   - Connection pooling

3. **Caching Layer**
   - Redis for session storage
   - Cache frequently accessed data
   - Reduce database load

4. **CDN for Static Assets**
   - CloudFlare/AWS CloudFront
   - Faster global delivery
   - Reduced server load

## Performance Optimization

### Current Optimizations
- Database indexes on foreign keys
- Pagination for large datasets
- Prepared statements for queries
- Connection pooling (SQLite WAL mode)
- React code splitting (potential)
- Lazy loading of routes (potential)

### Recommended Additions
- Response compression (gzip)
- Database query optimization
- Implement caching strategy
- Optimize bundle size
- Image optimization
- API rate limiting

---

This architecture is designed to be:
- **Scalable**: Can handle growth in users and data
- **Maintainable**: Clear separation of concerns
- **Secure**: Multiple layers of security
- **Performant**: Optimized for speed
- **Flexible**: Easy to modify and extend
