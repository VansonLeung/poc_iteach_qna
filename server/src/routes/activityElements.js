import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Activity, ActivityElement, ActivityElementVersion, Question, QuestionScoring, Rubric, User } from '../models/index.js';
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
      { 
        model: Question, 
        as: 'question', 
        attributes: ['id', 'title', 'body_html'],
        include: [
          {
            model: QuestionScoring,
            as: 'scoring',
            include: [
              {
                model: Rubric,
                as: 'rubric',
                attributes: ['id', 'title', 'rubric_type']
              }
            ]
          }
        ]
      }
    ]
  });

  const childrenWithNested = [];
  for (const child of children) {
    const nestedChildren = await getNestedChildren(child.id);
    const rubricInfo = child.question?.scoring?.rubric;
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
      rubric_id: rubricInfo?.id || null,
      rubric_title: rubricInfo?.title || null,
      rubric_type: rubricInfo?.rubric_type || null,
      children: nestedChildren
    });
  }

  return childrenWithNested;
};

/**
 * @swagger
 * /api/activity-elements:
 *   post:
 *     summary: Create a new activity element (section or question)
 *     tags: [Activity Elements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activityId
 *               - elementType
 *               - orderIndex
 *             properties:
 *               activityId:
 *                 type: string
 *                 format: uuid
 *                 description: Parent activity ID
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               elementType:
 *                 type: string
 *                 enum: [section, question]
 *                 description: Type of element
 *                 example: "section"
 *               parentElementId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Parent element ID for nesting (null for root level)
 *                 example: null
 *               questionId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Question ID (required if elementType is 'question')
 *                 example: "q1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               title:
 *                 type: string
 *                 nullable: true
 *                 description: Element title (for sections)
 *                 example: "Chapter 1: Introduction"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Element description
 *                 example: "Basic concepts and terminology"
 *               orderIndex:
 *                 type: integer
 *                 minimum: 0
 *                 description: Order within parent element
 *                 example: 0
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Element tags
 *                 example: ["intro", "beginner"]
 *     responses:
 *       201:
 *         description: Activity element created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 element:
 *                   $ref: '#/components/schemas/ActivityElement'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires admin or teacher role
 *       404:
 *         description: Activity, parent element, or question not found
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
 * @swagger
 * /api/activity-elements/{id}:
 *   put:
 *     summary: Update an activity element
 *     tags: [Activity Elements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Activity element ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: string
 *                 format: uuid
 *                 description: Update question ID (for question elements)
 *               title:
 *                 type: string
 *                 description: Update element title
 *               description:
 *                 type: string
 *                 description: Update element description
 *               orderIndex:
 *                 type: integer
 *                 minimum: 0
 *                 description: Update order index
 *               parentElementId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Update parent element (null for root)
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Update tags
 *     responses:
 *       200:
 *         description: Activity element updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 element:
 *                   $ref: '#/components/schemas/ActivityElement'
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Element or referenced resources not found
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
 * @swagger
 * /api/activity-elements:
 *   get:
 *     summary: Get activity elements with nested children
 *     tags: [Activity Elements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activityId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by activity ID
 *       - in: query
 *         name: elementType
 *         schema:
 *           type: string
 *           enum: [section, question]
 *         description: Filter by element type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived]
 *           default: active
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Activity elements retrieved successfully with nested structure
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 elements:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/ActivityElement'
 *                       - type: object
 *                         properties:
 *                           children:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/ActivityElement'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
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
          { 
            model: Question, 
            as: 'question', 
            attributes: ['id', 'title', 'body_html'],
            include: [
              {
                model: QuestionScoring,
                as: 'scoring',
                include: [
                  {
                    model: Rubric,
                    as: 'rubric',
                    attributes: ['id', 'title', 'rubric_type']
                  }
                ]
              }
            ]
          }
        ]
      });

      // Get nested children for each element
      const elementsWithChildren = [];
      for (const e of elements) {
        const children = await getNestedChildren(e.id);
        const rubricInfo = e.question?.scoring?.rubric;
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
          rubric_id: rubricInfo?.id || null,
          rubric_title: rubricInfo?.title || null,
          rubric_type: rubricInfo?.rubric_type || null,
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
 * @swagger
 * /api/activity-elements/{id}:
 *   get:
 *     summary: Get activity element by ID with nested children
 *     tags: [Activity Elements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Activity element ID
 *     responses:
 *       200:
 *         description: Activity element retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 element:
 *                   allOf:
 *                     - $ref: '#/components/schemas/ActivityElement'
 *                     - type: object
 *                       properties:
 *                         children:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ActivityElement'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity element not found
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const element = await ActivityElement.findByPk(id, {
      include: [
        { 
          model: Question, 
          as: 'question', 
          attributes: ['id', 'title', 'body_html'],
          include: [
            {
              model: QuestionScoring,
              as: 'scoring',
              include: [
                {
                  model: Rubric,
                  as: 'rubric',
                  attributes: ['id', 'title', 'rubric_type']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!element) {
      return res.status(404).json({ error: 'Activity element not found' });
    }

    // Get nested children
    const children = await getNestedChildren(id);
    const rubricInfo = element.question?.scoring?.rubric;

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
        rubric_id: rubricInfo?.id || null,
        rubric_title: rubricInfo?.title || null,
        rubric_type: rubricInfo?.rubric_type || null,
        children
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/activity-elements/{id}/archive:
 *   delete:
 *     summary: Archive an activity element (soft delete)
 *     tags: [Activity Elements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Activity element ID
 *     responses:
 *       200:
 *         description: Activity element archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Activity element archived successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Activity element not found
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
