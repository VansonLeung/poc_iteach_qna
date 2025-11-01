# Swagger API Documentation

This project now includes comprehensive Swagger/OpenAPI documentation for all API endpoints.

## Accessing the Documentation

### Swagger UI (Interactive Documentation)
Visit the interactive documentation interface:
```
http://localhost:3001/api-doc
```

The Swagger UI provides:
- **Interactive API testing**: Try out endpoints directly from the browser
- **Request/Response examples**: See example payloads and responses
- **Authentication testing**: Add Bearer tokens and test authenticated endpoints
- **Schema validation**: View all data models and validation rules

### Swagger JSON (Machine-Readable)
Get the raw OpenAPI specification:
```
http://localhost:3001/swagger.json
```

This endpoint provides the complete OpenAPI 3.0 specification in JSON format, which can be:
- Imported into API testing tools (Postman, Insomnia)
- Used for code generation (client SDKs)
- Integrated into CI/CD pipelines
- Consumed by API management platforms

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── swagger.js              # Main Swagger configuration
│   ├── docs/
│   │   └── swagger-additions.js    # Additional endpoint documentation
│   └── routes/
│       ├── auth.js                 # Authentication endpoints (documented)
│       ├── activities.js           # Activity endpoints (partially documented)
│       ├── activityElements.js     # Activity element endpoints
│       ├── questions.js            # Question endpoints
│       ├── submissions.js          # Submission endpoints
│       ├── submissionAnswers.js    # Submission answer endpoints
│       ├── rubrics.js              # Rubric endpoints
│       └── questionScoring.js      # Question scoring endpoints
```

## Configuration

### Swagger Config ([server/src/config/swagger.js](server/src/config/swagger.js:1))

The Swagger configuration includes:

**API Information:**
- Title: iTeach Q&A Platform API
- Version: 1.0.0
- Description: Interactive Question-Answer Learning/Online Training Platform
- Contact: support@iteach-qna.com
- License: MIT

**Servers:**
- Development: http://localhost:3001
- Production: https://api.iteach-qna.com (placeholder)

**Security:**
- JWT Bearer Authentication
- Format: `Bearer <token>`

**Schema Definitions:**
- User
- Activity
- Question
- ActivityElement
- Submission
- Rubric
- Pagination
- Error responses
- Validation errors

**Tags:**
- Authentication
- Activities
- Activity Elements
- Questions
- Submissions
- Submission Answers
- Rubrics
- Question Scoring

## Currently Documented Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user profile | Yes |

**Examples:**

**Register:**
```json
POST /api/auth/register
{
  "email": "john.doe@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

**Login:**
```json
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

### Activities (`/api/activities`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/activities` | Create activity | Yes | admin, teacher |
| GET | `/api/activities` | List activities | Yes | All |
| GET | `/api/activities/:id` | Get activity with elements | Yes | All |
| PUT | `/api/activities/:id` | Update activity | Yes | admin, teacher |
| DELETE | `/api/activities/:id/archive` | Archive activity | Yes | admin, teacher |
| GET | `/api/activities/:id/versions` | Get version history | Yes | All |

**Query Parameters for List:**
- `status`: Filter by status (active, archived)
- `search`: Search in title and description
- `tags`: Filter by tags (array)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Example:**
```json
POST /api/activities
Authorization: Bearer <token>
{
  "title": "Introduction to JavaScript",
  "description": "Learn the basics of JavaScript programming",
  "tags": ["javascript", "programming", "beginner"]
}
```

## Adding Documentation to New Endpoints

When creating new API endpoints, add Swagger documentation using JSDoc comments:

### Basic Template

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     summary: Short description of endpoint
 *     tags: [Tag Name]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - field1
 *               - field2
 *             properties:
 *               field1:
 *                 type: string
 *                 description: Field description
 *                 example: Example value
 *               field2:
 *                 type: integer
 *                 description: Another field
 *                 example: 42
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.post('/your-endpoint', authenticate, async (req, res) => {
  // Your handler code
});
```

### Using Schema References

Instead of defining schemas inline, reference common schemas:

```javascript
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
```

### Path Parameters

```javascript
/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID
 */
```

### Query Parameters

```javascript
/**
 * @swagger
 * /api/items:
 *   get:
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 */
```

## Testing with Swagger UI

### 1. Authenticate
1. Go to http://localhost:3001/api-doc
2. Click the **Authorize** button (lock icon)
3. Login first using `/api/auth/login` to get a token
4. Enter your token in the format: `Bearer <your_token>`
5. Click **Authorize**

### 2. Test Endpoints
1. Expand any endpoint
2. Click **Try it out**
3. Fill in the required parameters
4. Click **Execute**
5. View the response below

### 3. View Schemas
- Scroll down to **Schemas** section
- Explore all data models
- See validation rules and examples

## Importing to API Clients

### Postman

1. Open Postman
2. Click **Import**
3. Select **Link**
4. Enter: `http://localhost:3001/swagger.json`
5. Click **Import**
6. All endpoints will be available in a new collection

### Insomnia

1. Open Insomnia
2. Click **Application** → **Preferences** → **Data**
3. Click **Import Data** → **From URL**
4. Enter: `http://localhost:3001/swagger.json`
5. Click **Fetch and Import**

## Best Practices

### 1. Keep Documentation in Sync
- Update Swagger docs when changing endpoints
- Add docs for new endpoints immediately
- Review docs during code review

### 2. Use Consistent Examples
- Provide realistic example values
- Use consistent UUIDs in examples
- Show both success and error responses

### 3. Document All Response Codes
- 200/201: Success
- 400: Validation error
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Internal server error

### 4. Use Schema References
- Define common schemas in `swagger.js`
- Reference them with `$ref`
- Avoid duplicating schema definitions

### 5. Tag Endpoints Logically
- Group related endpoints with tags
- Use consistent tag names
- Keep tag names short and descriptive

## Common Issues & Solutions

### Issue: Documentation not updating

**Solution:**
Restart the server after modifying Swagger comments:
```bash
npm run dev
```

### Issue: Schema not found

**Solution:**
Check that schema is defined in `/config/swagger.js` under `components.schemas`:
```javascript
components: {
  schemas: {
    YourSchema: { /* definition */ }
  }
}
```

### Issue: Authentication not working in Swagger UI

**Solution:**
1. Login via `/api/auth/login` endpoint first
2. Copy the `token` from response
3. Click **Authorize** button
4. Enter `Bearer <paste_token_here>`
5. Do NOT include quotes

## Extending Documentation

### Adding New Schemas

Edit `/server/src/config/swagger.js`:

```javascript
components: {
  schemas: {
    NewSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  }
}
```

### Adding Bulk Documentation

For endpoints with many operations, create a separate file in `/docs/`:

```javascript
// /server/src/docs/new-feature.js

/**
 * @swagger
 * /api/new-feature:
 *   get:
 *     summary: Get all items
 *     ...
 */

/**
 * @swagger
 * /api/new-feature:
 *   post:
 *     summary: Create new item
 *     ...
 */
```

The file will be automatically picked up by swagger-jsdoc.

## ✅ Completed: All Endpoints Documented!

All API endpoints now have comprehensive Swagger documentation:

### Activity Elements ✅
- ✅ GET `/api/activity-elements` - List with nested children
- ✅ POST `/api/activity-elements` - Create new element
- ✅ GET `/api/activity-elements/:id` - Get by ID with children
- ✅ PUT `/api/activity-elements/:id` - Update element
- ✅ DELETE `/api/activity-elements/:id/archive` - Archive element

### Questions ✅
- ✅ GET `/api/questions` - List with pagination
- ✅ POST `/api/questions` - Create new question
- ✅ GET `/api/questions/:id` - Get by ID
- ✅ PUT `/api/questions/:id` - Update question
- ✅ DELETE `/api/questions/:id/archive` - Archive question
- ✅ GET `/api/questions/:id/versions` - Version history

### Submissions ✅
- ✅ GET `/api/submissions` - List with filters
- ✅ POST `/api/submissions` - Create new submission
- ✅ GET `/api/submissions/:id` - Get by ID with answers
- ✅ PUT `/api/submissions/:id` - Update status
- ✅ DELETE `/api/submissions/:id/archive` - Archive submission
- ✅ GET `/api/submissions/:id/versions` - Version history

### Submission Answers ✅
- ✅ GET `/api/submission-answers` - List with filters
- ✅ POST `/api/submission-answers` - Create new answer
- ✅ GET `/api/submission-answers/:id` - Get by ID
- ✅ PUT `/api/submission-answers/:id` - Update answer
- ✅ DELETE `/api/submission-answers/:id/archive` - Archive answer
- ✅ GET `/api/submission-answers/:id/versions` - Version history

### Rubrics ✅
- ✅ GET `/api/rubrics` - List with filters
- ✅ POST `/api/rubrics` - Create new rubric
- ✅ GET `/api/rubrics/:id` - Get by ID with criteria
- ✅ PUT `/api/rubrics/:id` - Update rubric
- ✅ DELETE `/api/rubrics/:id/archive` - Archive rubric
- ✅ POST `/api/rubrics/:id/criteria` - Add criterion
- ✅ POST `/api/rubrics/:id/criteria/:criterionId/levels` - Add level

### Question Scoring ✅
- ✅ POST `/api/question-scoring` - Configure scoring
- ✅ GET `/api/question-scoring/:questionId` - Get configuration
- ✅ PUT `/api/question-scoring/:questionId` - Update configuration
- ✅ DELETE `/api/question-scoring/:questionId` - Delete configuration
- ✅ POST `/api/question-scoring/:questionId/calculate` - Calculate score

**Total: 30 Endpoints Fully Documented**

## Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger JSDoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [Express Validator](https://express-validator.github.io/docs/)

## Support

For issues or questions about API documentation:
- Create an issue in the repository
- Contact: support@iteach-qna.com

---

**Last Updated:** 2025-11-01
**Version:** 1.0.0
