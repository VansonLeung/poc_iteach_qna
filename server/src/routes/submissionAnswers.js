import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Question, UserActivitySubmission, UserActivitySubmissionAnswer, UserActivitySubmissionAnswerVersion, User } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper function to save answer version
 */
const saveAnswerVersion = async (answerId, answer, userId) => {
  await UserActivitySubmissionAnswerVersion.create({
    id: uuidv4(),
    answer_id: answerId,
    version: answer.version,
    submission_id: answer.submission_id,
    question_id: answer.question_id,
    element_uuid: answer.element_uuid,
    answer_data: answer.answer_data,
    status: answer.status,
    submitted_at: answer.submitted_at,
    created_by: userId
  });
};

/**
 * Helper to check submission ownership
 */
const checkSubmissionAccess = async (submissionId, userId, role) => {
  const submission = await UserActivitySubmission.findByPk(submissionId, {
    attributes: ['user_id']
  });
  if (!submission) {
    return { allowed: false, error: 'Submission not found' };
  }
  if (submission.user_id !== userId && !['admin', 'teacher'].includes(role)) {
    return { allowed: false, error: 'Insufficient permissions' };
  }
  return { allowed: true, submission };
};

/**
 * POST /api/submission-answers
 * Create new submission answer
 */
router.post(
  '/',
  authenticate,
  [
    body('submissionId').isUUID().withMessage('Valid submission ID required'),
    body('questionId').isUUID().withMessage('Valid question ID required'),
    body('elementUuid').isUUID().withMessage('Valid element UUID required'),
    body('answerData').notEmpty().withMessage('Answer data is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { submissionId, questionId, elementUuid, answerData } = req.body;
      const answerId = uuidv4();
      const userId = req.user.userId;

      // Check submission access
      const accessCheck = await checkSubmissionAccess(submissionId, userId, req.user.role);
      if (!accessCheck.allowed) {
        return res.status(accessCheck.error === 'Submission not found' ? 404 : 403).json({ error: accessCheck.error });
      }

      // Validate question exists
      const question = await Question.findByPk(questionId);
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Note: We no longer validate element UUID against a separate table
      // since we follow HTML-first approach where elements are parsed from question body at runtime

      // Check if answer already exists for this combination
      const existingAnswer = await UserActivitySubmissionAnswer.findOne({
        where: {
          submission_id: submissionId,
          question_id: questionId,
          element_uuid: elementUuid
        },
        attributes: ['id']
      });

      if (existingAnswer) {
        return res.status(409).json({
          error: 'Answer already exists for this element',
          answerId: existingAnswer.id
        });
      }

      // Create answer
      const answer = await UserActivitySubmissionAnswer.create({
        id: answerId,
        submission_id: submissionId,
        question_id: questionId,
        element_uuid: elementUuid,
        answer_data: answerData,
        submitted_by: userId,
        updated_by: userId
      });

      // Save first version
      await saveAnswerVersion(answerId, answer, userId);

      res.status(201).json({
        message: 'Answer created successfully',
        answer: {
          id: answer.id,
          submission_id: answer.submission_id,
          question_id: answer.question_id,
          element_uuid: answer.element_uuid,
          answer_data: answer.answer_data,
          status: answer.status,
          version: answer.version,
          submitted_at: answer.submitted_at,
          submitted_by: answer.submitted_by,
          updated_by: answer.updated_by,
          created_at: answer.created_at,
          updated_at: answer.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/submission-answers/:id
 * Edit submission answer
 */
router.put(
  '/:id',
  authenticate,
  [
    body('answerData').optional().notEmpty(),
    body('status').optional().isIn(['in-progress', 'submitted', 'archived'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { answerData, status } = req.body;
      const userId = req.user.userId;

      // Get current answer
      const answer = await UserActivitySubmissionAnswer.findByPk(id);
      if (!answer) {
        return res.status(404).json({ error: 'Answer not found' });
      }

      // Check submission access
      const accessCheck = await checkSubmissionAccess(answer.submission_id, userId, req.user.role);
      if (!accessCheck.allowed) {
        return res.status(403).json({ error: accessCheck.error });
      }

      // Check if there's anything to update
      const hasChanges = answerData !== undefined || status !== undefined;
      if (!hasChanges) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Update fields
      const oldStatus = answer.status;
      if (answerData !== undefined) answer.answer_data = answerData;
      if (status !== undefined) answer.status = status;

      // If submitting, set submitted_at timestamp
      if (status === 'submitted' && oldStatus !== 'submitted') {
        answer.submitted_at = new Date();
      }

      // Increment version
      answer.version = answer.version + 1;
      answer.updated_by = userId;
      answer.updated_at = new Date();

      await answer.save();

      // Save version
      await saveAnswerVersion(id, answer, userId);

      res.json({
        message: 'Answer updated successfully',
        answer: {
          id: answer.id,
          submission_id: answer.submission_id,
          question_id: answer.question_id,
          element_uuid: answer.element_uuid,
          answer_data: answer.answer_data,
          status: answer.status,
          version: answer.version,
          submitted_at: answer.submitted_at,
          submitted_by: answer.submitted_by,
          updated_by: answer.updated_by,
          created_at: answer.created_at,
          updated_at: answer.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/submission-answers
 * Find submission answers with filters
 */
router.get(
  '/',
  authenticate,
  [
    query('submissionId').optional().isUUID(),
    query('questionId').optional().isUUID(),
    query('status').optional().isIn(['in-progress', 'submitted', 'archived']),
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
        submissionId,
        questionId,
        status,
        page = 1,
        limit = 50
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause
      const where = {};

      if (submissionId) {
        where.submission_id = submissionId;
      }

      if (questionId) {
        where.question_id = questionId;
      }

      if (status) {
        where.status = status;
      }

      // Build include with conditional where for student role
      const include = [
        { model: Question, as: 'question', attributes: ['id', 'title'] },
        {
          model: UserActivitySubmission,
          as: 'submission',
          attributes: ['id', 'user_id'],
          where: req.user.role === 'student' ? { user_id: req.user.userId } : undefined
        }
      ];

      // Get answers with count
      const { count, rows: answers } = await UserActivitySubmissionAnswer.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include
      });

      res.json({
        answers: answers.map(a => ({
          id: a.id,
          submission_id: a.submission_id,
          question_id: a.question_id,
          element_uuid: a.element_uuid,
          answer_data: a.answer_data,
          status: a.status,
          version: a.version,
          submitted_at: a.submitted_at,
          submitted_by: a.submitted_by,
          updated_by: a.updated_by,
          created_at: a.created_at,
          updated_at: a.updated_at,
          question_title: a.question ? a.question.title : null,
          submission_user_id: a.submission ? a.submission.user_id : null
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
 * GET /api/submission-answers/:id
 * Get submission answer by ID
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const answer = await UserActivitySubmissionAnswer.findByPk(id, {
      include: [
        { model: Question, as: 'question', attributes: ['id', 'title', 'body_html'] },
        { model: UserActivitySubmission, as: 'submission', attributes: ['id', 'user_id'] }
      ]
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // Check permissions
    const submissionUserId = answer.submission ? answer.submission.user_id : null;
    if (submissionUserId !== req.user.userId && !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json({
      answer: {
        id: answer.id,
        submission_id: answer.submission_id,
        question_id: answer.question_id,
        element_uuid: answer.element_uuid,
        answer_data: answer.answer_data,
        status: answer.status,
        version: answer.version,
        submitted_at: answer.submitted_at,
        submitted_by: answer.submitted_by,
        updated_by: answer.updated_by,
        created_at: answer.created_at,
        updated_at: answer.updated_at,
        question_title: answer.question ? answer.question.title : null,
        body_html: answer.question ? answer.question.body_html : null,
        submission_user_id: submissionUserId
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/submission-answers/:id/archive
 * Archive submission answer
 */
router.delete(
  '/:id/archive',
  authenticate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const answer = await UserActivitySubmissionAnswer.findByPk(id, {
        include: [
          { model: UserActivitySubmission, as: 'submission', attributes: ['id', 'user_id'] }
        ]
      });

      if (!answer) {
        return res.status(404).json({ error: 'Answer not found' });
      }

      // Check permissions
      const submissionUserId = answer.submission ? answer.submission.user_id : null;
      if (submissionUserId !== userId && !['admin', 'teacher'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Update status and version
      answer.status = 'archived';
      answer.version = answer.version + 1;
      answer.updated_by = userId;
      answer.updated_at = new Date();

      await answer.save();

      // Save version
      await saveAnswerVersion(id, answer, userId);

      res.json({ message: 'Answer archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/submission-answers/:id/versions
 * Get answer version history
 */
router.get('/:id/versions', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const answer = await UserActivitySubmissionAnswer.findByPk(id, {
      include: [
        { model: UserActivitySubmission, as: 'submission', attributes: ['id', 'user_id'] }
      ]
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // Check permissions
    const submissionUserId = answer.submission ? answer.submission.user_id : null;
    if (submissionUserId !== req.user.userId && !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const versions = await UserActivitySubmissionAnswerVersion.findAll({
      where: { answer_id: id },
      order: [['version', 'DESC']],
      include: [
        { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }
      ]
    });

    res.json({
      versions: versions.map(v => ({
        id: v.id,
        answer_id: v.answer_id,
        version: v.version,
        submission_id: v.submission_id,
        question_id: v.question_id,
        element_uuid: v.element_uuid,
        answer_data: v.answer_data,
        status: v.status,
        submitted_at: v.submitted_at,
        created_by: v.created_by,
        created_at: v.created_at,
        created_by_email: v.creator ? v.creator.email : null,
        first_name: v.creator ? v.creator.first_name : null,
        last_name: v.creator ? v.creator.last_name : null
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
