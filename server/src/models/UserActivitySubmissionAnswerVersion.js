import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserActivitySubmissionAnswerVersion = sequelize.define('UserActivitySubmissionAnswerVersion', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  answer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'user_activity_submission_answers',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  submission_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  question_id: {
    type: DataTypes.UUID,
    allowNull: false,
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
    type: DataTypes.STRING,
    allowNull: false,
  },
  submitted_at: {
    type: DataTypes.DATE,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'user_activity_submission_answer_versions',
  timestamps: false,
  indexes: [
    { fields: ['answer_id'] },
    { unique: true, fields: ['answer_id', 'version'] },
  ],
});

export default UserActivitySubmissionAnswerVersion;
