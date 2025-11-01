# Sequelize Quick Reference

## Installation & Setup

```bash
cd server
npm install
npm run dev
```

## Seed Database
```bash
npm run db:seed
```

## Common Sequelize Queries

### Import Models
```javascript
import { Activity, User, Question } from '../models/index.js';
import { Op } from 'sequelize';
```

### Find One
```javascript
const user = await User.findByPk(userId);
const user = await User.findOne({ where: { email } });
```

### Find All
```javascript
const users = await User.findAll();
const activeUsers = await User.findAll({ where: { status: 'active' } });
```

### Create
```javascript
const user = await User.create({
  id: uuidv4(),
  email: 'user@example.com',
  password_hash: hashedPassword,
  role: 'student'
});
```

### Update
```javascript
// Method 1: Update instance
user.email = 'newemail@example.com';
await user.save();

// Method 2: Bulk update
await User.update(
  { status: 'inactive' },
  { where: { id: userId } }
);
```

### Delete/Archive
```javascript
await User.destroy({ where: { id: userId } }); // Hard delete
activity.status = 'archived';
await activity.save(); // Soft delete (our pattern)
```

### Search (LIKE)
```javascript
const results = await Activity.findAll({
  where: {
    title: { [Op.like]: `%${searchTerm}%` }
  }
});
```

### Multiple Conditions
```javascript
const results = await Activity.findAll({
  where: {
    status: 'active',
    [Op.or]: [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ]
  }
});
```

### Pagination
```javascript
const { count, rows } = await Activity.findAndCountAll({
  where: { status: 'active' },
  limit: 20,
  offset: (page - 1) * 20,
  order: [['created_at', 'DESC']]
});
```

### Include Associations (JOIN)
```javascript
const activity = await Activity.findByPk(id, {
  include: [
    { model: User, as: 'creator', attributes: ['id', 'email'] },
    { model: ActivityElement, as: 'elements' }
  ]
});
```

### Count
```javascript
const count = await User.count({ where: { role: 'student' } });
```

### Transaction
```javascript
import { sequelize } from '../models/index.js';

const t = await sequelize.transaction();
try {
  await Activity.create({ ... }, { transaction: t });
  await ActivityVersion.create({ ... }, { transaction: t });
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

## Model Attributes

### Get JSON Field
```javascript
// Model automatically parses JSON
const activity = await Activity.findByPk(id);
console.log(activity.tags); // Already an array!
```

### Set JSON Field
```javascript
// Model automatically stringifies
activity.tags = ['new', 'tags'];
await activity.save(); // Stored as JSON string
```

## Common Patterns

### Check Existence
```javascript
const exists = await User.findOne({ where: { email } });
if (exists) {
  return res.status(409).json({ error: 'Already exists' });
}
```

### Get or Create
```javascript
const [user, created] = await User.findOrCreate({
  where: { email },
  defaults: { password_hash, role: 'student' }
});
```

### Increment
```javascript
await Activity.increment('version', { where: { id } });
```

### Raw Queries (if needed)
```javascript
const [results, metadata] = await sequelize.query(
  'SELECT * FROM users WHERE id = ?',
  { replacements: [userId] }
);
```

## Validation

```javascript
// In model definition
const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  }
});
```

## Hooks

```javascript
User.beforeCreate(async (user) => {
  // Auto-generate ID if not provided
  if (!user.id) {
    user.id = uuidv4();
  }
});

User.afterUpdate(async (user) => {
  // Log changes
  console.log('User updated:', user.id);
});
```

## Operators

```javascript
import { Op } from 'sequelize';

// Common operators
[Op.eq]: value         // =
[Op.ne]: value         // !=
[Op.gt]: value         // >
[Op.gte]: value        // >=
[Op.lt]: value         // <
[Op.lte]: value        // <=
[Op.like]: '%value%'   // LIKE
[Op.in]: [1, 2, 3]     // IN
[Op.notIn]: [1, 2]     // NOT IN
[Op.or]: [...]         // OR
[Op.and]: [...]        // AND
[Op.between]: [1, 10]  // BETWEEN
```

## File Structure

```
server/src/
├── config/
│   ├── database.js      # Sequelize connection (ES6)
│   └── database.cjs     # Sequelize CLI config (CommonJS)
├── models/
│   ├── User.js
│   ├── Activity.js
│   ├── Question.js
│   ├── ... (other models)
│   └── index.js         # Associations & exports
├── routes/
│   ├── auth.js          # ✅ MIGRATED
│   ├── activities.js    # ⏳ To migrate
│   └── ... (other routes)
└── database/seeders/
    └── seed.js          # Sequelize seed script
```

## Testing Checklist

After migrating a route:

- [ ] Server starts without errors
- [ ] GET endpoints return data
- [ ] POST endpoints create records
- [ ] PUT endpoints update records
- [ ] DELETE/archive endpoints work
- [ ] Associations load correctly
- [ ] Error handling works
- [ ] Frontend still works

## Debugging

### Enable SQL Logging
```javascript
// In config/database.js
const sequelize = new Sequelize({
  // ...
  logging: console.log // Shows all SQL queries
});
```

### Inspect Model
```javascript
console.log(activity.toJSON());
```

### Get SQL Query
```javascript
const query = Activity.findAll({ where: { status: 'active' } });
console.log(query.toString());
```

## Migration Checklist Per Route

1. [ ] Update imports (models instead of db)
2. [ ] Replace `db.prepare()` with Sequelize queries
3. [ ] Use `await` for all queries
4. [ ] Update error handling
5. [ ] Test all endpoints
6. [ ] Verify associations work
7. [ ] Check version saving works
8. [ ] Test with frontend

## Remember

- All Sequelize methods return **Promises** - always use `await`
- Models automatically handle JSON fields if configured
- Use `include` for associations (joins)
- Transactions ensure data consistency
- `findByPk` is shorthand for `findOne({ where: { id } })`
