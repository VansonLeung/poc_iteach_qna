import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserActivitySubmission = sequelize.define('UserActivitySubmission', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  activity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'activities',
      key: 'id',
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
  tableName: 'user_activity_submissions',
  timestamps: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['activity_id'] },
    { fields: ['status'] },
  ],
});

export default UserActivitySubmission;
