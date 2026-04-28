# 🆓 免费API替代方案（Freepik备选）

> 本文档汇总当Freepik API无法支持时的免费替代方案，确保项目进度不受阻塞。

---

## 方案概览

| 功能 | 首选方案 | 免费额度 | 是否需要Key |
|------|---------|---------|------------|
| 🖼️ 2D形象生成 | **Pollinations.AI** | 无限（基础版） | ❌ 不需要 |
| 🔊 语音合成(TTS) | **Edge TTS** | 无限 | ❌ 不需要 |
| 🔊 语音合成(备选) | **Pollinations.AI TTS** | 无限（基础版） | ❌ 不需要 |
| 💬 AI对话 | **Kimi K2.5** | 按充值额度 | ✅ 需要 |

---

## 1. 🖼️ 图片生成：Pollinations.AI（强烈推荐）

### 简介
- **官网**: https://pollinations.ai
- **GitHub**: https://github.com/pollinations/pollinations
- **特点**: 100%开源、无需注册、零数据存储、完全匿名
- **社区规模**: 500+个项目在使用，日请求量150万+

### 核心优势
✅ **完全免费** - 基础使用无需付费，无需API Key  
✅ **模型丰富** - Flux、GPT Image、Seedream、Kontext等多种模型  
✅ **支持中文** - 可以直接用中文提示词生成  
✅ **隐私安全** - 零数据存储，不保留用户数据  
✅ **开源透明** - 代码完全公开，社区驱动  

### 使用方法

#### 方法一：简单URL（无需Key，最简单）
```
https://pollinations.ai/p/一只可爱的橘色卡通猫咪，2D扁平插画风格，白色背景?width=512&height=512&seed=42
```

#### 方法二：API端点（推荐）
```javascript
// 生成2D宠物形象
const generatePetImage = async (petDescription) => {
  const prompt = `Cute cartoon ${petDescription}, 2D flat illustration style, 
    vibrant colors, clean white background, full body view, 
    kawaii style, vector art, suitable for mobile app avatar`;
  
  // 直接使用图片URL
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
  
  return imageUrl;
};

// 示例
const catImage = await generatePetImage("orange tabby cat, male, 3 years old");
// 返回可直接使用的图片URL
```

#### 方法三：异步POST API（高级用法）
```javascript
const response = await fetch('https://image.pollinations.ai/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "cute cartoon dog, 2D flat style",
    width: 512,
    height: 512,
    seed: 42,
    model: "flux" // 可选: flux, gptimage, seedream
  })
});
```

### 可用模型对比

| 模型 | 风格 | 速度 | 适合场景 |
|------|------|------|---------|
| **flux** | 写实/卡通均可 | 中等 | 通用首选，质量均衡 |
| **seedream** | 插画风格 | 快 | 2D形象生成推荐 |
| **kontext** | 艺术风格 | 中等 | 创意艺术 |
| **gptimage** | 写实 | 较慢 | 照片级真实感 |

### ⚠️ 限制与注意事项
- 基础版免费，但高峰期可能需要排队
- 如需优先服务，可申请API Key（仍免费，只是有速率限制）
- img2img（图片编辑）功能目前有限制，但text-to-image完全可用
- 单张图片生成时间：3-10秒

---

## 2. 🔊 语音合成(TTS)：Edge TTS（强烈推荐）

### 简介
- **GitHub**: https://github.com/rany2/edge-tts
- **原理**: 调用Microsoft Edge浏览器的在线TTS服务
- **特点**: 无需API Key、无需Windows、无需Edge浏览器

### 核心优势
✅ **完全免费** - 无额度限制  
✅ **中文支持** - 多种中文语音（晓晓、云希、云野等）  
✅ **音色丰富** - 200+种语音，支持多语言  
✅ **参数可调** - 语速、音量、音调均可调节  
✅ **异步高效** - 适合批量处理  

### 使用方法

#### Node.js集成（后端）
```javascript
// 安装: npm install edge-tts

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 生成宠物音色
const generatePetVoice = async (text, voiceParams) => {
  const outputPath = `/tmp/pet_voice_${Date.now()}.mp3`;
  
  // 根据宠物参数选择声音
  // 小型犬/猫: zh-CN-XiaoxiaoNeural (女声，较高音调)
  // 大型犬: zh-CN-YunxiNeural (男声，较低音调)
  // 年轻宠物: 语速稍快
  // 年长宠物: 语速稍慢
  
  const voice = voiceParams.gender === 'male' 
    ? 'zh-CN-YunxiNeural' 
    : 'zh-CN-XiaoxiaoNeural';
  
  // 根据年龄调整语速 (-50% 到 +50%)
  const rate = voiceParams.age > 8 ? '-10%' : '+10%';
  
  // 根据体型调整音调
  const pitch = voiceParams.size === 'large' ? '-10Hz' : '+10Hz';
  
  const command = `edge-tts --voice ${voice} --rate ${rate} --pitch ${pitch} --text "${text}" --write-media ${outputPath}`;
  
  await execPromise(command);
  return outputPath;
};
```

#### 可用中文语音列表
```bash
edge-tts --list-voices | grep zh-CN
```

| 语音ID | 性别 | 特点 | 适合宠物 |
|--------|------|------|---------|
| zh-CN-XiaoxiaoNeural | 女 | 温暖、年轻 | 小型犬、猫咪 |
| zh-CN-XiaoyiNeural | 女 | 温柔、亲切 | 雌性宠物 |
| zh-CN-YunjianNeural | 男 | 年轻、活泼 | 年轻公犬 |
| zh-CN-YunxiNeural | 男 | 成熟、稳重 | 大型犬 |
| zh-CN-YunxiaNeural | 男 | 低沉 | 绝育后公犬 |
| zh-CN-YunyangNeural | 男 | 标准 | 通用 |
| zh-CN-XiaohanNeural | 女 | 甜美 | 幼年宠物 |
| zh-CN-XiaomoNeural | 女 | 专业 | 通用 |

### ⚠️ 限制与注意事项
- 需要后端服务器运行（Node.js或Python）
- 不支持前端直接调用（跨域限制）
- 生成的音频需通过后端转给前端
- 依赖Microsoft服务，理论上可能有变动风险

---

## 3. 🔊 TTS备选：Pollinations.AI TTS

### 简介
- 与图片生成同平台，一体化解决
- 支持OpenAI的TTS模型

### 使用方法
```javascript
// 直接URL调用
const ttsUrl = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-audio&voice=nova`;
// 返回音频流，可直接播放
```

### 可用语音
| Voice | 特点 |
|-------|------|
| alloy | 中性 |
| echo | 沉稳男声 |
| fable | 英音 |
| onyx | 低沉男声 |
| nova | 温暖女声 |
| shimmer | 年轻女声 |

### ⚠️ 限制
- 中文语音选择不如Edge TTS丰富
- 主要适合英文内容

---

## 4. 🎯 推荐技术方案组合

### 方案A：全免费方案（Freepik不可用时的完整替代）

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   前端 (App)     │────▶│   后端 (Render)  │────▶│  Pollinations  │
│                 │     │                 │     │   (图片生成)     │
│                 │     │  - Edge TTS      │────▶│                │
│                 │     │  - 代理API       │     │  Edge TTS      │
│                 │◀────│                 │◀────│  (语音合成)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │  Kimi K2.5 API   │
                        │  (AI对话/小能)   │
                        │  ⚠️ 需付费       │
                        └─────────────────┘
```

### 方案B：混合方案（推荐）

| 功能 | 方案 | 成本 |
|------|------|------|
| 2D形象生成 | Pollinations.AI（免费）| ¥0 |
| 应答词TTS | Edge TTS（免费）| ¥0 |
| AI对话 | Kimi K2.5（付费）| 按用量 |
| 硬件播放 | 硬件本地播放 | ¥0 |

---

## 5. 🚀 接入优先级建议

### 立即接入（无阻塞）
1. **Pollinations.AI** - 替换Lovart/Freepik的2D形象生成
2. **Edge TTS** - 替换Freepik TTS

### 保持现有（稳定运行）
3. **Kimi K2.5** - 对话AI（已充值，运行正常）
4. **Supabase** - 数据库（免费额度充足）
5. **Render** - 后端托管（免费额度充足）

---

## 6. 📊 成本对比

| 方案 | 月调用量预估 | Freepik成本 | 免费替代成本 | 节省 |
|------|------------|------------|-------------|------|
| 2D形象生成 | 1000张 | ~$50 | ¥0 | 100% |
| TTS语音 | 5000次 | ~$30 | ¥0 | 100% |
| AI对话 | 10000次 | - | ~¥50 (Kimi) | - |
| **总计** | - | **~$80** | **~¥50** | **~90%** |

---

## 7. 🔧 后端集成代码示例

### 新增路由：`/api/pollinations`

```javascript
// server.js 新增路由
app.post('/api/generate-pet-image', async (c) => {
  const { petType, breed, color, age, gender, neutered } = await c.req.json();
  
  // 构建提示词
  const prompt = `Cute cartoon ${petType}, ${breed}, ${color} color, 
    ${age} years old, ${gender}, ${neutered ? 'neutered' : 'not neutered'},
    2D flat illustration style, kawaii, vibrant colors, 
    clean white background, full body view, vector art,
    mobile app avatar, front facing`;
  
  // Pollinations 图片URL
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Date.now()}`;
  
  // 保存到数据库
  await db.update(pets).set({ generated_image_url: imageUrl }).where(eq(pets.id, petId));
  
  return c.json({ success: true, imageUrl });
});
```

### 新增路由：`/api/tts`

```javascript
// server.js 新增TTS路由
app.post('/api/tts', async (c) => {
  const { text, petParams } = await c.req.json();
  
  // 选择语音参数
  const voice = petParams.gender === 'male' ? 'zh-CN-YunxiNeural' : 'zh-CN-XiaoxiaoNeural';
  const rate = petParams.age > 8 ? '-10%' : '+0%';
  
  // 生成音频文件
  const outputPath = `/tmp/tts_${Date.now()}.mp3`;
  const command = `edge-tts --voice ${voice} --rate ${rate} --text "${text}" --write-media ${outputPath}`;
  
  await execPromise(command);
  
  // 读取音频文件并返回
  const audioBuffer = await fs.readFile(outputPath);
  return new Response(audioBuffer, {
    headers: { 'Content-Type': 'audio/mpeg' }
  });
});
```

---

## 8. 📱 前端调用示例

```javascript
// 生成宠物2D形象
const generatePetImage = async (petInfo) => {
  const response = await fetch(`${API_BASE}/api/generate-pet-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(petInfo)
  });
  const { imageUrl } = await response.json();
  return imageUrl; // 直接可用<img src="...">
};

// 播放应答词
const playResponse = async (text, petParams) => {
  const response = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, petParams })
  });
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  new Audio(audioUrl).play();
};
```

---

## 9. ⚡ 快速决策流程

```
Freepik邮件回复了吗？
├── 是，且同意API权限 ──▶ 使用Freepik API（付费但稳定）
│
└── 否，或拒绝 ──▶ 使用免费方案：
    ├── 2D形象 ──▶ Pollinations.AI（立即接入）
    └── TTS语音 ──▶ Edge TTS（立即接入）
        └── 备选 ──▶ Pollinations.AI TTS
```

---

## 10. ✅ 下一步行动清单

- [ ] 在Render后端安装edge-tts依赖
- [ ] 创建 `/api/generate-pet-image` 路由（Pollinations）
- [ ] 创建 `/api/tts` 路由（Edge TTS）
- [ ] 前端替换图片生成调用从Lovart到Pollinations
- [ ] 前端替换TTS调用从Freepik到Edge TTS
- [ ] 测试生成效果和音频质量
- [ ] 如质量不达标，调整提示词或语音参数

---

**结论**: 如果Freepik无法支持，Pollinations.AI + Edge TTS 的组合可以完全免费替代，且技术成熟、社区活跃、无需API Key。建议先行接入，不阻塞项目进度。
