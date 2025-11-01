import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Activity, ActivityVersion, User, ActivityElement, Question } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper function to save activity version
 */
const saveActivityVersion = async (activityId, activity, userId) => {
  await ActivityVersion.create({
    id: uuidv4(),
    activity_id: activityId,
    version: activity.version,
    title: activity.title,
    description: activity.description,
    status: activity.status,
    tags: activity.tags,
    created_by: userId
  });
};

/**
 * @swagger
 * /api/activities:
 *   post:
 *     summary: Create a new activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: Activity title
 *                 example: Introduction to JavaScript
 *               description:
 *                 type: string
 *                 description: Activity description
 *                 example: Learn the basics of JavaScript programming
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Activity tags
 *                 example: ["javascript", "programming", "beginner"]
 *     responses:
 *       201:
 *         description: Activity created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activity:
 *                   $ref: '#/components/schemas/Activity'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin or teacher role
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional(),
    body('tags').optional().isArray()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, tags = [] } = req.body;
      const activityId = uuidv4();
      const userId = req.user.userId;

      // Create activity
      const activity = await Activity.create({
        id: activityId,
        title,
        description,
        tags,
        created_by: userId,
        updated_by: userId
      });

      // Save first version
      await saveActivityVersion(activityId, activity, userId);

      res.status(201).json({
        message: 'Activity created successfully',
        activity: {
          id: activity.id,
          title: activity.title,
          description: activity.description,
          tags: activity.tags,
          status: activity.status,
          version: activity.version,
          created_by: activity.created_by,
          updated_by: activity.updated_by,
          created_at: activity.created_at,
          updated_at: activity.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/activities/:id
 * Edit activity
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional(),
    body('tags').optional().isArray()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { title, description, tags } = req.body;
      const userId = req.user.userId;

      // Get current activity
      const activity = await Activity.findByPk(id);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      // Check if there's anything to update
      const hasChanges = title !== undefined || description !== undefined || tags !== undefined;
      if (!hasChanges) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Update fields
      if (title !== undefined) activity.title = title;
      if (description !== undefined) activity.description = description;
      if (tags !== undefined) activity.tags = tags;

      // Increment version
      activity.version = activity.version + 1;
      activity.updated_by = userId;
      activity.updated_at = new Date();

      await activity.save();

      // Save version
      await saveActivityVersion(id, activity, userId);

      res.json({
        message: 'Activity updated successfully',
        activity: {
          id: activity.id,
          title: activity.title,
          description: activity.description,
          tags: activity.tags,
          status: activity.status,
          version: activity.version,
          created_by: activity.created_by,
          updated_by: activity.updated_by,
          created_at: activity.created_at,
          updated_at: activity.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/activities
 * Find activities with filters
 */
router.get(
  '/',
  authenticate,
  [
    query('status').optional().isIn(['active', 'archived']),
    query('search').optional().trim(),
    query('tags').optional(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        status = 'active',
        search,
        tags,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause
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

      if (tags) {
        const tagList = Array.isArray(tags) ? tags : [tags];
        // For JSON stored as text, we need to use LIKE
        where[Op.and] = tagList.map(tag => ({
          tags: { [Op.like]: `%"${tag}"%` }
        }));
      }

      // Get activities with count
      const { count, rows: activities } = await Activity.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }
        ]
      });

      res.json({
        activities: activities.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          tags: a.tags,
          status: a.status,
          version: a.version,
          created_by: a.created_by,
          updated_by: a.updated_by,
          created_at: a.created_at,
          updated_at: a.updated_at,
          creator: a.creator ? {
            id: a.creator.id,
            email: a.creator.email,
            first_name: a.creator.first_name,
            last_name: a.creator.last_name
          } : null
        })),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/activities/:id
 * Get activity by ID
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] },
        { model: User, as: 'updater', attributes: ['id', 'email', 'first_name', 'last_name'] }
      ]
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Get activity elements
    const elements = await ActivityElement.findAll({
      where: { activity_id: id },
      order: [['order_index', 'ASC']],
      include: [
        {
          model: Question,
          as: 'question',
          attributes: ['id', 'title']
        }
      ]
    });

    res.json({
      activity: {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        tags: activity.tags,
        status: activity.status,
        version: activity.version,
        created_by: activity.created_by,
        updated_by: activity.updated_by,
        created_at: activity.created_at,
        updated_at: activity.updated_at,
        creator: activity.creator ? {
          id: activity.creator.id,
          email: activity.creator.email,
          first_name: activity.creator.first_name,
          last_name: activity.creator.last_name
        } : null,
        updater: activity.updater ? {
          id: activity.updater.id,
          email: activity.updater.email,
          first_name: activity.updater.first_name,
          last_name: activity.updater.last_name
        } : null
      },
      elements: elements.map(e => ({
        id: e.id,
        activity_id: e.activity_id,
        parent_element_id: e.parent_element_id,
        element_type: e.element_type,
        question_id: e.question_id,
        title: e.title,
        description: e.description,
        order_index: e.order_index,
        status: e.status,
        tags: e.tags,
        version: e.version
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/activities/:id/archive
 * Archive activity (soft delete)
 */
router.delete(
  '/:id/archive',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const activity = await Activity.findByPk(id);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      // Update status and version
      activity.status = 'archived';
      activity.version = activity.version + 1;
      activity.updated_by = userId;
      activity.updated_at = new Date();

      await activity.save();

      // Save version
      await saveActivityVersion(id, activity, userId);

      res.json({ message: 'Activity archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/activities/:id/versions
 * Get activity version history
 */
router.get('/:id/versions', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const versions = await ActivityVersion.findAll({
      where: { activity_id: id },
      order: [['version', 'DESC']],
      include: [
        { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }
      ]
    });

    res.json({
      versions: versions.map(v => ({
        id: v.id,
        activity_id: v.activity_id,
        version: v.version,
        title: v.title,
        description: v.description,
        status: v.status,
        tags: v.tags,
        created_by: v.created_by,
        created_at: v.created_at,
        creator: v.creator ? {
          email: v.creator.email,
          first_name: v.creator.first_name,
          last_name: v.creator.last_name
        } : null
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
