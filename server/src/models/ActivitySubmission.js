import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ActivitySubmission = sequelize.define('ActivitySubmission', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  activity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'activities',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  submitted_at: {
    type: DataTypes.DATE,
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'graded', 'returned'),
    allowNull: false,
    defaultValue: 'draft',
  },
  total_score: {
    type: DataTypes.FLOAT,
  },
  max_possible_score: {
    type: DataTypes.FLOAT,
  },
  percentage: {
    type: DataTypes.FLOAT,
  },
  instructor_feedback: {
    type: DataTypes.TEXT,
  },
  graded_by: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  graded_at: {
    type: DataTypes.DATE,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'activity_submissions',
  timestamps: false,
  indexes: [
    { fields: ['activity_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['activity_id', 'user_id'], unique: true },
  ],
});

export default ActivitySubmission;
