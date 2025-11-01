import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Activity, User, UserActivitySubmission, UserActivitySubmissionVersion, UserActivitySubmissionAnswer, Question } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  calculateSubmissionScore,
  autoGradeSubmission,
  getSubmissionScoreSummary,
  manualGradeQuestion,
  updateQuestionScore,
  getSubmissionForGrading
} from '../services/scoringService.js';

const router = express.Router();

/**
 * Helper function to save submission version
 */
const saveSubmissionVersion = async (submissionId, submission, userId) => {
  await UserActivitySubmissionVersion.create({
    id: uuidv4(),
    submission_id: submissionId,
    version: submission.version,
    user_id: submission.user_id,
    activity_id: submission.activity_id,
    status: submission.status,
    submitted_at: submission.submitted_at,
    created_by: userId
  });
};

/**
 * @swagger
 * /api/submissions:
 *   post:
 *     summary: Create a new submission
 *     description: Creates a new user activity submission. Students can only create submissions for themselves. Prevents duplicate in-progress submissions.
 *     tags: [Submissions]
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
 *             properties:
 *               activityId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the activity to create submission for
 *             example:
 *               activityId: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       201:
 *         description: Submission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Submission created successfully"
 *                 submission:
 *                   $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Validation error or activity not active
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       404:
 *         description: User or activity not found
 *       409:
 *         description: User already has an in-progress submission for this activity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 submissionId:
 *                   type: string
 *                   format: uuid
 */
router.post(
  '/',
  authenticate,
  [
    body('activityId').isUUID().withMessage('Valid activity ID required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { activityId } = req.body;
      const submissionId = uuidv4();
      const userId = req.user.userId;

      // Validate user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate activity exists and is active
      const activity = await Activity.findByPk(activityId, {
        attributes: ['id', 'status']
      });
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      if (activity.status !== 'active') {
        return res.status(400).json({ error: 'Activity is not active' });
      }

      // Check if user already has an in-progress submission for this activity
      const existingSubmission = await UserActivitySubmission.findOne({
        where: {
          user_id: userId,
          activity_id: activityId,
          status: 'in-progress'
        },
        attributes: ['id']
      });

      if (existingSubmission) {
        return res.status(409).json({
          error: 'User already has an in-progress submission for this activity',
          submissionId: existingSubmission.id
        });
      }

      // Create submission
      const submission = await UserActivitySubmission.create({
        id: submissionId,
        user_id: userId,
        activity_id: activityId,
        submitted_by: userId,
        updated_by: userId
      });

      // Save first version
      await saveSubmissionVersion(submissionId, submission, userId);

      res.status(201).json({
        message: 'Submission created successfully',
        submission: {
          id: submission.id,
          user_id: submission.user_id,
          activity_id: submission.activity_id,
          status: submission.status,
          version: submission.version,
          submitted_at: submission.submitted_at,
          submitted_by: submission.submitted_by,
          updated_by: submission.updated_by,
          created_at: submission.created_at,
          updated_at: submission.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/submissions/{id}:
 *   put:
 *     summary: Update submission status
 *     description: Updates a submission's status. Users can update their own submissions, admin/teacher can update any. Increments version and saves version history.
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ['in-progress', 'submitted', 'archived']
 *                 description: New status for the submission
 *             example:
 *               status: "submitted"
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 submission:
 *                   $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Submission not found
 */
router.put(
  '/:id',
  authenticate,
  [
    body('status').optional().isIn(['in-progress', 'submitted', 'archived'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.userId;

      // Get current submission
      const submission = await UserActivitySubmission.findByPk(id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Check permissions: users can only edit their own submissions, or admin/teacher can edit any
      if (submission.user_id !== userId && !['admin', 'teacher'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      if (status === undefined) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Update status
      const oldStatus = submission.status;
      submission.status = status;

      // If submitting, set submitted_at timestamp
      if (status === 'submitted' && oldStatus !== 'submitted') {
        submission.submitted_at = new Date();
      }

      // Increment version
      submission.version = submission.version + 1;
      submission.updated_by = userId;
      submission.updated_at = new Date();

      await submission.save();

      // Save version
      await saveSubmissionVersion(id, submission, userId);

      res.json({
        message: 'Submission updated successfully',
        submission: {
          id: submission.id,
          user_id: submission.user_id,
          activity_id: submission.activity_id,
          status: submission.status,
          version: submission.version,
          submitted_at: submission.submitted_at,
          submitted_by: submission.submitted_by,
          updated_by: submission.updated_by,
          created_at: submission.created_at,
          updated_at: submission.updated_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/submissions:
 *   get:
 *     summary: Get submissions list with filters
 *     description: Retrieves submissions with pagination and filtering. Students can only see their own submissions. Includes activity and user details, plus scoring information.
 *     tags: [Submissions]
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
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID (admin/teacher only, students automatically filtered to their own)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ['in-progress', 'submitted', 'graded', 'archived']
 *         description: Filter by submission status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Submissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Submission'
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
    query('userId').optional().isUUID(),
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

      let {
        activityId,
        userId,
        status,
        page = 1,
        limit = 20
      } = req.query;

      // If user is student, they can only see their own submissions
      if (req.user.role === 'student') {
        userId = req.user.userId;
      }

      const offset = (page - 1) * limit;

      // Build where clause
      const where = {};

      if (activityId) {
        where.activity_id = activityId;
      }

      if (userId) {
        where.user_id = userId;
      }

      if (status) {
        where.status = status;
      }

      // Get submissions with count
      const { count, rows: submissions } = await UserActivitySubmission.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          { model: Activity, as: 'activity', attributes: ['id', 'title'] },
          { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] }
        ]
      });

      res.json({
        submissions: submissions.map(s => ({
          id: s.id,
          user_id: s.user_id,
          activity_id: s.activity_id,
          status: s.status,
          version: s.version,
          submitted_at: s.submitted_at,
          submitted_by: s.submitted_by,
          updated_by: s.updated_by,
          created_at: s.created_at,
          updated_at: s.updated_at,
          total_score: s.total_score,
          max_possible_score: s.max_possible_score,
          percentage: s.percentage,
          graded_at: s.graded_at,
          graded_by: s.graded_by,
          activity_title: s.activity ? s.activity.title : null,
          user_email: s.user ? s.user.email : null,
          first_name: s.user ? s.user.first_name : null,
          last_name: s.user ? s.user.last_name : null
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
 * @swagger
 * /api/submissions/{id}:
 *   get:
 *     summary: Get submission by ID with answers
 *     description: Retrieves a specific submission with all its answers. Users can only view their own submissions unless they are admin/teacher.
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submission:
 *                   $ref: '#/components/schemas/Submission'
 *                 answers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubmissionAnswer'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Submission not found
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const submission = await UserActivitySubmission.findByPk(id, {
      include: [
        { model: Activity, as: 'activity', attributes: ['id', 'title'] },
        { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] }
      ]
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check permissions
    if (submission.user_id !== req.user.userId && !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get answers
    const answers = await UserActivitySubmissionAnswer.findAll({
      where: { submission_id: id },
      include: [
        { model: Question, as: 'question', attributes: ['id', 'title'] }
      ]
    });

    res.json({
      submission: {
        id: submission.id,
        user_id: submission.user_id,
        activity_id: submission.activity_id,
        status: submission.status,
        version: submission.version,
        submitted_at: submission.submitted_at,
        submitted_by: submission.submitted_by,
        updated_by: submission.updated_by,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        total_score: submission.total_score,
        max_possible_score: submission.max_possible_score,
        percentage: submission.percentage,
        graded_at: submission.graded_at,
        graded_by: submission.graded_by,
        activity_title: submission.activity ? submission.activity.title : null,
        user_email: submission.user ? submission.user.email : null,
        first_name: submission.user ? submission.user.first_name : null,
        last_name: submission.user ? submission.user.last_name : null
      },
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
        question_title: a.question ? a.question.title : null
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/submissions/{id}/archive:
 *   delete:
 *     summary: Archive a submission
 *     description: Marks a submission as archived (soft delete). Users can archive their own submissions, admin/teacher can archive any.
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Submission archived successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Submission not found
 */
router.delete(
  '/:id/archive',
  authenticate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const submission = await UserActivitySubmission.findByPk(id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Check permissions
      if (submission.user_id !== userId && !['admin', 'teacher'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Update status and version
      submission.status = 'archived';
      submission.version = submission.version + 1;
      submission.updated_by = userId;
      submission.updated_at = new Date();

      await submission.save();

      // Save version
      await saveSubmissionVersion(id, submission, userId);

      res.json({ message: 'Submission archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/submissions/:id/versions
 * Get submission version history
 */
router.get('/:id/versions', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const submission = await UserActivitySubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check permissions
    if (submission.user_id !== req.user.userId && !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const versions = await UserActivitySubmissionVersion.findAll({
      where: { submission_id: id },
      order: [['version', 'DESC']],
      include: [
        { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }
      ]
    });

    res.json({
      versions: versions.map(v => ({
        id: v.id,
        submission_id: v.submission_id,
        version: v.version,
        user_id: v.user_id,
        activity_id: v.activity_id,
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

/**
 * GET /api/submissions/:id/scores
 * Get submission score summary with all question scores
 */
router.get('/:id/scores', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if submission exists and user has permission
    const submission = await UserActivitySubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check permissions
    if (submission.user_id !== req.user.userId && !['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get score summary
    const scoreSummary = await getSubmissionScoreSummary(id);

    res.json(scoreSummary);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/submissions/:id/auto-grade
 * Trigger auto-grading for a submission
 */
router.post(
  '/:id/auto-grade',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Check if submission exists
      const submission = await UserActivitySubmission.findByPk(id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Only auto-grade submitted submissions
      if (submission.status !== 'submitted') {
        return res.status(400).json({
          error: 'Can only auto-grade submitted submissions',
          currentStatus: submission.status
        });
      }

      // Run auto-grading
      const result = await autoGradeSubmission(id, userId);

      res.json({
        message: 'Auto-grading completed',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/submissions/:id/calculate-score
 * Recalculate submission total score from existing question scores
 */
router.post(
  '/:id/calculate-score',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if submission exists
      const submission = await UserActivitySubmission.findByPk(id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Recalculate score
      const scoreData = await calculateSubmissionScore(id);

      res.json({
        message: 'Score recalculated successfully',
        ...scoreData
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/submissions/:id/grading
 * Get submission details for grading interface
 */
router.get(
  '/:id/grading',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const gradingData = await getSubmissionForGrading(id);

      res.json(gradingData);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/submissions/:id/answers/:answerId/grade
 * Manually grade a specific question answer
 */
router.post(
  '/:id/answers/:answerId/grade',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('score').isFloat({ min: 0 }).withMessage('Score must be a positive number'),
    body('maxScore').isFloat({ min: 0 }).withMessage('Max score must be a positive number'),
    body('feedback').optional().isString(),
    body('criteriaScores').optional().isObject(),
    body('rubricId').optional().isUUID()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id, answerId } = req.params;
      const { score, maxScore, feedback, criteriaScores, rubricId } = req.body;
      const userId = req.user.userId;

      // Verify submission exists
      const submission = await UserActivitySubmission.findByPk(id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Verify answer belongs to this submission
      const answer = await UserActivitySubmissionAnswer.findByPk(answerId);
      if (!answer || answer.submission_id !== id) {
        return res.status(404).json({ error: 'Answer not found in this submission' });
      }

      // Grade the question
      const result = await manualGradeQuestion(answerId, {
        score,
        maxScore,
        feedback,
        criteriaScores,
        rubricId
      }, userId);

      res.json({
        message: 'Question graded successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/submissions/:id/answers/:answerId/grade
 * Update an existing question grade
 */
router.put(
  '/:id/answers/:answerId/grade',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('score').optional().isFloat({ min: 0 }),
    body('maxScore').optional().isFloat({ min: 0 }),
    body('feedback').optional().isString(),
    body('criteriaScores').optional().isObject()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id, answerId } = req.params;
      const { score, maxScore, feedback, criteriaScores } = req.body;
      const userId = req.user.userId;

      // Verify submission exists
      const submission = await UserActivitySubmission.findByPk(id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Verify answer belongs to this submission
      const answer = await UserActivitySubmissionAnswer.findByPk(answerId);
      if (!answer || answer.submission_id !== id) {
        return res.status(404).json({ error: 'Answer not found in this submission' });
      }

      // Find existing score for this answer
      const { QuestionScore } = await import('../models/index.js');
      const existingScore = await QuestionScore.findOne({
        where: {
          answer_id: answerId,
          is_current: true
        }
      });

      if (!existingScore) {
        return res.status(404).json({ error: 'No existing grade found for this answer' });
      }

      // Update the score
      const result = await updateQuestionScore(existingScore.id, {
        score,
        maxScore,
        feedback,
        criteriaScores
      }, userId);

      res.json({
        message: 'Grade updated successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/submissions/:id/grade-all
 * Save grades for all questions in a submission at once
 */
router.post(
  '/:id/grade-all',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('grades').isArray().withMessage('Grades must be an array'),
    body('grades.*.answerId').isUUID(),
    body('grades.*.score').isFloat({ min: 0 }),
    body('grades.*.maxScore').isFloat({ min: 0 }),
    body('grades.*.feedback').optional().isString(),
    body('grades.*.criteriaScores').custom((value) => {
      if (value === null || value === undefined) return true;
      if (typeof value === 'object' && !Array.isArray(value)) return true;
      throw new Error('criteriaScores must be an object or null');
    }),
    body('grades.*.rubricId').custom((value) => {
      if (value === null || value === undefined) return true;
      // UUID v4 regex
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return true;
      throw new Error('rubricId must be a valid UUID or null');
    })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { grades } = req.body;
      const userId = req.user.userId;

      // Verify submission exists
      const submission = await UserActivitySubmission.findByPk(id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const results = [];
      const errors_list = [];

      // Grade each question
      for (const gradeData of grades) {
        try {
          const { answerId, score, maxScore, feedback, criteriaScores, rubricId } = gradeData;

          // Verify answer belongs to this submission
          const answer = await UserActivitySubmissionAnswer.findByPk(answerId);
          if (!answer || answer.submission_id !== id) {
            errors_list.push({
              answerId,
              error: 'Answer not found in this submission'
            });
            continue;
          }

          const result = await manualGradeQuestion(answerId, {
            score,
            maxScore,
            feedback,
            criteriaScores,
            rubricId
          }, userId);

          results.push({
            answerId,
            success: true,
            score: result.score
          });
        } catch (error) {
          errors_list.push({
            answerId: gradeData.answerId,
            error: error.message
          });
        }
      }

      res.json({
        message: 'Grading completed',
        gradedCount: results.length,
        errorCount: errors_list.length,
        results,
        errors: errors_list
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/submissions/:id/status
 * Manually change submission status (teacher only)
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('status').isIn(['in-progress', 'submitted', 'graded', 'archived']).withMessage('Invalid status')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.userId;

      const submission = await UserActivitySubmission.findByPk(id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const oldStatus = submission.status;

      // Update status
      await submission.update({
        status,
        graded_at: status === 'graded' ? (submission.graded_at || new Date()) : null,
        graded_by: status === 'graded' ? (submission.graded_by || userId) : null
      });

      res.json({
        message: `Submission status changed from ${oldStatus} to ${status}`,
        submission: {
          id: submission.id,
          status: submission.status,
          graded_at: submission.graded_at,
          graded_by: submission.graded_by
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
