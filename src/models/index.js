const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const logger = require('../utils/logger');

const dbUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const isNeon = dbUrl && (dbUrl.includes('neon.tech') || dbUrl.includes('neon.github.io'));

// Performance tuning for serverless functions (Vercel)
const poolConfig = isProduction 
  ? { max: 2, min: 1, idle: 5000, acquire: 30000 } 
  : { max: 10, min: 0, idle: 10000 };

const dbOptions = {
  logging: false,
  pool: poolConfig,
  dialectOptions: {
    ssl: (isProduction || isNeon) ? {
      require: true,
      rejectUnauthorized: false,
      ca: null
    } : false
  }
};

const sequelize = dbUrl 
  ? new Sequelize(dbUrl, dbOptions)
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        ...dbOptions
      }
    );

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./user')(sequelize, DataTypes);
db.Idea = require('./idea')(sequelize, DataTypes);
db.Conversation = require('./conversation')(sequelize, DataTypes);
db.UserMemory = require('./userMemory')(sequelize, DataTypes);

// Associations
db.User.hasMany(db.Idea, { foreignKey: 'userId', as: 'ideas' });
db.Idea.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.User.hasMany(db.Conversation, { foreignKey: 'userId', as: 'conversations' });
db.Conversation.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.User.hasOne(db.UserMemory, { foreignKey: 'userId', as: 'memory' });
db.UserMemory.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

module.exports = db;
