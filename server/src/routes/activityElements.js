import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Activity, ActivityElement, ActivityElementVersion, Question, User } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper function to save activity element version
 */
const saveActivityElementVersion = async (elementId, element, userId) => {
  await ActivityElementVersion.create({
    id: uuidv4(),
    element_id: elementId,
    version: element.version,
    activity_id: element.activity_id,
    parent_element_id: element.parent_element_id,
    element_type: element.element_type,
    question_id: element.question_id,
    title: element.title,
    description: element.description,
    order_index: element.order_index,
    status: element.status,
    tags: element.tags,
    created_by: userId
  });
};

/**
 * Helper function to get nested children
 */
const getNestedChildren = async (elementId) => {
  const children = await ActivityElement.findAll({
    where: { parent_element_id: elementId },
    order: [['order_index', 'ASC']],
    include: [
      { model: Question, as: 'question', attributes: ['id', 'title', 'body_html'] }
    ]
  });

  const childrenWithNested = [];
  for (const child of children) {
    const nestedChildren = await getNestedChildren(child.id);
    childrenWithNested.push({
      id: child.id,
      activity_id: child.activity_id,
      parent_element_id: child.parent_element_id,
      element_type: child.element_type,
      question_id: child.question_id,
      title: child.title,
      description: child.description,
      order_index: child.order_index,
      status: child.status,
      tags: child.tags,
      version: child.version,
      question_title: child.question ? child.question.title : null,
      body_html: child.question ? child.question.body_html : null,
      children: nestedChildren
    });
  }

  return childrenWithNested;
};

/**
 * POST /api/activity-elements
 * Create new activity element
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('activityId').isUUID().withMessage('Valid activity ID required'),
    body('elementType').isIn(['section', 'question']).withMessage('Element type must be section or question'),
    body('parentElementId').optional({ nullable: true, checkFalsy: true }).isUUID(),
    body('questionId').optional({ nullable: true, checkFalsy: true }).isUUID(),
    body('title').optional({ nullable: true, checkFalsy: true }).trim(),
    body('description').optional({ nullable: true, checkFalsy: true }),
    body('orderIndex').isInt({ min: 0 }).withMessage('Order index must be a positive integer'),
    body('tags').optional({ nullable: true, checkFalsy: true }).isArray()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { activityId, elementType, parentElementId, questionId, title, description, orderIndex, tags = [] } = req.body;
      const elementId = uuidv4();
      const userId = req.user.userId;

      // Validate activity exists
      const activity = await Activity.findByPk(activityId);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      // Validate parent element if provided
      if (parentElementId) {
        const parent = await ActivityElement.findByPk(parentElementId, {
          attributes: ['id', 'activity_id']
        });
        if (!parent) {
          return res.status(404).json({ error: 'Parent element not found' });
        }
        if (parent.activity_id !== activityId) {
          return res.status(400).json({ error: 'Parent element must belong to the same activity' });
        }
      }

      // Validate question if element type is question
      if (elementType === 'question') {
        if (!questionId) {
          return res.status(400).json({ error: 'Question ID required for question elements' });
        }
        const question = await Question.findByPk(questionId);
        if (!question) {
          return res.status(404).json({ error: 'Question not found' });
        }
      }

      // Validate user exists (for foreign key constraint)
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found. Please log in again.' });
      }

      // Create element
      const element = await ActivityElement.create({
        id: elementId,
        activity_id: activityId,
        parent_element_id: parentElementId || null,
        element_type: elementType,
        question_id: questionId || null,
        title: title || null,
        description: description || null,
        order_index: orderIndex,
        tags,
        created_by: userId,
        updated_by: userId
      });

      // Save first version
      await saveActivityElementVersion(elementId, element, userId);

      res.status(201).json({
        message: 'Activity element created successfully',
        element: {
          id: element.id,
          activity_id: element.activity_id,
          parent_element_id: element.parent_element_id,
          element_type: element.element_type,
          question_id: element.question_id,
          title: element.title,
          description: element.description,
          order_index: element.order_index,
          status: element.status,
          tags: element.tags,
          version: element.version,
          created_by: element.created_by,
          updated_by: element.updated_by,
          created_at: element.created_at,
          updated_at: element.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/activity-elements/:id
 * Edit activity element
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('questionId').optional().isUUID(),
    body('title').optional().trim(),
    body('description').optional(),
    body('orderIndex').optional().isInt({ min: 0 }),
    body('parentElementId').optional().custom((value) => {
      if (value === null) return true; // Allow null for root level
      if (typeof value === 'string' && value.length > 0) return true; // Allow UUID string
      throw new Error('parentElementId must be a valid UUID or null');
    }),
    body('tags').optional().isArray()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { questionId, title, description, orderIndex, parentElementId, tags } = req.body;
      const userId = req.user.userId;

      // Get current element
      const element = await ActivityElement.findByPk(id);
      if (!element) {
        return res.status(404).json({ error: 'Activity element not found' });
      }

      // Validate question if provided and element type is question
      if (questionId !== undefined && element.element_type === 'question') {
        const question = await Question.findByPk(questionId);
        if (!question) {
          return res.status(404).json({ error: 'Question not found' });
        }
      }

      // Validate parent element if provided
      if (parentElementId !== undefined && parentElementId !== null) {
        const parentElement = await ActivityElement.findByPk(parentElementId);
        if (!parentElement) {
          return res.status(404).json({ error: 'Parent element not found' });
        }
        // Ensure parent is a section
        if (parentElement.element_type !== 'section') {
          return res.status(400).json({ error: 'Parent element must be a section' });
        }
        // Prevent circular reference
        if (parentElementId === id) {
          return res.status(400).json({ error: 'Cannot set element as its own parent' });
        }
      }

      // Validate user exists (for foreign key constraint)
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found. Please log in again.' });
      }

      // Check if there's anything to update
      const hasChanges = questionId !== undefined || title !== undefined ||
                         description !== undefined || orderIndex !== undefined ||
                         parentElementId !== undefined || tags !== undefined;
      if (!hasChanges) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Update fields
      if (questionId !== undefined && element.element_type === 'question') {
        element.question_id = questionId;
      }
      if (title !== undefined) element.title = title;
      if (description !== undefined) element.description = description;
      if (orderIndex !== undefined) element.order_index = orderIndex;
      if (parentElementId !== undefined) element.parent_element_id = parentElementId;
      if (tags !== undefined) element.tags = tags;

      // Increment version
      element.version = element.version + 1;
      element.updated_by = userId;
      element.updated_at = new Date();

      await element.save();

      // Save version
      await saveActivityElementVersion(id, element, userId);

      res.json({
        message: 'Activity element updated successfully',
        element: {
          id: element.id,
          activity_id: element.activity_id,
          parent_element_id: element.parent_element_id,
          element_type: element.element_type,
          question_id: element.question_id,
          title: element.title,
          description: element.description,
          order_index: element.order_index,
          status: element.status,
          tags: element.tags,
          version: element.version,
          created_by: element.created_by,
          updated_by: element.updated_by,
          created_at: element.created_at,
          updated_at: element.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/activity-elements
 * Find activity elements with filters
 */
router.get(
  '/',
  authenticate,
  [
    query('activityId').optional().isUUID(),
    query('elementType').optional().isIn(['section', 'question']),
    query('status').optional().isIn(['active', 'archived']),
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
        activityId,
        elementType,
        status = 'active',
        page = 1,
        limit = 50
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause
      const where = { parent_element_id: null }; // Only get top-level elements

      if (activityId) {
        where.activity_id = activityId;
      }

      if (elementType) {
        where.element_type = elementType;
      }

      if (status) {
        where.status = status;
      }

      // Get elements with count
      const { count, rows: elements } = await ActivityElement.findAndCountAll({
        where,
        limit,
        offset,
        order: [['order_index', 'ASC']],
        include: [
          { model: Question, as: 'question', attributes: ['id', 'title', 'body_html'] }
        ]
      });

      // Get nested children for each element
      const elementsWithChildren = [];
      for (const e of elements) {
        const children = await getNestedChildren(e.id);
        elementsWithChildren.push({
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
          version: e.version,
          question_title: e.question ? e.question.title : null,
          body_html: e.question ? e.question.body_html : null,
          children
        });
      }

      res.json({
        elements: elementsWithChildren,
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
 * GET /api/activity-elements/:id
 * Get activity element by ID with nested children
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const element = await ActivityElement.findByPk(id, {
      include: [
        { model: Question, as: 'question', attributes: ['id', 'title', 'body_html'] }
      ]
    });

    if (!element) {
      return res.status(404).json({ error: 'Activity element not found' });
    }

    // Get nested children
    const children = await getNestedChildren(id);

    res.json({
      element: {
        id: element.id,
        activity_id: element.activity_id,
        parent_element_id: element.parent_element_id,
        element_type: element.element_type,
        question_id: element.question_id,
        title: element.title,
        description: element.description,
        order_index: element.order_index,
        status: element.status,
        tags: element.tags,
        version: element.version,
        question_title: element.question ? element.question.title : null,
        body_html: element.question ? element.question.body_html : null,
        children
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/activity-elements/:id/archive
 * Archive activity element (soft delete)
 */
router.delete(
  '/:id/archive',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const element = await ActivityElement.findByPk(id);
      if (!element) {
        return res.status(404).json({ error: 'Activity element not found' });
      }

      // Update status and version
      element.status = 'archived';
      element.version = element.version + 1;
      element.updated_by = userId;
      element.updated_at = new Date();

      await element.save();

      // Save version
      await saveActivityElementVersion(id, element, userId);

      res.json({ message: 'Activity element archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
