import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const QuestionScore = sequelize.define('QuestionScore', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  response_id: {
    type: DataTypes.UUID,
    allowNull: true,  // Made nullable to support both systems
    references: {
      model: 'question_responses',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  // New field for UserActivitySubmissionAnswer
  answer_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'user_activity_submission_answers',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  submission_id: {
    type: DataTypes.UUID,
    allowNull: true,  // Made nullable to support both systems
    references: {
      model: 'activity_submissions',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  // New field for UserActivitySubmission
  user_submission_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'user_activity_submissions',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  question_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'questions',
      key: 'id',
    },
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  max_score: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  rubric_id: {
    type: DataTypes.UUID,
    references: {
      model: 'rubrics',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
  criteria_scores: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('criteria_scores');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('criteria_scores', value ? JSON.stringify(value) : null);
    },
  },
  feedback: {
    type: DataTypes.TEXT,
  },
  graded_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  graded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  is_current: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'question_scores',
  timestamps: false,
  indexes: [
    { fields: ['response_id'] },
    { fields: ['submission_id'] },
    { fields: ['is_current'] },
  ],
});

export default QuestionScore;
