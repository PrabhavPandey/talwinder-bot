require('dotenv').config();
const db = require('../models');

async function migrate() {
  try {
    console.log('🔄 Starting database migration for Talwinder...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');

    if (process.argv.includes('--force')) {
      console.log('⚠️  Dropping all tables...');
      await db.sequelize.drop();
      console.log('✅ All tables dropped');
    }

    console.log('📝 Creating tables...');
    await db.sequelize.sync({ alter: true });
    console.log('✅ Tables created successfully');

    console.log('\n🎉 Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
