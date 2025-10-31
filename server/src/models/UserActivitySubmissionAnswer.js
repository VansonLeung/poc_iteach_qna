import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserActivitySubmissionAnswer = sequelize.define('UserActivitySubmissionAnswer', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  submission_id: {
    type: DataTypes.UUID,
    allowNull: false,
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
  element_uuid: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  answer_data: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('answer_data');
      return rawValue ? JSON.parse(rawValue) : {};
    },
    set(value) {
      this.setDataValue('answer_data', JSON.stringify(value || {}));
    },
  },
  status: {
    type: DataTypes.ENUM('in-progress', 'submitted', 'archived'),
    allowNull: false,
    defaultValue: 'in-progress',
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  submitted_at: {
    type: DataTypes.DATE,
  },
  submitted_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'user_activity_submission_answers',
  timestamps: false,
  indexes: [
    { fields: ['submission_id'] },
    { fields: ['question_id'] },
  ],
});

export default UserActivitySubmissionAnswer;
