# Pet App - 架构决策文档 (ARCH)

## 1. 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | React Native | 跨平台iOS/Android |
| 状态管理 | Zustand | 轻量级状态管理 |
| 后端服务 | Hono + Node.js | 轻量API代理服务 |
| 数据库 | Supabase | BaaS服务（数据库+认证+存储） |
| AI生成 | Lovart API | 2D宠物形象生成（nano-banana-pro模型），通过后端代理调用 |
| 语音合成 | 讯飞TTS | 宠物专属音色合成 |
| 登录授权 | 微信OpenID | 微信授权登录 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端 (Web/Mobile)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   页面   │  │   状态   │  │   API    │  │  本地存储 │   │
│  │  Screens │  │  Store   │  │ Services │  │  AsyncStorage ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Hono 后端代理服务                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 静态文件 │  │ Lovart   │  │  图片    │  │ 健康    │   │
│  │   服务   │  │ 代理API  │  │  上传    │  │ 检查    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │  Supabase │    │ Lovart   │    │ 微信API  │
        │ (数据库) │    │ 形象生成 │    │  登录    │
        └──────────┘    └──────────┘    └──────────┘
```

---

## 3. 数据库设计

### 3.1 数据表结构

#### users（用户表）
```sql
- id: uuid (主键)
- openid: string (微信OpenID)
- phone: string (手机号)
- created_at: timestamp
- updated_at: timestamp
```

#### pets（宠物表）
```sql
- id: uuid (主键)
- user_id: uuid (外键 → users)
- name: string (昵称)
- type: enum ('cat', 'dog')
- breed: string (品种)
- gender: enum ('boy', 'girl')
- birth_year: int
- birth_month: int
- birth_day: int | null
- neutered: enum ('not', 'yes', 'unknown')
- avatar_url: string (2D形象URL)
- status: enum ('active', 'sleeping', 'eating')
- created_at: timestamp
- updated_at: timestamp
```

#### pet_photos（宠物照片表）
```sql
- id: uuid (主键)
- pet_id: uuid (外键 → pets)
- type: enum ('full_body', 'face')
- original_url: string (原图URL)
- created_at: timestamp
```

#### avatar_jobs（形象生成任务表）
```sql
- id: uuid (主键)
- pet_id: uuid (外键 → pets)
- status: enum ('pending', 'processing', 'completed', 'failed')
- asset_id: string (前端上传标识)
- lovart_design_id: string | null (Lovart任务ID)
- result_url: string | null (生成结果URL)
- error_message: string | null
- created_at: timestamp
- completed_at: timestamp | null
```

#### reminders（提醒表）
```sql
- id: uuid (主键)
- pet_id: uuid (外键 → pets)
- type: enum ('vaccine', 'deworm', 'neuter', 'exercise')
- title: string
- scheduled_at: timestamp
- is_completed: boolean
- created_at: timestamp
```

#### chat_messages（聊天记录表）
```sql
- id: uuid (主键)
- user_id: uuid (外键 → users)
- pet_id: uuid (外键 → pets)
- role: enum ('user', 'assistant')
- content: text
- created_at: timestamp
```

#### pet_status_logs（宠物状态记录表）
```sql
- id: uuid (主键)
- pet_id: uuid (外键 → pets)
- status: enum ('active', 'sleeping', 'eating')
- sleep_duration: int | null (分钟)
- activity_level: int | null (活跃度0-100)
- recorded_at: timestamp
```

---

## 4. 图片存储策略

### 4.1 存储目录结构

```
Supabase Storage/
├── originals/           # 用户上传原图
│   ├── {user_id}/
│   │   ├── {pet_id}_full_body.jpg
│   │   └── {pet_id}_face.jpg
│
└── avatars/             # AI生成2D形象
    ├── {user_id}/
    │   └── {pet_id}_avatar.png
```

### 4.2 图片处理规范

| 类型 | 格式 | 最大尺寸 | 压缩 |
|------|------|----------|------|
| 原图 | JPG | 5MB | 上传时压缩至1080px宽 |
| 2D形象 | PNG | 2MB | 保持原图质量 |

### 4.3 2D形象生成流程（异步）

```
1. 前端上传图片 → 获取 asset_id
2. 创建 AvatarJob（status = pending）
3. 异步触发 AI 生成（队列 / 延迟任务）
4. AI 返回结果 → 更新 Job 状态
5. 前端轮询 / 刷新查看结果
```

---

### 4.3 后端代理服务（Hono）

#### 4.3.1 为什么需要后端代理

前端（浏览器）直接调用 Lovart API 会遇到 **CORS 跨域限制**，导致请求被浏览器拦截。解决方案是在前端和 Lovart API 之间增加一层后端代理：

```
前端 → 后端代理(/api/lovart/*) → Lovart API
```

**好处：**
- 解决 CORS 跨域问题
- API Key 不暴露在前端代码中
- 后端可以做缓存、限流、错误处理
- 支持模拟模式（开发/测试时使用）

#### 4.3.2 API 路由设计

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/lovart/user` | GET | 查询 Lovart 用户信息 |
| `/api/lovart/generate` | POST | 生成2D形象 |
| `/api/lovart/status/:id` | GET | 查询生成状态 |
| `/api/upload` | POST | 上传图片（base64） |
| `/uploads/:filename` | GET | 获取上传的图片 |

#### 4.3.3 运行模式

| 模式 | 触发条件 | 行为 |
|------|----------|------|
| 真实模式 | Lovart API 可访问 | 直接转发请求到 Lovart API |
| 模拟模式 | Lovart API 不可访问 | 返回模拟数据，前端流程完整可用 |

#### 4.3.4 启动方式

```bash
cd pet-app
npm install
node server.js
# 服务运行在 http://localhost:3001
```

环境变量配置（`.env.local`）：
```
LOVART_API_KEY=sk_xxx
LOVART_BASE_URL=https://api.lovart.pro
PORT=3001
```

---

### 4.4 Lovart API 集成方案

#### 4.4.1 API 基本信息

| 项目 | 内容 |
|------|------|
| **Base URL** | `https://api.lovart.pro` |
| **认证方式** | Bearer Token |
| **推荐模型** | `nano-banana-pro` |

#### 4.4.2 认证头

```
Authorization: Bearer {YOUR_LOVART_API_KEY}
```

#### 4.4.3 核心端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/v1/design/generate` | POST | 生成2D宠物形象 |
| `/v1/design/{id}` | GET | 查询生成状态 |
| `/v1/image/upload` | POST | 上传参考图片 |
| `/v1/image/enhance` | POST | 图片增强 |

#### 4.4.4 宠物形象生成请求示例

**请求：**
```json
POST /v1/design/generate
Content-Type: application/json
Authorization: Bearer {API_KEY}

{
  "prompt": "A cute kawaii cartoon golden retriever dog avatar, big expressive sparkling eyes, happy friendly expression, soft pastel colors, clean white background, children's book illustration style, simple and clean design, perfect for app avatar",
  "model": "nano-banana-pro",
  "width": 1024,
  "height": 1024,
  "style": "artistic",
  "num_outputs": 1
}
```

**响应：**
```json
{
  "id": "design_pet_avatar_001",
  "status": "processing",
  "estimated_time": 15,
  "created_at": "2026-04-14T10:00:00Z"
}
```

#### 4.4.5 查询生成状态

**请求：**
```
GET /v1/design/design_pet_avatar_001
Authorization: Bearer {API_KEY}
```

**响应（完成）：**
```json
{
  "id": "design_pet_avatar_001",
  "status": "completed",
  "output": {
    "images": [
      {
        "url": "https://cdn.lovart.pro/output/design_pet_avatar_001.png",
        "width": 1024,
        "height": 1024
      }
    ]
  },
  "created_at": "2026-04-14T10:00:00Z",
  "completed_at": "2026-04-14T10:00:15Z"
}
```

#### 4.4.6 宠物形象Prompt模板

| 宠物类型 | Prompt模板 |
|----------|-----------|
| **狗狗** | `A cute kawaii cartoon {breed} dog avatar, big expressive sparkling eyes, {expression} expression, soft pastel colors, clean white background, children's book illustration style, simple and clean design, perfect for app avatar` |
| **猫咪** | `A cute kawaii cartoon {breed} cat avatar, big round sparkling eyes, {expression} expression, soft pastel colors, clean white background, children's book illustration style, simple and clean design, perfect for app avatar` |
| **其他** | `A cute kawaii cartoon {animal_type} avatar, big expressive sparkling eyes, {expression} expression, soft pastel colors, clean white background, children's book illustration style, simple and clean design, perfect for app avatar` |

**变量说明：**
- `{breed}`: 品种（如 golden retriever, siamese, corgi）
- `{expression}`: 表情（happy, playful, calm, curious）
- `{animal_type}`: 动物类型（rabbit, hamster, parrot）

#### 4.4.7 服务端集成代码（Node.js）

```typescript
// services/lovart.ts
import axios from 'axios';

const LOVART_API_KEY = process.env.LOVART_API_KEY;
const LOVART_BASE_URL = 'https://api.lovart.pro';

const lovartClient = axios.create({
  baseURL: LOVART_BASE_URL,
  headers: {
    'Authorization': `Bearer ${LOVART_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * 生成宠物2D形象
 */
export async function generatePetAvatar(
  petType: 'dog' | 'cat' | 'other',
  breed: string,
  expression: string = 'happy'
): Promise<string> {
  // 构建prompt
  let prompt: string;
  if (petType === 'dog') {
    prompt = `A cute kawaii cartoon ${breed} dog avatar, big expressive sparkling eyes, ${expression} expression, soft pastel colors, clean white background, children's book illustration style, simple and clean design, perfect for app avatar`;
  } else if (petType === 'cat') {
    prompt = `A cute kawaii cartoon ${breed} cat avatar, big round sparkling eyes, ${expression} expression, soft pastel colors, clean white background, children's book illustration style, simple and clean design, perfect for app avatar`;
  } else {
    prompt = `A cute kawaii cartoon ${breed} avatar, big expressive sparkling eyes, ${expression} expression, soft pastel colors, clean white background, children's book illustration style, simple and clean design, perfect for app avatar`;
  }

  // 调用Lovart API
  const response = await lovartClient.post('/v1/design/generate', {
    prompt,
    model: 'nano-banana-pro',
    width: 1024,
    height: 1024,
    style: 'artistic',
    num_outputs: 1
  });

  return response.data.id; // 返回任务ID
}

/**
 * 查询生成状态
 */
export async function getAvatarStatus(designId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
}> {
  const response = await lovartClient.get(`/v1/design/${designId}`);
  const { status, output } = response.data;
  
  return {
    status,
    url: status === 'completed' ? output.images[0].url : undefined
  };
}
```

#### 4.4.8 异步任务处理流程

```typescript
// 完整异步流程
async function processAvatarGeneration(petId: string, petType: string, breed: string) {
  // 1. 创建Job记录
  const job = await supabase
    .from('avatar_jobs')
    .insert({
      pet_id: petId,
      status: 'pending'
    })
    .select()
    .single();

  // 2. 调用Lovart API
  const designId = await generatePetAvatar(petType as any, breed);

  // 3. 更新Job状态
  await supabase
    .from('avatar_jobs')
    .update({
      status: 'processing',
      lovart_design_id: designId
    })
    .eq('id', job.data.id);

  // 4. 异步轮询检查状态
  pollAvatarStatus(job.data.id, designId);
}

// 轮询检查
async function pollAvatarStatus(jobId: string, designId: string) {
  const checkStatus = async () => {
    const { status, url } = await getAvatarStatus(designId);
    
    if (status === 'completed' && url) {
      // 下载图片并保存到Storage
      const avatarUrl = await downloadAndSaveAvatar(url);
      
      // 更新Job和Pet记录
      await supabase
        .from('avatar_jobs')
        .update({
          status: 'completed',
          result_url: avatarUrl,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
        
      await supabase
        .from('pets')
        .update({ avatar_url: avatarUrl })
        .eq('id', jobId);
        
      return;
    }
    
    if (status === 'failed') {
      await supabase
        .from('avatar_jobs')
        .update({ status: 'failed' })
        .eq('id', jobId);
      return;
    }
    
    // 继续轮询
    setTimeout(checkStatus, 5000);
  };
  
  checkStatus();
}
```

#### 4.4.9 速率限制

| 套餐 | 每分钟请求 | 每日限制 | 并发数 |
|------|-----------|---------|--------|
| Free | 10 | 100 | 2 |
| Pro | 60 | 5,000 | 10 |
| Enterprise | 300 | 无限制 | 50 |

#### 4.4.10 错误处理

| 状态码 | 含义 | 处理建议 |
|--------|------|---------|
| 200 | 成功 | - |
| 400 | 参数错误 | 检查请求参数 |
| 401 | 认证失败 | 检查API Key |
| 429 | 频率限制 | 增加重试间隔 |
| 500 | 服务器错误 | 稍后重试 |

---

## 5. API 接口设计

### 5.1 认证相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /auth/wechat | POST | 微信登录，返回JWT |
| /auth/phone/bind | POST | 绑定手机号 |

### 5.2 宠物相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /pets | GET | 获取用户宠物列表 |
| /pets | POST | 创建宠物 |
| /pets/:id | PUT | 更新宠物信息 |
| /pets/:id/avatar | POST | 上传照片触发形象生成 |
| /pets/:id/avatar/status | GET | 查询生成状态 |

### 5.3 语音相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /pets/:id/voice/upload | POST | 上传语音样本 |
| /pets/:id/voice/synthesize | POST | 合成语音（文本→语音） |

### 5.4 AI Agent

| 接口 | 方法 | 说明 |
|------|------|------|
| /chat | POST | 发送消息给AI Agent |
| /chat/history | GET | 获取聊天记录 |

---

## 6. 安全与风控

### 6.1 基础安全

- [x] API Key 永不进前端代码（使用.env）
- [x] Key 不提交进 Git 仓库（.gitignore配置）
- [x] 服务端必须做鉴权（Token验证）
- [x] 数据库操作必须带当前用户ID过滤

### 6.2 上传安全

- [x] 图片大小限制：单张最大5MB
- [x] 上传频率限制：每分钟最多5次
- [x] 单用户并发 Job 数限制：最多3个
- [x] pet_id 必须属于当前 user（权限校验）
- [x] 基础图片内容审核（敏感图过滤）

### 6.3 敏感操作频率限制

| 操作 | 限制 |
|------|------|
| 登录接口 | 同IP每分钟10次 |
| 发送验证码 | 同手机号每小时5次 |
| AI形象生成 | 每用户每日3次（MVP） |

---

## 7. 状态管理

### 7.1 全局状态（Zustand）

```typescript
interface AppState {
  // 用户信息
  user: User | null;
  isLoggedIn: boolean;
  
  // 当前宠物
  currentPet: Pet | null;
  pets: Pet[];
  
  // 宠物状态
  petStatus: {
    status: 'active' | 'sleeping' | 'eating';
    sleepDuration: number;
    lastUpdated: Date;
  };
  
  // AI生成状态
  avatarJob: AvatarJob | null;
  
  // 聊天
  chatMessages: Message[];
}
```

---

## 8. 目录结构

```
src/
├── components/           # 可复用UI组件
│   ├── ui/              # 基础UI组件（Button, Input等）
│   └── common/          # 业务通用组件（PetCard, Avatar等）
│
├── screens/             # 页面组件
│   ├── auth/            # 登录相关
│   │   └── LoginScreen.tsx
│   ├── onboarding/      # 添加宠物流程
│   │   ├── PetInfoScreen.tsx
│   │   ├── PhotoUploadScreen.tsx
│   │   ├── AvatarGenerateScreen.tsx
│   │   ├── VoiceRecordScreen.tsx
│   │   ├── ResponseWordScreen.tsx
│   │   └── VoiceConfirmScreen.tsx
│   ├── home/            # 主页
│   │   └── HomeScreen.tsx
│   ├── chat/            # AI Agent对话
│   │   └── ChatScreen.tsx
│   └── profile/         # 我的
│       └── ProfileScreen.tsx
│
├── services/            # API服务
│   ├── api.ts           # API客户端配置
│   ├── auth.ts          # 认证相关
│   ├── pets.ts          # 宠物相关
│   ├── lovart.ts        # Lovart AI形象生成
│   ├── voice.ts         # 语音相关
│   └── chat.ts          # AI对话相关
│
├── hooks/               # 业务逻辑Hooks
│   ├── useAuth.ts
│   ├── usePets.ts
│   ├── useAvatar.ts
│   └── useVoice.ts
│
├── store/               # 状态管理
│   └── index.ts
│
├── types/               # 类型定义
│   └── index.ts
│
├── utils/               # 工具函数
│   ├── storage.ts
│   ├── validators.ts
│   └── formatters.ts
│
└── constants/           # 常量
    └── index.ts
```

---

## 9. 待决策事项

| 事项 | 状态 | 备注 |
|------|------|------|
| 宠物专属音色方案 | 待补充 | 需确认讯飞TTS自定义音色能力 |
| 硬件设备对接协议 | 待补充 | 蓝牙/Wi-Fi数据格式 |
| AI生成风格定义 | ✅ 已完成 | 使用Lovart nano-banana-pro模型，kawaii卡通风格 |
| 推送服务选型 | 待确定 | 微信服务通知 vs 第三方推送 |

---

## 10. 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2025-03-24 | v0.1 | 初始架构设计 |
| 2025-04-14 | v0.2 | 更新AI生成方案：Kimi → Lovart API，添加完整集成文档 |
