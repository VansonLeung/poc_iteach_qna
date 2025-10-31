import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserActivitySubmissionVersion = sequelize.define('UserActivitySubmissionVersion', {
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
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  activity_id: {
    type: DataTypes.UUID,
    allowNull: false,
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
  tableName: 'user_activity_submission_versions',
  timestamps: false,
  indexes: [
    { fields: ['submission_id'] },
    { unique: true, fields: ['submission_id', 'version'] },
  ],
});

export default UserActivitySubmissionVersion;
