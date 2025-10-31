import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Rubric, RubricCriterion, RubricLevel, User } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/rubrics
 * Create new rubric
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('rubric_type').isIn(['points', 'criteria', 'pass_fail', 'percentage', 'custom']).withMessage('Invalid rubric type'),
    body('max_score').optional().isFloat({ min: 0 }).withMessage('Max score must be a positive number'),
    body('description').optional().trim(),
    body('criteria').optional().isArray().withMessage('Criteria must be an array'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, rubric_type, max_score, description, criteria } = req.body;
      const rubricId = uuidv4();
      const userId = req.user.userId;

      // Validate user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create rubric
      const rubric = await Rubric.create({
        id: rubricId,
        title,
        rubric_type,
        max_score,
        description,
        created_by: userId,
      });

      // Create criteria if provided
      if (criteria && criteria.length > 0) {
        for (let i = 0; i < criteria.length; i++) {
          const criterion = criteria[i];
          const criterionId = uuidv4();

          await RubricCriterion.create({
            id: criterionId,
            rubric_id: rubricId,
            criterion_name: criterion.criterion_name,
            description: criterion.description,
            max_score: criterion.max_score,
            order_index: i,
          });

          // Create levels for this criterion if provided
          if (criterion.levels && criterion.levels.length > 0) {
            for (let j = 0; j < criterion.levels.length; j++) {
              const level = criterion.levels[j];
              await RubricLevel.create({
                id: uuidv4(),
                criterion_id: criterionId,
                level_name: level.level_name,
                description: level.description,
                score_value: level.score_value,
                order_index: j,
              });
            }
          }
        }
      }

      // Fetch complete rubric with criteria and levels
      const completeRubric = await Rubric.findByPk(rubricId, {
        include: [
          {
            model: RubricCriterion,
            as: 'criteria',
            include: [
              { 
                model: RubricLevel, 
                as: 'levels'
              }
            ]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'email', 'first_name', 'last_name']
          }
        ],
        order: [
          [{ model: RubricCriterion, as: 'criteria' }, 'order_index', 'ASC'],
          [{ model: RubricCriterion, as: 'criteria' }, { model: RubricLevel, as: 'levels' }, 'order_index', 'ASC']
        ]
      });

      res.status(201).json({
        message: 'Rubric created successfully',
        rubric: completeRubric
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/rubrics
 * Get all rubrics with pagination and filtering
 */
router.get(
  '/',
  authenticate,
  [
    query('rubric_type').optional().isIn(['points', 'criteria', 'pass_fail', 'percentage', 'custom']),
    query('status').optional().isIn(['active', 'archived']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        rubric_type,
        status = 'active',
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { status };

      if (rubric_type) {
        where.rubric_type = rubric_type;
      }

      const { count, rows: rubrics } = await Rubric.findAndCountAll({
        where,
        limit,
        offset,
        order: [
          ['created_at', 'DESC'],
          [{ model: RubricCriterion, as: 'criteria' }, 'order_index', 'ASC'],
          [{ model: RubricCriterion, as: 'criteria' }, { model: RubricLevel, as: 'levels' }, 'order_index', 'ASC']
        ],
        include: [
          {
            model: RubricCriterion,
            as: 'criteria',
            include: [
              { model: RubricLevel, as: 'levels' }
            ]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'email', 'first_name', 'last_name']
          }
        ]
      });

      res.json({
        rubrics,
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
 * GET /api/rubrics/:id
 * Get rubric by ID
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const rubric = await Rubric.findByPk(id, {
      include: [
        {
          model: RubricCriterion,
          as: 'criteria',
          include: [
            { model: RubricLevel, as: 'levels' }
          ]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'first_name', 'last_name']
        }
      ],
      order: [
        [{ model: RubricCriterion, as: 'criteria' }, 'order_index', 'ASC'],
        [{ model: RubricCriterion, as: 'criteria' }, { model: RubricLevel, as: 'levels' }, 'order_index', 'ASC']
      ]
    });

    if (!rubric) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    res.json({ rubric });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/rubrics/:id
 * Update rubric
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('max_score').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['active', 'archived']),
    body('criteria').optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { title, description, max_score, status, criteria } = req.body;

      const rubric = await Rubric.findByPk(id);
      if (!rubric) {
        return res.status(404).json({ error: 'Rubric not found' });
      }

      // Check permissions: only creator or admin can edit
      if (rubric.created_by !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Update rubric basic fields
      if (title !== undefined) rubric.title = title;
      if (description !== undefined) rubric.description = description;
      if (max_score !== undefined) rubric.max_score = max_score;
      if (status !== undefined) rubric.status = status;
      rubric.updated_at = new Date();

      await rubric.save();

      // Update criteria if provided
      if (criteria !== undefined && Array.isArray(criteria)) {
        // Delete existing criteria (cascade will handle levels)
        await RubricCriterion.destroy({ where: { rubric_id: id } });

        // Create new criteria
        for (let i = 0; i < criteria.length; i++) {
          const criterion = criteria[i];
          const criterionId = uuidv4();

          await RubricCriterion.create({
            id: criterionId,
            rubric_id: id,
            criterion_name: criterion.criterion_name,
            description: criterion.description,
            max_score: criterion.max_score,
            order_index: i,
          });

          // Create levels for this criterion if provided
          if (criterion.levels && criterion.levels.length > 0) {
            for (let j = 0; j < criterion.levels.length; j++) {
              const level = criterion.levels[j];
              await RubricLevel.create({
                id: uuidv4(),
                criterion_id: criterionId,
                level_name: level.level_name,
                description: level.description,
                score_value: level.score_value,
                order_index: j,
              });
            }
          }
        }
      }

      // Fetch updated rubric with relations
      const updatedRubric = await Rubric.findByPk(id, {
        include: [
          {
            model: RubricCriterion,
            as: 'criteria',
            include: [
              { model: RubricLevel, as: 'levels' }
            ]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'email', 'first_name', 'last_name']
          }
        ],
        order: [
          [{ model: RubricCriterion, as: 'criteria' }, 'order_index', 'ASC'],
          [{ model: RubricCriterion, as: 'criteria' }, { model: RubricLevel, as: 'levels' }, 'order_index', 'ASC']
        ]
      });

      res.json({
        message: 'Rubric updated successfully',
        rubric: updatedRubric
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/rubrics/:id
 * Archive rubric
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const rubric = await Rubric.findByPk(id);
      if (!rubric) {
        return res.status(404).json({ error: 'Rubric not found' });
      }

      // Check permissions
      if (rubric.created_by !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      rubric.status = 'archived';
      rubric.updated_at = new Date();
      await rubric.save();

      res.json({ message: 'Rubric archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/rubrics/:id/criteria
 * Add criterion to rubric
 */
router.post(
  '/:id/criteria',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('criterion_name').trim().notEmpty().withMessage('Criterion name is required'),
    body('max_score').isFloat({ min: 0 }).withMessage('Max score must be a positive number'),
    body('description').optional().trim(),
    body('order_index').optional().isInt({ min: 0 }),
    body('levels').optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { criterion_name, description, max_score, order_index, levels } = req.body;

      const rubric = await Rubric.findByPk(id);
      if (!rubric) {
        return res.status(404).json({ error: 'Rubric not found' });
      }

      // Check permissions
      if (rubric.created_by !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const criterionId = uuidv4();

      // Create criterion
      await RubricCriterion.create({
        id: criterionId,
        rubric_id: id,
        criterion_name,
        description,
        max_score,
        order_index: order_index !== undefined ? order_index : 0,
      });

      // Create levels if provided
      if (levels && levels.length > 0) {
        for (let i = 0; i < levels.length; i++) {
          const level = levels[i];
          await RubricLevel.create({
            id: uuidv4(),
            criterion_id: criterionId,
            level_name: level.level_name,
            description: level.description,
            score_value: level.score_value,
            order_index: i,
          });
        }
      }

      // Fetch updated rubric
      const updatedRubric = await Rubric.findByPk(id, {
        include: [
          {
            model: RubricCriterion,
            as: 'criteria',
            include: [
              { model: RubricLevel, as: 'levels' }
            ]
          }
        ],
        order: [
          [{ model: RubricCriterion, as: 'criteria' }, 'order_index', 'ASC'],
          [{ model: RubricCriterion, as: 'criteria' }, { model: RubricLevel, as: 'levels' }, 'order_index', 'ASC']
        ]
      });

      res.status(201).json({
        message: 'Criterion added successfully',
        rubric: updatedRubric
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/rubrics/:rubricId/criteria/:criterionId
 * Update criterion
 */
router.put(
  '/:rubricId/criteria/:criterionId',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('criterion_name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('max_score').optional().isFloat({ min: 0 }),
    body('order_index').optional().isInt({ min: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { rubricId, criterionId } = req.params;
      const { criterion_name, description, max_score, order_index } = req.body;

      const rubric = await Rubric.findByPk(rubricId);
      if (!rubric) {
        return res.status(404).json({ error: 'Rubric not found' });
      }

      // Check permissions
      if (rubric.created_by !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const criterion = await RubricCriterion.findByPk(criterionId);
      if (!criterion || criterion.rubric_id !== rubricId) {
        return res.status(404).json({ error: 'Criterion not found' });
      }

      // Update criterion
      if (criterion_name !== undefined) criterion.criterion_name = criterion_name;
      if (description !== undefined) criterion.description = description;
      if (max_score !== undefined) criterion.max_score = max_score;
      if (order_index !== undefined) criterion.order_index = order_index;

      await criterion.save();

      res.json({
        message: 'Criterion updated successfully',
        criterion
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/rubrics/:rubricId/criteria/:criterionId
 * Delete criterion
 */
router.delete(
  '/:rubricId/criteria/:criterionId',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { rubricId, criterionId } = req.params;

      const rubric = await Rubric.findByPk(rubricId);
      if (!rubric) {
        return res.status(404).json({ error: 'Rubric not found' });
      }

      // Check permissions
      if (rubric.created_by !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const criterion = await RubricCriterion.findByPk(criterionId);
      if (!criterion || criterion.rubric_id !== rubricId) {
        return res.status(404).json({ error: 'Criterion not found' });
      }

      await criterion.destroy();

      res.json({ message: 'Criterion deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
