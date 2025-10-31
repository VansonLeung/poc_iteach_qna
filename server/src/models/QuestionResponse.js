import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const QuestionResponse = sequelize.define('QuestionResponse', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  submission_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'activity_submissions',
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
  response_data: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('response_data');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('response_data', JSON.stringify(value || {}));
    },
  },
  is_auto_graded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  auto_grade_result: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('auto_grade_result');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('auto_grade_result', value ? JSON.stringify(value) : null);
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
  tableName: 'question_responses',
  timestamps: false,
  indexes: [
    { fields: ['submission_id'] },
    { fields: ['question_id'] },
  ],
});

export default QuestionResponse;
