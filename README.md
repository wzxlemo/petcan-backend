# 🐾 宠物能APP - 宠物智能小管家

<p align="center">
  <img src="https://via.placeholder.com/120x120/FF6B6B/FFFFFF?text=🐾" alt="宠物能Logo" width="120">
</p>

<p align="center">
  <strong>宠物智能小管家</strong> - 让每一只宠物都有专属AI陪伴
</p>

---

## 📋 项目简介

宠物能APP是一款面向宠物主人的智能管理应用，通过AI技术为每只宠物生成专属的2D卡通形象，并提供智能对话、健康提醒等功能。

### 核心功能

- 🎨 **AI形象生成** - 使用 Lovart API 生成专属2D卡通形象
- 🎤 **宠物专属音色** - 讯飞TTS合成宠物专属声音
- 💬 **AI智能对话** - 与宠物进行自然语言交流
- 📅 **健康提醒** - 疫苗、驱虫、运动等智能提醒
- 📊 **状态监测** - 实时查看宠物心情、睡眠、运动状态

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/pet-neng-app.git
cd pet-neng-app
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

✅ **已完成!** Lovart API Key 已配置。

```bash
# 如需查看配置
cat .env.local
```

### 4. 验证配置

```bash
# 测试 Lovart API 连接
node scripts/test-lovart.js
```

这个脚本会：
- ✅ 获取账户信息（套餐、剩余额度）
- ✅ 测试生成宠物形象
- ✅ 查询生成状态

### 5. 启动开发服务器

```bash
npm run dev
```

---

## 🔐 环境变量配置

### 必需配置

| 变量名 | 说明 | 获取地址 |
|--------|------|----------|
| `LOVART_API_KEY` | Lovart AI API Key | https://lovart.ai |

### 可选配置

| 变量名 | 说明 | 获取地址 |
|--------|------|----------|
| `SUPABASE_URL` | Supabase 项目URL | https://supabase.com |
| `SUPABASE_ANON_KEY` | Supabase 匿名Key | https://supabase.com |
| `WECHAT_APP_ID` | 微信AppID | https://open.weixin.qq.com |
| `IFLYTEK_APP_ID` | 讯飞AppID | https://www.xfyun.cn |

### 配置示例

```bash
# .env.local
LOVART_API_KEY=your-actual-lovart-api-key-here
LOVART_BASE_URL=https://api.lovart.pro

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

---

## 📁 项目结构

```
pet-app/
├── 📄 .env.local              # 本地环境变量（不提交Git）
├── 📄 .env.example            # 环境变量模板
├── 📄 .gitignore              # Git忽略配置
├── 📄 ARCH.md                 # 架构决策文档
├── 📄 PRD.md                  # 产品需求文档
├── 📄 Design.md               # UI设计规范
├── 📄 README.md               # 项目说明
│
├── 📁 scripts/                # 脚本工具
│   └── verify-lovart.js       # Lovart API验证脚本
│
├── 📁 services/               # API服务
│   ├── lovart.ts              # Lovart AI服务
│   ├── auth.ts                # 认证服务
│   ├── pets.ts                # 宠物服务
│   └── ...
│
└── 📁 src/                    # 源代码
    ├── components/            # 组件
    ├── screens/               # 页面
    ├── hooks/                 # Hooks
    ├── store/                 # 状态管理
    └── utils/                 # 工具函数
```

---

## 🤖 Lovart API 使用指南

### 生成宠物形象

```typescript
import { generatePetAvatar, getAvatarStatus } from './services/lovart';

// 生成金毛犬形象
const designId = await generatePetAvatar('dog', 'golden retriever', 'happy');

// 查询生成状态
const { status, url } = await getAvatarStatus(designId);
```

### Prompt 模板

| 宠物类型 | 示例 |
|----------|------|
| 狗狗 | `A cute kawaii cartoon golden retriever dog avatar, big expressive sparkling eyes, happy friendly expression, soft pastel colors, clean white background` |
| 猫咪 | `A cute kawaii cartoon siamese cat avatar, big round sparkling eyes, playful expression, soft pastel colors, clean white background` |

---

## 📚 文档索引

| 文档 | 说明 |
|------|------|
| [ARCH.md](./ARCH.md) | 架构决策、技术选型、API设计 |
| [PRD.md](./PRD.md) | 产品需求、功能规格、用户流程 |
| [Design.md](./Design.md) | UI设计规范、页面设计、交互说明 |

---

## 🛠️ 开发指南

### 添加新宠物

1. 填写宠物基本信息（昵称、品种、性别、出生日期）
2. 上传宠物照片
3. AI自动生成2D卡通形象
4. 录制宠物专属声音
5. 设置唤醒应答词

### API 限制

| 操作 | 限制 |
|------|------|
| AI形象生成 | 每用户每日3次 |
| 上传文件大小 | 单张最大5MB |
| 并发生成任务 | 最多3个 |

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<p align="center">
  Made with ❤️ for pets
</p>
