import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { QuestionScoring, Question, Rubric } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/question-scoring
 * Create or update question scoring configuration
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('questionId').isUUID().withMessage('Valid question ID required'),
    body('rubricId').optional().isUUID(),
    body('scoringType').isIn(['auto', 'manual', 'hybrid']).withMessage('Invalid scoring type'),
    body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
    body('maxScore').optional().isFloat({ min: 0 }).withMessage('Max score must be a positive number'),
    body('expectedAnswers').optional(),
    body('autoGradeConfig').optional(),
    body('fieldScores').optional().isObject().withMessage('Field scores must be an object'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { questionId, rubricId, scoringType, weight, maxScore, expectedAnswers, autoGradeConfig, fieldScores } = req.body;

      // Validate question exists
      const question = await Question.findByPk(questionId);
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Validate rubric if provided
      if (rubricId) {
        const rubric = await Rubric.findByPk(rubricId);
        if (!rubric) {
          return res.status(404).json({ error: 'Rubric not found' });
        }
      }

      // Check if scoring config already exists
      let scoring = await QuestionScoring.findOne({ where: { question_id: questionId } });

      if (scoring) {
        // Update existing
        scoring.rubric_id = rubricId || scoring.rubric_id;
        scoring.scoring_type = scoringType;
        if (weight !== undefined) scoring.weight = weight;
        if (maxScore !== undefined) scoring.max_score = maxScore;
        if (expectedAnswers !== undefined) scoring.expected_answers = expectedAnswers;
        if (autoGradeConfig !== undefined) scoring.auto_grade_config = autoGradeConfig;
        if (fieldScores !== undefined) scoring.field_scores = fieldScores;
        scoring.updated_at = new Date();
        await scoring.save();
      } else {
        // Create new
        scoring = await QuestionScoring.create({
          id: uuidv4(),
          question_id: questionId,
          rubric_id: rubricId,
          scoring_type: scoringType,
          weight: weight !== undefined ? weight : 1.0,
          max_score: maxScore,
          expected_answers: expectedAnswers,
          auto_grade_config: autoGradeConfig,
          field_scores: fieldScores,
        });
      }

      // Fetch with relations
      const result = await QuestionScoring.findByPk(scoring.id, {
        include: [
          {
            model: Question,
            as: 'question',
            attributes: ['id', 'title']
          },
          {
            model: Rubric,
            as: 'rubric',
            attributes: ['id', 'title', 'rubric_type']
          }
        ]
      });

      res.status(scoring ? 200 : 201).json({
        message: scoring ? 'Scoring configuration updated' : 'Scoring configuration created',
        scoring: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/question-scoring/:questionId
 * Get scoring configuration for a question
 */
router.get('/:questionId', authenticate, async (req, res, next) => {
  try {
    const { questionId } = req.params;

    const scoring = await QuestionScoring.findOne({
      where: { question_id: questionId },
      include: [
        {
          model: Question,
          as: 'question',
          attributes: ['id', 'title', 'body_html']
        },
        {
          model: Rubric,
          as: 'rubric'
        }
      ]
    });

    if (!scoring) {
      return res.status(404).json({ error: 'Scoring configuration not found' });
    }

    res.json({ scoring });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/question-scoring/:questionId
 * Update scoring configuration
 */
router.put(
  '/:questionId',
  authenticate,
  authorize('admin', 'teacher'),
  [
    body('rubricId').optional().isUUID(),
    body('scoringType').optional().isIn(['auto', 'manual', 'hybrid']),
    body('weight').optional().isFloat({ min: 0 }),
    body('maxScore').optional().isFloat({ min: 0 }),
    body('expectedAnswers').optional(),
    body('autoGradeConfig').optional(),
    body('fieldScores').optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { questionId } = req.params;
      const { rubricId, scoringType, weight, maxScore, expectedAnswers, autoGradeConfig, fieldScores } = req.body;

      const scoring = await QuestionScoring.findOne({ where: { question_id: questionId } });
      if (!scoring) {
        return res.status(404).json({ error: 'Scoring configuration not found' });
      }

      // Update fields
      if (rubricId !== undefined) scoring.rubric_id = rubricId;
      if (scoringType !== undefined) scoring.scoring_type = scoringType;
      if (weight !== undefined) scoring.weight = weight;
      if (maxScore !== undefined) scoring.max_score = maxScore;
      if (expectedAnswers !== undefined) scoring.expected_answers = expectedAnswers;
      if (autoGradeConfig !== undefined) scoring.auto_grade_config = autoGradeConfig;
      if (fieldScores !== undefined) scoring.field_scores = fieldScores;
      scoring.updated_at = new Date();

      await scoring.save();

      // Fetch with relations
      const result = await QuestionScoring.findByPk(scoring.id, {
        include: [
          {
            model: Question,
            as: 'question',
            attributes: ['id', 'title']
          },
          {
            model: Rubric,
            as: 'rubric'
          }
        ]
      });

      res.json({
        message: 'Scoring configuration updated',
        scoring: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/question-scoring/:questionId
 * Delete scoring configuration
 */
router.delete(
  '/:questionId',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { questionId } = req.params;

      const scoring = await QuestionScoring.findOne({ where: { question_id: questionId } });
      if (!scoring) {
        return res.status(404).json({ error: 'Scoring configuration not found' });
      }

      await scoring.destroy();

      res.json({ message: 'Scoring configuration deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
