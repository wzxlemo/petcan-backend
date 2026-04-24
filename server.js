/**
 * Petcan 后端服务
 * 框架: Hono (Node.js)
 * 功能: Lovart API 代理 + 图片上传
 *
 * 模式说明:
 *   - 真实模式: 直接调用 Lovart API (部署到真实服务器时使用)
 *   - 模拟模式: Lovart API 不可用时自动降级，返回模拟数据
 */

require('dotenv').config({ path: '.env.local' });
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const LOVART_API_KEY = process.env.LOVART_API_KEY;
const LOVART_BASE_URL = process.env.LOVART_BASE_URL || 'https://api.lovart.pro';
const PORT = process.env.PORT || 3001;

// ===== 模式检测 =====
// 测试 Lovart API 是否可用
let USE_MOCK = false;
let mockJobs = {}; // 存储模拟任务状态

async function testLovartConnection() {
  try {
    await axios.get(`${LOVART_BASE_URL}/v1/user/me`, {
      headers: { 'Authorization': `Bearer ${LOVART_API_KEY}` },
      timeout: 5000
    });
    console.log('✅ Lovart API 连接正常（真实模式）');
    USE_MOCK = false;
  } catch (error) {
    console.log('⚠️ Lovart API 不可用，切换到模拟模式');
    console.log(`   原因: ${error.message}`);
    USE_MOCK = true;
  }
}

// ===== Lovart API 客户端 =====
const lovartClient = axios.create({
  baseURL: LOVART_BASE_URL,
  headers: {
    'Authorization': `Bearer ${LOVART_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// ===== 模拟数据生成器 =====
function createMockJob(prompt) {
  const id = 'mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const createdAt = new Date().toISOString();

  mockJobs[id] = {
    id,
    status: 'processing',
    prompt: prompt,
    created_at: createdAt,
    progress: 0,
    stages: [
      { progress: 15, text: 'AI分析宠物特征...', delay: 1500 },
      { progress: 35, text: '绘制卡通轮廓...', delay: 2000 },
      { progress: 55, text: '填充色彩与细节...', delay: 2000 },
      { progress: 75, text: '优化形象效果...', delay: 1800 },
      { progress: 90, text: '最终渲染中...', delay: 1500 },
      { progress: 100, text: 'completed', delay: 1000 }
    ],
    currentStage: 0
  };

  // 模拟异步处理
  processMockJob(id);

  return mockJobs[id];
}

function processMockJob(id) {
  const job = mockJobs[id];
  if (!job) return;

  const stage = job.stages[job.currentStage];
  if (!stage) {
    // 所有阶段完成
    job.status = 'completed';
    job.progress = 100;
    // 生成一个模拟的图片 URL（基于宠物类型）
    const isCat = job.prompt && job.prompt.includes('cat');
    job.resultUrl = isCat
      ? 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1024&h=1024&fit=crop'
      : 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1024&h=1024&fit=crop';
    console.log(`✅ 模拟任务完成: ${id}`);
    return;
  }

  job.progress = stage.progress;

  setTimeout(() => {
    job.currentStage++;
    processMockJob(id);
  }, stage.delay);
}

// ===== 创建 Hono 应用 =====
const app = new Hono();

// ===== 中间件 =====

// CORS 中间件 - 允许前端访问
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (c.req.method === 'OPTIONS') return c.text('', 204);
  await next();
});

// 请求日志
app.use('*', async (c, next) => {
  const start = Date.now();
  console.log(`→ ${c.req.method} ${c.req.path}`);
  await next();
  console.log(`← ${c.req.method} ${c.req.path} - ${c.res.status} (${Date.now() - start}ms)`);
});

// ===== 路由 =====

// 健康检查
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Petcan Backend',
    lovart_configured: !!LOVART_API_KEY,
    mode: USE_MOCK ? 'mock' : 'real',
    lovart_api: LOVART_BASE_URL,
    timestamp: new Date().toISOString()
  });
});

// Lovart: 生成宠物形象
app.post('/api/lovart/generate', async (c) => {
  try {
    const body = await c.req.json();
    console.log('🎨 生成请求...');
    console.log('   Prompt:', body.prompt?.substring(0, 60) + '...');

    if (USE_MOCK) {
      // 模拟模式
      console.log('   [模拟模式] 创建模拟任务');
      const job = createMockJob(body.prompt);
      return c.json({
        id: job.id,
        status: 'processing',
        estimated_time: 10,
        created_at: job.created_at
      });
    }

    // 真实模式
    const response = await lovartClient.post('/v1/design/generate', body);
    console.log('✅ 生成任务创建成功:', response.data.id);
    return c.json(response.data);

  } catch (error) {
    console.error('❌ 生成失败:', error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message;
    return c.json({ error: message, detail: error.message }, status);
  }
});

// Lovart: 查询生成状态
app.get('/api/lovart/status/:id', async (c) => {
  try {
    const designId = c.req.param('id');
    console.log(`🔍 查询状态: ${designId}`);

    if (USE_MOCK && designId.startsWith('mock_')) {
      // 模拟模式
      const job = mockJobs[designId];
      if (!job) {
        return c.json({ error: '任务不存在' }, 404);
      }

      const response = {
        id: job.id,
        status: job.status,
        progress: job.progress,
        created_at: job.created_at
      };

      if (job.status === 'completed' && job.resultUrl) {
        response.output = {
          images: [{ url: job.resultUrl, width: 1024, height: 1024 }]
        };
        response.completed_at = new Date().toISOString();
      }

      return c.json(response);
    }

    // 真实模式
    const response = await lovartClient.get(`/v1/design/${designId}`);
    return c.json(response.data);

  } catch (error) {
    console.error('❌ 查询状态失败:', error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message;
    return c.json({ error: message }, status);
  }
});

// Lovart: 获取用户信息
app.get('/api/lovart/user', async (c) => {
  try {
    console.log('👤 查询用户信息...');

    if (USE_MOCK) {
      return c.json({
        id: 'mock_user_001',
        plan: 'free',
        credits_remaining: 100,
        credits_used: 5,
        mode: 'mock'
      });
    }

    const response = await lovartClient.get('/v1/user/me');
    return c.json(response.data);

  } catch (error) {
    console.error('❌ 查询用户信息失败:', error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message;
    return c.json({ error: message }, status);
  }
});

// 图片上传 (接收 base64)
app.post('/api/upload', async (c) => {
  try {
    const { image, type } = await c.req.json();

    if (!image) {
      return c.json({ error: '未提供图片数据' }, 400);
    }

    // 创建上传目录
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 从 base64 提取数据
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 保存文件
    const filename = `${type}_${Date.now()}.jpg`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    console.log(`📸 图片上传成功: ${filename} (${Math.round(buffer.length / 1024)}KB)`);

    return c.json({
      success: true,
      filename,
      size: buffer.length,
      url: `/uploads/${filename}`
    });
  } catch (error) {
    console.error('❌ 图片上传失败:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// 静态文件服务 - 上传的图片
app.get('/uploads/:filename', (c) => {
  const filename = c.req.param('filename');
  const filepath = path.join(__dirname, 'uploads', filename);

  if (!fs.existsSync(filepath)) {
    return c.json({ error: '文件不存在' }, 404);
  }

  const file = fs.readFileSync(filepath);
  c.header('Content-Type', 'image/jpeg');
  return c.body(file);
});

// ===== 静态文件服务 - 前端文件 =====
const FRONTEND_DIR = path.join(__dirname, '..', 'pet-app-demo');

// 根路径返回 index.html
app.get('/', (c) => {
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    const file = fs.readFileSync(indexPath, 'utf-8');
    return c.html(file);
  }
  return c.json({ error: '前端文件未找到' }, 404);
});

// 静态资源（JS/CSS/图片）
app.get('/:filename', (c) => {
  const filename = c.req.param('filename');
  const filepath = path.join(FRONTEND_DIR, filename);

  if (!fs.existsSync(filepath)) return c.notFound();

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const file = fs.readFileSync(filepath);
  c.header('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  return c.body(file);
});

// ===== 启动服务 =====

async function start() {
  // 先检测 Lovart API 可用性
  await testLovartConnection();

  serve({
    fetch: app.fetch,
    port: PORT
  }, (info) => {
    console.log('');
    console.log('🐾 Petcan 后端服务已启动');
    console.log('================================');
    console.log(`🌐 服务地址: http://localhost:${PORT}`);
    console.log(`🤖 Lovart API: ${LOVART_BASE_URL}`);
    console.log(`📟 运行模式: ${USE_MOCK ? '模拟模式 (MOCK)' : '真实模式 (REAL)'}`);
    console.log('');
    console.log('可用接口:');
    console.log(`   GET  http://localhost:${PORT}/api/health`);
    console.log(`   GET  http://localhost:${PORT}/api/lovart/user`);
    console.log(`   POST http://localhost:${PORT}/api/lovart/generate`);
    console.log(`   GET  http://localhost:${PORT}/api/lovart/status/:id`);
    console.log(`   POST http://localhost:${PORT}/api/upload`);
    console.log('');
    console.log('📋 测试命令:');
    console.log(`   curl http://localhost:${PORT}/api/health`);
    console.log('');
  });
}

start();
