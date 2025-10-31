import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Rubric = sequelize.define('Rubric', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  rubric_type: {
    type: DataTypes.ENUM('points', 'criteria', 'pass_fail', 'percentage', 'custom'),
    allowNull: false,
  },
  max_score: {
    type: DataTypes.FLOAT,
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
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('active', 'archived'),
    allowNull: false,
    defaultValue: 'active',
  },
}, {
  tableName: 'rubrics',
  timestamps: false,
  indexes: [
    { fields: ['rubric_type'] },
    { fields: ['status'] },
    { fields: ['created_by'] },
  ],
});

export default Rubric;
