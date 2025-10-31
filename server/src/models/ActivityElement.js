import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ActivityElement = sequelize.define('ActivityElement', {
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
  parent_element_id: {
    type: DataTypes.UUID,
    references: {
      model: 'activity_elements',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  element_type: {
    type: DataTypes.ENUM('section', 'question'),
    allowNull: false,
  },
  question_id: {
    type: DataTypes.UUID,
    references: {
      model: 'questions',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
  },
  description: {
    type: DataTypes.TEXT,
  },
  order_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'archived'),
    allowNull: false,
    defaultValue: 'active',
  },
  tags: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('tags');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('tags', JSON.stringify(value || []));
    },
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  created_by: {
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
  tableName: 'activity_elements',
  timestamps: false,
  indexes: [
    { fields: ['activity_id'] },
    { fields: ['parent_element_id'] },
    { fields: ['question_id'] },
  ],
});

export default ActivityElement;
