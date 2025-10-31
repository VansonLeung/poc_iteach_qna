import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { Activity, User, UserActivitySubmission, UserActivitySubmissionVersion, UserActivitySubmissionAnswer, Question } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

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
 * POST /api/submissions
 * Create new user activity submission
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
 * PUT /api/submissions/:id
 * Edit user activity submission (primarily for status updates)
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
 * GET /api/submissions
 * Find user activity submissions with filters
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
 * GET /api/submissions/:id
 * Get submission by ID with answers
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
 * DELETE /api/submissions/:id/archive
 * Archive submission
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

export default router;
