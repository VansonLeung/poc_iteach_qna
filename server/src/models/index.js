import sequelize from '../config/database.js';
import User from './User.js';
import Activity from './Activity.js';
import ActivityVersion from './ActivityVersion.js';
import Question from './Question.js';
import QuestionVersion from './QuestionVersion.js';
import ActivityElement from './ActivityElement.js';
import ActivityElementVersion from './ActivityElementVersion.js';
import UserActivitySubmission from './UserActivitySubmission.js';
import UserActivitySubmissionVersion from './UserActivitySubmissionVersion.js';
import UserActivitySubmissionAnswer from './UserActivitySubmissionAnswer.js';
import UserActivitySubmissionAnswerVersion from './UserActivitySubmissionAnswerVersion.js';
import Rubric from './Rubric.js';
import RubricCriterion from './RubricCriterion.js';
import RubricLevel from './RubricLevel.js';
import QuestionScoring from './QuestionScoring.js';
import ActivitySubmission from './ActivitySubmission.js';
import QuestionResponse from './QuestionResponse.js';
import QuestionScore from './QuestionScore.js';
import SectionWeight from './SectionWeight.js';

// Define associations

// User associations
User.hasMany(Activity, { foreignKey: 'created_by', as: 'createdActivities' });
User.hasMany(Activity, { foreignKey: 'updated_by', as: 'updatedActivities' });
User.hasMany(Question, { foreignKey: 'created_by', as: 'createdQuestions' });
User.hasMany(Question, { foreignKey: 'updated_by', as: 'updatedQuestions' });
User.hasMany(UserActivitySubmission, { foreignKey: 'user_id', as: 'submissions' });

// Activity associations
Activity.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Activity.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
Activity.hasMany(ActivityVersion, { foreignKey: 'activity_id', as: 'versions' });
Activity.hasMany(ActivityElement, { foreignKey: 'activity_id', as: 'elements' });
Activity.hasMany(UserActivitySubmission, { foreignKey: 'activity_id', as: 'submissions' });

// ActivityVersion associations
ActivityVersion.belongsTo(Activity, { foreignKey: 'activity_id', as: 'activity' });
ActivityVersion.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Question associations
Question.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Question.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
Question.belongsTo(Question, { foreignKey: 'parent_question_id', as: 'parentQuestion' });
Question.hasMany(Question, { foreignKey: 'parent_question_id', as: 'childQuestions' });
Question.hasMany(QuestionVersion, { foreignKey: 'question_id', as: 'versions' });
Question.hasMany(ActivityElement, { foreignKey: 'question_id', as: 'activityElements' });

// QuestionVersion associations
QuestionVersion.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
QuestionVersion.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ActivityElement associations
ActivityElement.belongsTo(Activity, { foreignKey: 'activity_id', as: 'activity' });
ActivityElement.belongsTo(ActivityElement, { foreignKey: 'parent_element_id', as: 'parentElement' });
ActivityElement.hasMany(ActivityElement, { foreignKey: 'parent_element_id', as: 'childElements' });
ActivityElement.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
ActivityElement.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
ActivityElement.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
ActivityElement.hasMany(ActivityElementVersion, { foreignKey: 'element_id', as: 'versions' });

// ActivityElementVersion associations
ActivityElementVersion.belongsTo(ActivityElement, { foreignKey: 'element_id', as: 'element' });
ActivityElementVersion.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// UserActivitySubmission associations
UserActivitySubmission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserActivitySubmission.belongsTo(Activity, { foreignKey: 'activity_id', as: 'activity' });
UserActivitySubmission.belongsTo(User, { foreignKey: 'submitted_by', as: 'submitter' });
UserActivitySubmission.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
UserActivitySubmission.hasMany(UserActivitySubmissionAnswer, { foreignKey: 'submission_id', as: 'answers' });
UserActivitySubmission.hasMany(UserActivitySubmissionVersion, { foreignKey: 'submission_id', as: 'versions' });

// UserActivitySubmissionVersion associations
UserActivitySubmissionVersion.belongsTo(UserActivitySubmission, { foreignKey: 'submission_id', as: 'submission' });
UserActivitySubmissionVersion.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// UserActivitySubmissionAnswer associations
UserActivitySubmissionAnswer.belongsTo(UserActivitySubmission, { foreignKey: 'submission_id', as: 'submission' });
UserActivitySubmissionAnswer.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
UserActivitySubmissionAnswer.belongsTo(User, { foreignKey: 'submitted_by', as: 'submitter' });
UserActivitySubmissionAnswer.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
UserActivitySubmissionAnswer.hasMany(UserActivitySubmissionAnswerVersion, { foreignKey: 'answer_id', as: 'versions' });

// UserActivitySubmissionAnswerVersion associations
UserActivitySubmissionAnswerVersion.belongsTo(UserActivitySubmissionAnswer, { foreignKey: 'answer_id', as: 'answer' });
UserActivitySubmissionAnswerVersion.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Rubric associations
Rubric.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Rubric.hasMany(RubricCriterion, { foreignKey: 'rubric_id', as: 'criteria' });
Rubric.hasMany(QuestionScoring, { foreignKey: 'rubric_id', as: 'questionScorings' });
Rubric.hasMany(QuestionScore, { foreignKey: 'rubric_id', as: 'scores' });

// RubricCriterion associations
RubricCriterion.belongsTo(Rubric, { foreignKey: 'rubric_id', as: 'rubric' });
RubricCriterion.hasMany(RubricLevel, { foreignKey: 'criterion_id', as: 'levels' });

// RubricLevel associations
RubricLevel.belongsTo(RubricCriterion, { foreignKey: 'criterion_id', as: 'criterion' });

// QuestionScoring associations
QuestionScoring.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
QuestionScoring.belongsTo(Rubric, { foreignKey: 'rubric_id', as: 'rubric' });
Question.hasOne(QuestionScoring, { foreignKey: 'question_id', as: 'scoring' });

// ActivitySubmission associations
ActivitySubmission.belongsTo(Activity, { foreignKey: 'activity_id', as: 'activity' });
ActivitySubmission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ActivitySubmission.belongsTo(User, { foreignKey: 'graded_by', as: 'grader' });
ActivitySubmission.hasMany(QuestionResponse, { foreignKey: 'submission_id', as: 'responses' });
ActivitySubmission.hasMany(QuestionScore, { foreignKey: 'submission_id', as: 'scores' });
Activity.hasMany(ActivitySubmission, { foreignKey: 'activity_id', as: 'gradedSubmissions' });
User.hasMany(ActivitySubmission, { foreignKey: 'user_id', as: 'gradedSubmissions' });
User.hasMany(ActivitySubmission, { foreignKey: 'graded_by', as: 'gradedByMe' });

// QuestionResponse associations
QuestionResponse.belongsTo(ActivitySubmission, { foreignKey: 'submission_id', as: 'submission' });
QuestionResponse.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
QuestionResponse.hasMany(QuestionScore, { foreignKey: 'response_id', as: 'scores' });
Question.hasMany(QuestionResponse, { foreignKey: 'question_id', as: 'responses' });

// QuestionScore associations
QuestionScore.belongsTo(QuestionResponse, { foreignKey: 'response_id', as: 'response' });
QuestionScore.belongsTo(ActivitySubmission, { foreignKey: 'submission_id', as: 'submission' });
QuestionScore.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
QuestionScore.belongsTo(Rubric, { foreignKey: 'rubric_id', as: 'rubric' });
QuestionScore.belongsTo(User, { foreignKey: 'graded_by', as: 'grader' });
Question.hasMany(QuestionScore, { foreignKey: 'question_id', as: 'scores' });
User.hasMany(QuestionScore, { foreignKey: 'graded_by', as: 'gradesGiven' });

// SectionWeight associations
SectionWeight.belongsTo(ActivityElement, { foreignKey: 'activity_element_id', as: 'element' });
ActivityElement.hasOne(SectionWeight, { foreignKey: 'activity_element_id', as: 'weight' });

// Export all models
export {
  sequelize,
  User,
  Activity,
  ActivityVersion,
  Question,
  QuestionVersion,
  ActivityElement,
  ActivityElementVersion,
  UserActivitySubmission,
  UserActivitySubmissionVersion,
  UserActivitySubmissionAnswer,
  UserActivitySubmissionAnswerVersion,
  Rubric,
  RubricCriterion,
  RubricLevel,
  QuestionScoring,
  ActivitySubmission,
  QuestionResponse,
  QuestionScore,
  SectionWeight,
};

// Sync database (for development)
export const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✓ Database synchronized successfully');
  } catch (error) {
    console.error('✗ Database synchronization failed:', error);
    throw error;
  }
};

export default {
  sequelize,
  User,
  Activity,
  ActivityVersion,
  Question,
  QuestionVersion,
  ActivityElement,
  ActivityElementVersion,
  UserActivitySubmission,
  UserActivitySubmissionVersion,
  UserActivitySubmissionAnswer,
  UserActivitySubmissionAnswerVersion,
  Rubric,
  RubricCriterion,
  RubricLevel,
  QuestionScoring,
  ActivitySubmission,
  QuestionResponse,
  QuestionScore,
  SectionWeight,
  syncDatabase,
};
