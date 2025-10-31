import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const RubricLevel = sequelize.define('RubricLevel', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  criterion_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rubric_criteria',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  level_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  score_value: {
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
  tableName: 'rubric_levels',
  timestamps: false,
  indexes: [
    { fields: ['criterion_id'] },
  ],
});

export default RubricLevel;
