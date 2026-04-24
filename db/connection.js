/**
 * Supabase 数据库连接
 * 使用 @supabase/supabase-js 客户端（REST API 方式）
 * 
 * 为什么用 REST API 而不是直连 PostgreSQL？
 * - 沙箱/Render 网络环境可能无法直连 Supabase Pooler
 * - Supabase JS 客户端使用 HTTP REST API，更可靠
 * - 自动处理认证、RLS、实时订阅
 */

const { createClient } = require('@supabase/supabase-js');

let supabase = null;

/**
 * 初始化 Supabase 客户端
 * 需要环境变量:
 *   - SUPABASE_URL: https://your-project.supabase.co
 *   - SUPABASE_ANON_KEY: 项目的 anon/public key
 *   - SUPABASE_SERVICE_KEY: (可选) service_role key，用于后台操作
 */
async function initDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️ SUPABASE_URL or SUPABASE_KEY not set');
    console.log('   Set them in .env.local or Render Environment Variables');
    console.log('   Get them from: Supabase Dashboard → Project Settings → API');
    return { supabase: null };
  }

  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    });

    // 测试连接：查询 health
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table not found (ok for new project)
      throw error;
    }

    console.log('✅ Supabase connected (REST API mode)');
    return { supabase };
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    console.log('⚠️ Running without database (mock mode)');
    return { supabase: null };
  }
}

function getDb() {
  if (!supabase) {
    throw new Error('Supabase not initialized. Call initDatabase() first.');
  }
  return supabase;
}

module.exports = { initDatabase, getDb };
