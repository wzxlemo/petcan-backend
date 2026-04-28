/**
 * Petcan 后端服务
 * 框架: Hono (Node.js)
 * 功能: API代理 + 图片上传 + 数据库
 *
 * 模式说明:
 *   - 真实模式: 直接调用 AI API
 *   - 模拟模式: AI API 不可用时自动降级，返回模拟数据
 */

require('dotenv').config({ path: '.env.local' });
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 数据库
const { initDatabase } = require('./db/connection');

const LOVART_API_KEY = process.env.LOVART_API_KEY;
const LOVART_BASE_URL = process.env.LOVART_BASE_URL || 'https://api.lovart.pro';
const PORT = process.env.PORT || 3001;

// ===== 模式检测 =====
let USE_MOCK = false;
let mockJobs = {};

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

  processMockJob(id);
  return mockJobs[id];
}

function processMockJob(id) {
  const job = mockJobs[id];
  if (!job) return;

  const stage = job.stages[job.currentStage];
  if (!stage) {
    job.status = 'completed';
    job.progress = 100;
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

// ===== CORS 中间件 =====
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

// ===== 数据库实例（稍后初始化） =====
let db = null;

// ===== 路由 =====

// 健康检查
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Petcan Backend',
    lovart_configured: !!LOVART_API_KEY,
    mode: USE_MOCK ? 'mock' : 'real',
    lovart_api: LOVART_BASE_URL,
    pollinations_ai: 'https://image.pollinations.ai',
    pollinations_status: 'available',
    database_connected: db !== null,
    timestamp: new Date().toISOString()
  });
});

// ===== 用户相关 API =====

// 创建/更新用户（微信登录后调用）
app.post('/api/users', async (c) => {
  if (!db) return c.json({ error: 'Database not available' }, 503);
  
  try {
    const body = await c.req.json();
    const { openid, nickname, avatarUrl } = body;
    
    // 检查用户是否已存在
    const existing = await db.select().from(require('./db/schema').users).where({ openid }).limit(1);
    
    if (existing.length > 0) {
      // 更新用户信息
      await db.update(require('./db/schema').users)
        .set({ nickname, avatarUrl, updatedAt: new Date() })
        .where({ openid });
      return c.json({ success: true, user: existing[0], action: 'updated' });
    }
    
    // 创建新用户
    const [newUser] = await db.insert(require('./db/schema').users)
      .values({ openid, nickname, avatarUrl })
      .returning();
    
    return c.json({ success: true, user: newUser, action: 'created' });
  } catch (error) {
    console.error('User creation failed:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// 获取用户信息
app.get('/api/users/:openid', async (c) => {
  if (!db) return c.json({ error: 'Database not available' }, 503);
  
  try {
    const openid = c.req.param('openid');
    const [user] = await db.select().from(require('./db/schema').users).where({ openid }).limit(1);
    
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json(user);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== 宠物相关 API =====

// 创建宠物
app.post('/api/pets', async (c) => {
  if (!db) return c.json({ error: 'Database not available' }, 503);
  
  try {
    const body = await c.req.json();
    const { userId, name, type, breed, gender, birthday, neutered } = body;
    
    const [newPet] = await db.insert(require('./db/schema').pets)
      .values({ userId, name, type, breed, gender, birthday, neutered })
      .returning();
    
    return c.json({ success: true, pet: newPet });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// 获取用户的所有宠物
app.get('/api/pets', async (c) => {
  if (!db) return c.json({ error: 'Database not available' }, 503);
  
  try {
    const userId = c.req.query('userId');
    if (!userId) return c.json({ error: 'userId required' }, 400);
    
    const pets = await db.select().from(require('./db/schema').pets).where({ userId });
    return c.json(pets);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// 更新宠物信息
app.put('/api/pets/:id', async (c) => {
  if (!db) return c.json({ error: 'Database not available' }, 503);
  
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    
    const [updated] = await db.update(require('./db/schema').pets)
      .set({ ...body, updatedAt: new Date() })
      .where({ id })
      .returning();
    
    return c.json({ success: true, pet: updated });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ===== Lovart API 代理 =====

// 生成宠物形象
app.post('/api/lovart/generate', async (c) => {
  try {
    const body = await c.req.json();
    console.log('🎨 生成请求...');
    console.log('   Prompt:', body.prompt?.substring(0, 60) + '...');

    if (USE_MOCK) {
      console.log('   [模拟模式] 创建模拟任务');
      const job = createMockJob(body.prompt);
      return c.json({
        id: job.id,
        status: 'processing',
        estimated_time: 10,
        created_at: job.created_at
      });
    }

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

// 查询生成状态
app.get('/api/lovart/status/:id', async (c) => {
  try {
    const designId = c.req.param('id');
    console.log(`🔍 查询状态: ${designId}`);

    if (USE_MOCK && designId.startsWith('mock_')) {
      const job = mockJobs[designId];
      if (!job) return c.json({ error: '任务不存在' }, 404);

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

    const response = await lovartClient.get(`/v1/design/${designId}`);
    return c.json(response.data);

  } catch (error) {
    console.error('❌ 查询状态失败:', error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message;
    return c.json({ error: message }, status);
  }
});

// 获取用户信息
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

// ===== "小能" AI 对话 =====
const { chatWithXiaoneng, generateGreeting } = require('./services/xiaoneng');

// 首次对话 - 获取开场白
app.post('/api/chat/greeting', async (c) => {
  try {
    const { petInfo } = await c.req.json();
    const greeting = generateGreeting(petInfo);
    return c.json({ reply: greeting });
  } catch (error) {
    return c.json({ reply: '你好！我是小能，你的宠物健康管家 🐾\n\n最近宠物状态怎么样？有任何问题都可以问我！' });
  }
});

// 对话接口
app.post('/api/chat', async (c) => {
  try {
    const { message, history = [], petInfo = {} } = await c.req.json();

    console.log('🤖 小能收到消息:', message.substring(0, 50));

    const result = await chatWithXiaoneng(message, history, petInfo);

    return c.json({
      reply: result.reply,
      record: result.record,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('小能对话错误:', error.message);
    return c.json({ 
      reply: '抱歉，小能暂时无法回答，请稍后再试。',
      error: error.message 
    }, 500);
  }
});

// ===== Pollinations.AI 形象生成（Freepik/Lovart 免费替代方案）=====

// 构建 Pollinations.AI 提示词
function buildPollinationsPrompt(petInfo) {
  const { petType = 'dog', breed = '', color = '', gender = '', age = '', neutered = false, responseWord = '' } = petInfo;
  
  const typeMap = { dog: 'dog', cat: 'cat' };
  const animal = typeMap[petType] || petType || 'pet';
  
  const prompt = `Cute cartoon kawaii ${animal}${breed ? ' ' + breed : ''}${color ? ', ' + color + ' color' : ''}, 
    big round sparkling eyes, happy friendly expression, 
    soft pastel colors, clean white background, 
    children's book illustration style, simple clean design, 
    perfect for mobile app avatar, high quality, detailed, 
    front facing, full body view, 2D flat illustration`;
  
  return prompt.replace(/\s+/g, ' ').trim();
}

// 生成宠物2D形象（Pollinations.AI - 完全免费，无需Key）
app.post('/api/generate-pet-image', async (c) => {
  try {
    const petInfo = await c.req.json();
    console.log('🎨 Pollinations 形象生成请求:', petInfo);

    const prompt = buildPollinationsPrompt(petInfo);
    const seed = Date.now();
    
    // Pollinations.AI 同步图片URL（无需轮询，直接可用）
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}&model=flux`;

    // 验证图片可访问性（可选，不阻塞）
    let accessible = true;
    try {
      await axios.head(imageUrl, { timeout: 8000 });
    } catch (e) {
      accessible = false;
      console.log('⚠️ Pollinations 图片预检失败，但URL仍可用');
    }

    console.log('✅ Pollinations 图片URL生成成功');

    return c.json({
      success: true,
      imageUrl,
      prompt,
      seed,
      provider: 'pollinations.ai',
      accessible,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Pollinations 生成失败:', error.message);
    return c.json({
      success: false,
      error: error.message,
      fallback: '请检查网络连接或稍后重试'
    }, 500);
  }
});

// ===== TTS 语音合成（Pollinations.AI TTS + Edge TTS 备选）=====

// 宠物音色参数映射（品种/年龄/性别/绝育 → 语音参数）
function calculateVoiceParams(petParams) {
  const { gender = 'male', age = 3, breed = '', neutered = false, petType = 'dog' } = petParams;
  
  // 基础参数
  let pitch = 1.0;
  let rate = 1.0;
  let voiceGender = gender === 'female' ? 'female' : 'male';
  
  // 品种/体型影响音调
  const smallBreeds = ['teddy', 'chihuahua', 'poodle', 'bichon', 'persian', 'ragdoll', 'shorthair'];
  const largeBreeds = ['golden', 'labrador', 'german shepherd', 'rottweiler', 'husky', 'maine coon'];
  
  const breedLower = breed.toLowerCase();
  if (smallBreeds.some(b => breedLower.includes(b))) {
    pitch += 0.15;
  } else if (largeBreeds.some(b => breedLower.includes(b))) {
    pitch -= 0.1;
  }
  
  // 宠物类型（猫普遍音调更高）
  if (petType === 'cat') {
    pitch += 0.1;
  }
  
  // 年龄影响
  const ageNum = parseInt(age) || 3;
  if (ageNum <= 1) {
    pitch += 0.2;
    rate += 0.1;
  } else if (ageNum >= 10) {
    pitch -= 0.1;
    rate -= 0.05;
  }
  
  // 性别影响
  if (gender === 'female') {
    pitch += 0.05;
  }
  
  // 绝育影响（雄性绝育后声音变柔和/偏高）
  if (neutered && gender === 'male') {
    pitch += 0.1;
  }
  
  // 限制范围
  pitch = Math.max(0.5, Math.min(2.0, pitch));
  rate = Math.max(0.5, Math.min(1.5, rate));
  
  return { pitch, rate, voiceGender };
}

// TTS 合成接口
app.post('/api/tts', async (c) => {
  try {
    const { text, petParams = {} } = await c.req.json();
    
    if (!text || text.trim().length === 0) {
      return c.json({ error: '文本内容不能为空' }, 400);
    }
    
    console.log('🔊 TTS 请求:', text.substring(0, 50));
    
    // 计算宠物专属音色参数
    const voiceParams = calculateVoiceParams(petParams);
    
    // 方案1: Pollinations.AI TTS（无需Key，免费）
    // 使用 OpenAI 音频模型，voice可选: alloy, echo, fable, onyx, nova, shimmer
    const pollinationsTtsUrl = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-audio&voice=nova`;
    
    return c.json({
      success: true,
      text: text.trim(),
      provider: 'pollinations.ai',
      audioUrl: pollinationsTtsUrl,
      voiceParams,  // 前端 Web Speech API 可用这些参数
      // 前端 Web Speech API 参数（浏览器原生TTS建议值）
      webSpeechConfig: {
        lang: 'zh-CN',
        pitch: voiceParams.pitch,
        rate: voiceParams.rate,
        // 推荐语音（设备不同可能不存在）
        preferredVoices: voiceParams.voiceGender === 'female' 
          ? ['Xiaoxiao', 'zh-CN-XiaoxiaoNeural', 'Ting-Ting']
          : ['Yunxi', 'zh-CN-YunxiNeural', 'Kangkang']
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ TTS 失败:', error.message);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// ===== 图片上传 =====


app.post('/api/upload', async (c) => {
  try {
    const { image, type } = await c.req.json();

    if (!image) {
      return c.json({ error: '未提供图片数据' }, 400);
    }

    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

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

// 静态文件服务
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
const FRONTEND_DIR = path.join(__dirname, 'public');

app.get('/', (c) => {
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    const file = fs.readFileSync(indexPath, 'utf-8');
    return c.html(file);
  }
  return c.json({ error: '前端文件未找到' }, 404);
});

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
  // 初始化数据库
  const dbResult = await initDatabase();
  db = dbResult.db;

  // 检测 Lovart API
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
    console.log(`💾 数据库: ${db ? '已连接' : '未连接'}`);
    console.log('');
    console.log('可用接口:');
    console.log(`   GET  http://localhost:${PORT}/api/health`);
    console.log(`   POST http://localhost:${PORT}/api/users          创建/更新用户`);
    console.log(`   GET  http://localhost:${PORT}/api/users/:openid  获取用户`);
    console.log(`   POST http://localhost:${PORT}/api/pets           创建宠物`);
    console.log(`   GET  http://localhost:${PORT}/api/pets?userId=   获取宠物列表`);
    console.log(`   PUT  http://localhost:${PORT}/api/pets/:id       更新宠物`);
    console.log(`   POST http://localhost:${PORT}/api/generate-pet-image  Pollinations.AI形象生成`);
    console.log(`   POST http://localhost:${PORT}/api/tts            TTS语音合成`);
    console.log(`   POST http://localhost:${PORT}/api/chat           小能AI对话`);
    console.log(`   POST http://localhost:${PORT}/api/chat/greeting  小能开场白`);
    console.log(`   POST http://localhost:${PORT}/api/lovart/generate`);
    console.log(`   GET  http://localhost:${PORT}/api/lovart/status/:id`);
    console.log(`   POST http://localhost:${PORT}/api/upload`);
    console.log('');
    console.log('🎨 形象生成: Pollinations.AI（免费，无需Key）');
    console.log('🔊 语音合成: Pollinations.AI TTS + Web Speech API');
    console.log('🤖 AI对话: Kimi K2.5');
    console.log('');
  });
}

start();
