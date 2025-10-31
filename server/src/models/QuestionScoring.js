import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const QuestionScoring = sequelize.define('QuestionScoring', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  question_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'questions',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  rubric_id: {
    type: DataTypes.UUID,
    references: {
      model: 'rubrics',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
  scoring_type: {
    type: DataTypes.ENUM('auto', 'manual', 'hybrid'),
    defaultValue: 'manual',
  },
  weight: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0,
  },
  expected_answers: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('expected_answers');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('expected_answers', value ? JSON.stringify(value) : null);
    },
  },
  auto_grade_config: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('auto_grade_config');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('auto_grade_config', value ? JSON.stringify(value) : null);
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
}, {
  tableName: 'question_scoring',
  timestamps: false,
  indexes: [
    { fields: ['question_id'] },
    { fields: ['rubric_id'] },
  ],
});

export default QuestionScoring;
