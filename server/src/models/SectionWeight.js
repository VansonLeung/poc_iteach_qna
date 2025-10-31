import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SectionWeight = sequelize.define('SectionWeight', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  activity_element_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'activity_elements',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  weight: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0,
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
  tableName: 'section_weights',
  timestamps: false,
  indexes: [
    { fields: ['activity_element_id'] },
  ],
});

export default SectionWeight;
