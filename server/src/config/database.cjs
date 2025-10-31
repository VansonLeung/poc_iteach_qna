require('dotenv').config();

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: process.env.DATABASE_PATH || './database.sqlite',
    logging: false,
    define: {
      timestamps: false,
      underscored: false,
    },
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      timestamps: false,
      underscored: false,
    },
  },
  production: {
    dialect: 'sqlite',
    storage: process.env.DATABASE_PATH || './database.sqlite',
    logging: false,
    define: {
      timestamps: false,
      underscored: false,
    },
  },
};
