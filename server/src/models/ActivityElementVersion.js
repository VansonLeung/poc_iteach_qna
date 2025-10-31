import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ActivityElementVersion = sequelize.define('ActivityElementVersion', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  element_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'activity_elements',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  activity_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  parent_element_id: {
    type: DataTypes.UUID,
  },
  element_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  question_id: {
    type: DataTypes.UUID,
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
    type: DataTypes.STRING,
    allowNull: false,
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
  tableName: 'activity_element_versions',
  timestamps: false,
  indexes: [
    { fields: ['element_id'] },
    { unique: true, fields: ['element_id', 'version'] },
  ],
});

export default ActivityElementVersion;
