import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Question, QuestionVersion, User } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper function to save question version
 */
const saveQuestionVersion = async (questionId, question, userId) => {
  await QuestionVersion.create({
    id: uuidv4(),
    question_id: questionId,
    version: question.version,
    title: question.title,
    body_html: question.body_html,
    parent_question_id: question.parent_question_id,
    tags: question.tags,
    status: question.status,
    created_by: userId
  });
};

/**
 * POST /api/questions
 * Create new question
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('bodyHtml').notEmpty().withMessage('Question body is required'),
    body('parentQuestionId').optional().isUUID(),
    body('tags').optional().isArray()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, bodyHtml, parentQuestionId, tags = [] } = req.body;
      const questionId = uuidv4();
      const userId = req.user.userId;

      // Validate user exists (for foreign key constraint)
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found. Please log in again.' });
      }

      // If parent question is specified, check it exists
      if (parentQuestionId) {
        const parent = await Question.findByPk(parentQuestionId);
        if (!parent) {
          return res.status(404).json({ error: 'Parent question not found' });
        }
      }

      // Create question
      const question = await Question.create({
        id: questionId,
        title,
        body_html: bodyHtml,
        parent_question_id: parentQuestionId || null,
        tags,
        created_by: userId,
        updated_by: userId
      });

      // Save first version
      await saveQuestionVersion(questionId, question, userId);

      res.status(201).json({
        message: 'Question created successfully',
        question: {
          id: question.id,
          title: question.title,
          body_html: question.body_html,
          parent_question_id: question.parent_question_id,
          tags: question.tags,
          status: question.status,
          version: question.version,
          created_by: question.created_by,
          updated_by: question.updated_by,
          created_at: question.created_at,
          updated_at: question.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/questions/:id
 * Edit question
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('title').optional().trim().notEmpty(),
    body('bodyHtml').optional().notEmpty(),
    body('parentQuestionId').optional().isUUID(),
    body('tags').optional().isArray()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { title, bodyHtml, parentQuestionId, tags } = req.body;
      const userId = req.user.userId;

      // Get current question
      const question = await Question.findByPk(id);
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Check for circular inheritance
      if (parentQuestionId) {
        let currentParent = parentQuestionId;
        while (currentParent) {
          if (currentParent === id) {
            return res.status(400).json({ error: 'Circular inheritance detected' });
          }
          const parent = await Question.findByPk(currentParent, {
            attributes: ['parent_question_id']
          });
          currentParent = parent?.parent_question_id;
        }
      }

      // Check if there's anything to update
      const hasChanges = title !== undefined || bodyHtml !== undefined ||
                         parentQuestionId !== undefined || tags !== undefined;
      if (!hasChanges) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Update fields
      if (title !== undefined) question.title = title;
      if (bodyHtml !== undefined) question.body_html = bodyHtml;
      if (parentQuestionId !== undefined) question.parent_question_id = parentQuestionId || null;
      if (tags !== undefined) question.tags = tags;

      // Increment version
      question.version = question.version + 1;
      question.updated_by = userId;
      question.updated_at = new Date();

      await question.save();

      // Save version
      await saveQuestionVersion(id, question, userId);

      res.json({
        message: 'Question updated successfully',
        question: {
          id: question.id,
          title: question.title,
          body_html: question.body_html,
          parent_question_id: question.parent_question_id,
          tags: question.tags,
          status: question.status,
          version: question.version,
          created_by: question.created_by,
          updated_by: question.updated_by,
          created_at: question.created_at,
          updated_at: question.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/questions
 * Find questions with filters
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
          { body_html: { [Op.like]: `%${search}%` } }
        ];
      }

      if (tags) {
        const tagList = Array.isArray(tags) ? tags : [tags];
        where[Op.and] = tagList.map(tag => ({
          tags: { [Op.like]: `%"${tag}"%` }
        }));
      }

      // Get questions with count
      const { count, rows: questions } = await Question.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }
        ]
      });

      res.json({
        questions: questions.map(q => ({
          id: q.id,
          title: q.title,
          body_html: q.body_html,
          parent_question_id: q.parent_question_id,
          tags: q.tags,
          status: q.status,
          version: q.version,
          created_by: q.created_by,
          updated_by: q.updated_by,
          created_at: q.created_at,
          updated_at: q.updated_at,
          creator: q.creator ? {
            id: q.creator.id,
            email: q.creator.email,
            first_name: q.creator.first_name,
            last_name: q.creator.last_name
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
 * GET /api/questions/:id
 * Get question by ID with inheritance resolution
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolveInheritance = 'true' } = req.query;

    const question = await Question.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] },
        { model: User, as: 'updater', attributes: ['id', 'email', 'first_name', 'last_name'] }
      ]
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    let effectiveBody = question.body_html;
    let inheritanceChain = [];

    // Resolve inheritance if requested
    if (resolveInheritance === 'true' && question.parent_question_id) {
      let currentId = question.parent_question_id;
      while (currentId) {
        const parent = await Question.findByPk(currentId, {
          attributes: ['id', 'title', 'body_html', 'parent_question_id']
        });
        if (parent) {
          inheritanceChain.push({
            id: parent.id,
            title: parent.title
          });
          // Use child's body if exists, otherwise inherit from parent
          if (!question.body_html || question.body_html === parent.body_html) {
            effectiveBody = parent.body_html;
          }
          currentId = parent.parent_question_id;
        } else {
          break;
        }
      }
    }

    res.json({
      question: {
        id: question.id,
        title: question.title,
        body_html: question.body_html,
        parent_question_id: question.parent_question_id,
        tags: question.tags,
        status: question.status,
        version: question.version,
        created_by: question.created_by,
        updated_by: question.updated_by,
        created_at: question.created_at,
        updated_at: question.updated_at,
        effectiveBody: effectiveBody,
        inheritanceChain: inheritanceChain,
        creator: question.creator ? {
          id: question.creator.id,
          email: question.creator.email,
          first_name: question.creator.first_name,
          last_name: question.creator.last_name
        } : null,
        updater: question.updater ? {
          id: question.updater.id,
          email: question.updater.email,
          first_name: question.updater.first_name,
          last_name: question.updater.last_name
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/questions/:id/archive
 * Archive question (soft delete)
 */
router.delete(
  '/:id/archive',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const question = await Question.findByPk(id);
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Update status and version
      question.status = 'archived';
      question.version = question.version + 1;
      question.updated_by = userId;
      question.updated_at = new Date();

      await question.save();

      // Save version
      await saveQuestionVersion(id, question, userId);

      res.json({ message: 'Question archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/questions/:id/versions
 * Get question version history
 */
router.get('/:id/versions', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const question = await Question.findByPk(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const versions = await QuestionVersion.findAll({
      where: { question_id: id },
      order: [['version', 'DESC']],
      include: [
        { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }
      ]
    });

    res.json({
      versions: versions.map(v => ({
        id: v.id,
        question_id: v.question_id,
        version: v.version,
        title: v.title,
        body_html: v.body_html,
        parent_question_id: v.parent_question_id,
        tags: v.tags,
        status: v.status,
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
