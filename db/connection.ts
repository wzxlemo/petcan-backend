/**
 * 数据库连接
 * 使用 Drizzle ORM + MySQL2
 */

const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');

const schema = require('./schema');

// 数据库连接池
let pool;
let db;

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL || 'mysql://root@localhost:3306/petcan';

  try {
    pool = mysql.createPool({
      uri: databaseUrl,
      connectionLimit: 10,
      queueLimit: 0,
    });

    db = drizzle(pool, { schema, mode: 'default' });

    // 测试连接
    const [result] = await pool.execute('SELECT 1');
    console.log('✅ Database connected successfully');
    return { pool, db };
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️ Running without database (mock mode)');
    return { pool: null, db: null };
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

module.exports = { initDatabase, getDb };
