import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const RubricCriterion = sequelize.define('RubricCriterion', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  rubric_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rubrics',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  criterion_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  max_score: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'rubric_criteria',
  timestamps: false,
  indexes: [
    { fields: ['rubric_id'] },
  ],
});

export default RubricCriterion;
