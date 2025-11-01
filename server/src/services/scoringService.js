/**
 * Scoring Service
 *
 * Handles calculation and updating of submission scores,
 * including auto-grading and aggregating question scores.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  UserActivitySubmission,
  UserActivitySubmissionAnswer,
  QuestionScore,
  QuestionScoring,
  Question,
  Rubric,
  RubricCriterion,
  RubricLevel,
  ActivityElement,
  Activity,
  User
} from '../models/index.js';
import { gradeResponse } from '../utils/autoGrader.js';

/**
 * Calculate total score for a submission based on all question scores
 */
export const calculateSubmissionScore = async (submissionId) => {
  try {
    // Get all question scores for this UserActivitySubmission
    const questionScores = await QuestionScore.findAll({
      where: {
        user_submission_id: submissionId,
        is_current: true
      }
    });

    let totalScore = 0;
    let maxPossibleScore = 0;
    let gradedCount = 0;
    let pendingCount = 0;

    questionScores.forEach(qs => {
      totalScore += parseFloat(qs.score) || 0;
      maxPossibleScore += parseFloat(qs.max_score) || 0;
      gradedCount++;
    });

    // Get total questions in the activity
    const submission = await UserActivitySubmission.findByPk(submissionId);
    const allAnswers = await UserActivitySubmissionAnswer.findAll({
      where: { submission_id: submissionId }
    });

    const totalQuestions = allAnswers.length;
    pendingCount = totalQuestions - gradedCount;

    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    // Determine status:
    // - 'graded' if all ANSWERED questions have been graded
    // - 'submitted' otherwise
    const shouldMarkAsGraded = totalQuestions > 0 && pendingCount === 0;

    // Update submission with calculated scores
    await submission.update({
      total_score: totalScore,
      max_possible_score: maxPossibleScore,
      percentage: percentage,
      status: shouldMarkAsGraded ? 'graded' : submission.status, // Keep current status unless fully graded
      graded_at: shouldMarkAsGraded ? new Date() : submission.graded_at,
      graded_by: shouldMarkAsGraded && !submission.graded_by ? 'system' : submission.graded_by
    });

    return {
      totalScore,
      maxPossibleScore,
      percentage,
      gradedCount,
      pendingCount,
      totalQuestions
    };
  } catch (error) {
    console.error('Error calculating submission score:', error);
    throw error;
  }
};

/**
 * Auto-grade a question answer (UserActivitySubmissionAnswer)
 */
export const autoGradeQuestion = async (answerId, userId) => {
  try {
    // Get the answer with question scoring config
    const answer = await UserActivitySubmissionAnswer.findByPk(answerId, {
      include: [
        {
          model: Question,
          as: 'question',
          include: [
            {
              model: QuestionScoring,
              as: 'scoring'
            }
          ]
        }
      ]
    });

    if (!answer) {
      throw new Error('Question answer not found');
    }

    const scoringConfig = answer.question?.scoring;

    // If no scoring config or not auto-gradeable, mark as pending manual grading
    if (!scoringConfig || scoringConfig.scoring_type === 'manual') {
      return {
        success: false,
        message: 'Question requires manual grading',
        requiresManualGrading: true
      };
    }

    // If scoring type is auto or hybrid, attempt auto-grading
    const answerData = typeof answer.answer_data === 'string'
      ? JSON.parse(answer.answer_data)
      : answer.answer_data;

    const gradingResult = gradeResponse(answerData, {
      expectedAnswers: scoringConfig.expected_answers,
      autoGradeConfig: scoringConfig.auto_grade_config,
      fieldScores: scoringConfig.field_points || {}
    });

    if (!gradingResult.success) {
      return {
        success: false,
        message: gradingResult.error || 'Auto-grading failed',
        requiresManualGrading: true
      };
    }

    // Create or update question score
    const existingScore = await QuestionScore.findOne({
      where: {
        answer_id: answerId,
        is_current: true
      }
    });

    if (existingScore) {
      // Mark existing as not current
      await existingScore.update({ is_current: false });
    }

    // Create new score record
    const questionScore = await QuestionScore.create({
      id: uuidv4(),
      answer_id: answerId,
      user_submission_id: answer.submission_id,
      question_id: answer.question_id,
      score: gradingResult.score,
      max_score: gradingResult.maxScore,
      rubric_id: scoringConfig.rubric_id,
      criteria_scores: gradingResult.fieldResults || null,
      feedback: gradingResult.feedback,
      graded_by: userId || 'auto-grader',
      graded_at: new Date(),
      version: (existingScore?.version || 0) + 1,
      is_current: true
    });

    // Recalculate submission score
    await calculateSubmissionScore(answer.submission_id);

    return {
      success: true,
      score: questionScore,
      gradingResult
    };
  } catch (error) {
    console.error('Error auto-grading question:', error);
    throw error;
  }
};

/**
 * Auto-grade all questions in a submission
 */
export const autoGradeSubmission = async (submissionId, userId) => {
  try {
    const answers = await UserActivitySubmissionAnswer.findAll({
      where: { submission_id: submissionId }
    });

    const results = [];
    let autoGradedCount = 0;
    let manualGradingRequired = 0;

    for (const answer of answers) {
      const result = await autoGradeQuestion(answer.id, userId);
      results.push({
        answerId: answer.id,
        questionId: answer.question_id,
        ...result
      });

      if (result.success) {
        autoGradedCount++;
      } else if (result.requiresManualGrading) {
        manualGradingRequired++;
      }
    }

    // Calculate final submission score
    const finalScore = await calculateSubmissionScore(submissionId);

    return {
      success: true,
      autoGradedCount,
      manualGradingRequired,
      totalQuestions: answers.length,
      results,
      finalScore
    };
  } catch (error) {
    console.error('Error auto-grading submission:', error);
    throw error;
  }
};

/**
 * Get submission score summary
 * Works with UserActivitySubmission IDs
 */
export const getSubmissionScoreSummary = async (submissionId) => {
  try {
    const submission = await UserActivitySubmission.findByPk(submissionId, {
      include: [
        {
          model: Activity,
          as: 'activity',
          attributes: ['id', 'title']
        }
      ]
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Get all answers
    const allAnswers = await UserActivitySubmissionAnswer.findAll({
      where: { submission_id: submissionId },
      include: [
        {
          model: Question,
          as: 'question',
          attributes: ['id', 'title']
        }
      ]
    });

    // Get all question scores
    const questionScores = await QuestionScore.findAll({
      where: {
        user_submission_id: submissionId,
        is_current: true
      },
      include: [
        {
          model: Question,
          as: 'question',
          attributes: ['id', 'title']
        },
        {
          model: Rubric,
          as: 'rubric',
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
            }
          ]
        }
      ]
    });

    // Map answer IDs that have been graded
    const gradedAnswerIds = new Set(questionScores.map(qs => qs.answer_id));

    // Format question scores for display
    const formattedQuestionScores = questionScores.map(qs => {
      const percentage = qs.max_score > 0 ? (qs.score / qs.max_score) * 100 : 0;

      return {
        id: qs.id,
        question: qs.question,
        score: qs.score,
        maxScore: qs.max_score,
        percentage,
        feedback: qs.feedback,
        criteriaScores: qs.criteria_scores,
        rubric: qs.rubric,
        gradedAt: qs.graded_at
      };
    });

    // Identify pending questions (not yet graded)
    const pendingQuestions = allAnswers
      .filter(answer => !gradedAnswerIds.has(answer.id))
      .map(answer => ({
        id: answer.id,
        question: answer.question,
        status: 'pending'
      }));

    return {
      submission: {
        id: submission.id,
        status: submission.status,
        total_score: submission.total_score || 0,
        max_possible_score: submission.max_possible_score || 0,
        percentage: submission.percentage || 0,
        submitted_at: submission.submitted_at,
        graded_at: submission.graded_at,
        activity: submission.activity
      },
      scores: {
        total: submission.total_score || 0,
        maxPossible: submission.max_possible_score || 0,
        percentage: submission.percentage || 0,
        gradedCount: questionScores.length,
        pendingCount: pendingQuestions.length,
        totalQuestions: allAnswers.length
      },
      questionScores: formattedQuestionScores,
      pendingQuestions
    };
  } catch (error) {
    console.error('Error getting submission score summary:', error);
    throw error;
  }
};

/**
 * Get activity report with all student submissions
 * Works with UserActivitySubmission
 */
export const getActivityReport = async (activityId, options = {}) => {
  try {
    const {
      status = null,
      page = 1,
      limit = 100
    } = options;

    const where = { activity_id: activityId };
    if (status) {
      where.status = status;
    }

    // Get all submissions for this activity
    const { count, rows: submissions } = await UserActivitySubmission.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Format results
    const results = submissions.map(submission => {
      return {
        submission: {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submitted_at,
          gradedAt: submission.graded_at
        },
        user: submission.user,
        scores: {
          total: submission.total_score || 0,
          maxPossible: submission.max_possible_score || 0,
          percentage: submission.percentage || 0,
          gradedCount: 0,
          pendingCount: 0
        }
      };
    });

    // Calculate class statistics
    const completedSubmissions = submissions.filter(s => s.percentage !== null);
    const avgScore = completedSubmissions.length > 0
      ? completedSubmissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / completedSubmissions.length
      : null;

    return {
      activity: await Activity.findByPk(activityId, {
        attributes: ['id', 'title', 'description']
      }),
      submissions: results,
      statistics: {
        totalSubmissions: count,
        gradedSubmissions: completedSubmissions.length,
        averageScore: avgScore,
        highestScore: completedSubmissions.length > 0
          ? Math.max(...completedSubmissions.map(s => s.percentage || 0))
          : null,
        lowestScore: completedSubmissions.length > 0
          ? Math.min(...completedSubmissions.map(s => s.percentage || 0))
          : null
      },
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting activity report:', error);
    throw error;
  }
};

/**
 * Manually grade a question answer
 */
export const manualGradeQuestion = async (answerId, gradeData, userId) => {
  try {
    const { score, maxScore, feedback, criteriaScores, rubricId } = gradeData;

    // Get the answer
    const answer = await UserActivitySubmissionAnswer.findByPk(answerId);
    if (!answer) {
      throw new Error('Answer not found');
    }

    // Validate score
    if (score < 0 || score > maxScore) {
      throw new Error('Score must be between 0 and maxScore');
    }

    // Check if there's an existing score
    const existingScore = await QuestionScore.findOne({
      where: {
        answer_id: answerId,
        is_current: true
      }
    });

    if (existingScore) {
      // Mark existing as not current
      await existingScore.update({ is_current: false });
    }

    // Create new score record
    const questionScore = await QuestionScore.create({
      id: uuidv4(),
      answer_id: answerId,
      user_submission_id: answer.submission_id,
      question_id: answer.question_id,
      score: parseFloat(score),
      max_score: parseFloat(maxScore),
      rubric_id: rubricId || null,
      criteria_scores: criteriaScores || null,
      feedback: feedback || null,
      graded_by: userId,
      graded_at: new Date(),
      version: (existingScore?.version || 0) + 1,
      is_current: true
    });

    // Recalculate submission score
    await calculateSubmissionScore(answer.submission_id);

    return {
      success: true,
      score: questionScore
    };
  } catch (error) {
    console.error('Error manually grading question:', error);
    throw error;
  }
};

/**
 * Update an existing question score
 */
export const updateQuestionScore = async (scoreId, updateData, userId) => {
  try {
    const { score, maxScore, feedback, criteriaScores } = updateData;

    // Get the existing score
    const existingScore = await QuestionScore.findByPk(scoreId);
    if (!existingScore) {
      throw new Error('Question score not found');
    }

    // Validate score if provided
    if (score !== undefined && (score < 0 || score > (maxScore || existingScore.max_score))) {
      throw new Error('Score must be between 0 and maxScore');
    }

    // Mark existing as not current
    await existingScore.update({ is_current: false });

    // Create new version with updates
    const updatedScore = await QuestionScore.create({
      id: uuidv4(),
      answer_id: existingScore.answer_id,
      user_submission_id: existingScore.user_submission_id,
      question_id: existingScore.question_id,
      score: score !== undefined ? parseFloat(score) : existingScore.score,
      max_score: maxScore !== undefined ? parseFloat(maxScore) : existingScore.max_score,
      rubric_id: existingScore.rubric_id,
      criteria_scores: criteriaScores !== undefined ? criteriaScores : existingScore.criteria_scores,
      feedback: feedback !== undefined ? feedback : existingScore.feedback,
      graded_by: userId,
      graded_at: new Date(),
      version: existingScore.version + 1,
      is_current: true
    });

    // Recalculate submission score
    await calculateSubmissionScore(existingScore.user_submission_id);

    return {
      success: true,
      score: updatedScore
    };
  } catch (error) {
    console.error('Error updating question score:', error);
    throw error;
  }
};

/**
 * Get submission details for grading interface
 */
export const getSubmissionForGrading = async (submissionId) => {
  try {
    const submission = await UserActivitySubmission.findByPk(submissionId, {
      include: [
        {
          model: Activity,
          as: 'activity',
          attributes: ['id', 'title', 'description']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name']
        }
      ]
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Get all questions from the activity
    const activityElements = await ActivityElement.findAll({
      where: {
        activity_id: submission.activity_id,
        element_type: 'question',
        status: 'active'
      },
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
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      order: [['order_index', 'ASC']]
    });

    // Get all answers (might be incomplete)
    const answers = await UserActivitySubmissionAnswer.findAll({
      where: { submission_id: submissionId }
    });

    // Get existing scores
    const questionScores = await QuestionScore.findAll({
      where: {
        user_submission_id: submissionId,
        is_current: true
      }
    });

    // Map answers by question_id
    const answersByQuestionId = {};
    answers.forEach(answer => {
      answersByQuestionId[answer.question_id] = answer;
    });

    // Map scores by answer_id
    const scoresByAnswerId = {};
    questionScores.forEach(qs => {
      scoresByAnswerId[qs.answer_id] = qs;
    });

    // Format ALL questions from activity (whether answered or not)
    const questions = activityElements.map(element => {
      const answer = answersByQuestionId[element.question_id];
      const score = answer ? scoresByAnswerId[answer.id] : null;

      return {
        answerId: answer?.id || null,
        questionId: element.question_id,
        elementUuid: element.id,
        question: element.question,
        response: answer?.answer_data || null,
        isAnswered: !!answer,
        score: score ? {
          id: score.id,
          score: score.score,
          maxScore: score.max_score,
          feedback: score.feedback,
          criteriaScores: score.criteria_scores,
          gradedBy: score.graded_by,
          gradedAt: score.graded_at,
          isAutoGraded: score.graded_by === 'auto-grader'
        } : null
      };
    });

    return {
      submission: {
        id: submission.id,
        status: submission.status,
        totalScore: submission.total_score,
        maxPossibleScore: submission.max_possible_score,
        percentage: submission.percentage,
        submittedAt: submission.submitted_at,
        gradedAt: submission.graded_at,
        activity: submission.activity,
        user: submission.user
      },
      questions
    };
  } catch (error) {
    console.error('Error getting submission for grading:', error);
    throw error;
  }
};

export default {
  calculateSubmissionScore,
  autoGradeQuestion,
  autoGradeSubmission,
  getSubmissionScoreSummary,
  getActivityReport,
  manualGradeQuestion,
  updateQuestionScore,
  getSubmissionForGrading
};
