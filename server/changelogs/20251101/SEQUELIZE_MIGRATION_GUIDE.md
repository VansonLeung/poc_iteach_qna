# Sequelize Migration Guide

This guide explains how to refactor the remaining routes from raw SQL to Sequelize ORM.

## ✅ Completed

- [x] package.json updated with Sequelize dependencies
- [x] Sequelize configuration created
- [x] All Sequelize models created with associations
- [x] Auth routes fully migrated to Sequelize
- [x] Server index.js updated to use Sequelize

## 🔄 Pattern for Route Migration

### Old Pattern (Raw SQL)
```javascript
import db from '../database/index.js';

const result = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
```

### New Pattern (Sequelize)
```javascript
import { Activity, User } from '../models/index.js';

const result = await Activity.findByPk(id, {
  include: [{ model: User, as: 'creator' }]
});
```

## Common Sequelize Operations

### 1. Find One Record

**Old:**
```javascript
const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
```

**New:**
```javascript
const activity = await Activity.findByPk(id);
// or
const activity = await Activity.findOne({ where: { id } });
```

### 2. Find All with Where Clause

**Old:**
```javascript
const activities = db.prepare('SELECT * FROM activities WHERE status = ?').all('active');
```

**New:**
```javascript
const activities = await Activity.findAll({
  where: { status: 'active' }
});
```

### 3. Create

**Old:**
```javascript
const stmt = db.prepare('INSERT INTO activities (id, title) VALUES (?, ?)');
stmt.run(id, title);
```

**New:**
```javascript
const activity = await Activity.create({
  id,
  title
});
```

### 4. Update

**Old:**
```javascript
const stmt = db.prepare('UPDATE activities SET title = ? WHERE id = ?');
stmt.run(newTitle, id);
```

**New:**
```javascript
await Activity.update(
  { title: newTitle },
  { where: { id } }
);
// or
activity.title = newTitle;
await activity.save();
```

### 5. Search with LIKE

**Old:**
```javascript
const results = db.prepare('SELECT * FROM activities WHERE title LIKE ?').all(`%${search}%`);
```

**New:**
```javascript
import { Op } from 'sequelize';

const results = await Activity.findAll({
  where: {
    title: {
      [Op.like]: `%${search}%`
    }
  }
});
```

### 6. Pagination

**Old:**
```javascript
const results = db.prepare('SELECT * FROM activities LIMIT ? OFFSET ?').all(limit, offset);
```

**New:**
```javascript
const results = await Activity.findAll({
  limit,
  offset
});
```

### 7. Count

**Old:**
```javascript
const { count } = db.prepare('SELECT COUNT(*) as count FROM activities').get();
```

**New:**
```javascript
const count = await Activity.count();
// or with where
const count = await Activity.count({ where: { status: 'active' } });
```

### 8. Find with Includes (Joins)

**Old:**
```javascript
const result = db.prepare(`
  SELECT a.*, u.email as creator_email
  FROM activities a
  LEFT JOIN users u ON a.created_by = u.id
  WHERE a.id = ?
`).get(id);
```

**New:**
```javascript
const result = await Activity.findByPk(id, {
  include: [
    { model: User, as: 'creator', attributes: ['email'] }
  ]
});
```

## Step-by-Step Migration for Each Route File

### Activities Routes (activities.js)

1. Update imports:
```javascript
import { Activity, ActivityVersion, User } from '../models/index.js';
import { Op } from 'sequelize';
```

2. Replace `db.prepare()` queries with Sequelize:

**Find all:**
```javascript
// Old
let query = 'SELECT * FROM activities WHERE 1=1';
const params = [];
if (status) {
  query += ' AND status = ?';
  params.push(status);
}
const activities = db.prepare(query).all(...params);

// New
const where = {};
if (status) {
  where.status = status;
}
if (search) {
  where[Op.or] = [
    { title: { [Op.like]: `%${search}%` } },
    { description: { [Op.like]: `%${search}%` } }
  ];
}
const activities = await Activity.findAll({
  where,
  limit,
  offset,
  include: [{ model: User, as: 'creator' }]
});
```

**Create:**
```javascript
// Old
const stmt = db.prepare(`
  INSERT INTO activities (id, title, description, tags, created_by, updated_by)
  VALUES (?, ?, ?, ?, ?, ?)
`);
stmt.run(activityId, title, description, tagsJson, userId, userId);

// New
const activity = await Activity.create({
  id: activityId,
  title,
  description,
  tags, // Sequelize model handles JSON conversion
  created_by: userId,
  updated_by: userId
});
```

**Update:**
```javascript
// Old
const stmt = db.prepare(`
  UPDATE activities SET ${updates.join(', ')} WHERE id = ?
`);
stmt.run(...values);

// New
const activity = await Activity.findByPk(id);
if (title !== undefined) activity.title = title;
if (description !== undefined) activity.description = description;
if (tags !== undefined) activity.tags = tags;
activity.version = activity.version + 1;
activity.updated_by = userId;
activity.updated_at = new Date();
await activity.save();
```

**Save Version:**
```javascript
// Old
db.prepare(`
  INSERT INTO activity_versions (id, activity_id, version, ...)
  VALUES (?, ?, ?, ...)
`).run(versionId, activityId, ...);

// New
await ActivityVersion.create({
  id: versionId,
  activity_id: activityId,
  version: activity.version,
  title: activity.title,
  description: activity.description,
  status: activity.status,
  tags: activity.tags,
  created_by: userId
});
```

### Questions Routes (questions.js)

Similar pattern, with special handling for:

1. **Parent question lookup:**
```javascript
// New
const question = await Question.findByPk(id, {
  include: [
    { model: Question, as: 'parentQuestion' },
    { model: QuestionInteractiveElement, as: 'interactiveElements' }
  ]
});
```

2. **Recursive inheritance:**
```javascript
const getInheritedBody = async (parentQuestionId) => {
  if (!parentQuestionId) return null;

  const parent = await Question.findByPk(parentQuestionId, {
    attributes: ['body_html', 'parent_question_id']
  });

  if (!parent) return null;

  if (parent.parent_question_id) {
    return await getInheritedBody(parent.parent_question_id) || parent.body_html;
  }

  return parent.body_html;
};
```

### Activity Elements Routes (activityElements.js)

Special handling for nested elements:

```javascript
const getNestedChildren = async (elementId) => {
  const children = await ActivityElement.findAll({
    where: { parent_element_id: elementId },
    include: [{ model: Question, as: 'question' }],
    order: [['order_index', 'ASC']]
  });

  const childrenWithNested = await Promise.all(
    children.map(async (child) => ({
      ...child.toJSON(),
      children: await getNestedChildren(child.id)
    }))
  );

  return childrenWithNested;
};
```

### Submissions Routes (submissions.js)

```javascript
// Find submissions with related data
const submissions = await UserActivitySubmission.findAll({
  where,
  include: [
    { model: Activity, as: 'activity', attributes: ['title'] },
    { model: User, as: 'user', attributes: ['email', 'first_name', 'last_name'] }
  ],
  limit,
  offset,
  order: [['created_at', 'DESC']]
});

// Find submission with answers
const submission = await UserActivitySubmission.findByPk(id, {
  include: [
    { model: Activity, as: 'activity' },
    { model: User, as: 'user' },
    {
      model: UserActivitySubmissionAnswer,
      as: 'answers',
      include: [{ model: Question, as: 'question' }]
    }
  ]
});
```

### Submission Answers Routes (submissionAnswers.js)

```javascript
// Create answer with validation
const answer = await UserActivitySubmissionAnswer.create({
  id: answerId,
  submission_id: submissionId,
  question_id: questionId,
  element_uuid: elementUuid,
  answer_data: answerData, // Model handles JSON conversion
  submitted_by: userId,
  updated_by: userId
});
```

## Transaction Support

For operations that need atomicity (like creating an activity with version):

```javascript
import { sequelize } from '../models/index.js';

const transaction = await sequelize.transaction();

try {
  const activity = await Activity.create({
    id: activityId,
    title,
    description,
    created_by: userId,
    updated_by: userId
  }, { transaction });

  await ActivityVersion.create({
    id: versionId,
    activity_id: activityId,
    version: 1,
    title,
    description,
    created_by: userId
  }, { transaction });

  await transaction.commit();

  return activity;
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

## Testing After Migration

1. **Start the server:**
```bash
cd server
npm install
npm run dev
```

2. **Test each endpoint:**
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- Test CRUD operations for each resource

3. **Check database:**
```bash
sqlite3 database.sqlite
.tables
SELECT * FROM users;
```

## Benefits of Sequelize

1. **Type Safety**: Better IDE autocomplete
2. **Associations**: Automatic joins and eager loading
3. **Validation**: Built-in model validation
4. **Migrations**: Version control for database schema
5. **Query Builder**: Easier to construct complex queries
6. **Transactions**: Built-in transaction support
7. **Hooks**: Before/after hooks for custom logic

## Common Gotchas

1. **Async/Await**: All Sequelize operations return Promises
2. **JSON Fields**: Use getters/setters for automatic parsing
3. **Associations**: Must be defined before querying
4. **Timestamps**: Can be disabled per model
5. **Column Names**: Use `field` option if database column differs from model attribute

## Next Steps

1. Migrate activities.js routes
2. Migrate questions.js routes
3. Migrate activityElements.js routes
4. Migrate submissions.js routes
5. Migrate submissionAnswers.js routes
6. Update seed script
7. Test all endpoints
8. Update documentation

## Example: Complete Activities Routes Migration

See [activities-sequelize.js](./examples/activities-sequelize.js) for a complete example of migrated routes.
