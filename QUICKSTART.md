# 🚀 宠物能APP - 快速开始指南

## ✅ 配置状态

| 配置项 | 状态 | 说明 |
|--------|------|------|
| Lovart API Key | ✅ 已配置 | Secret Key 已写入 .env.local |
| API 端点 | ✅ 已配置 | https://api.lovart.pro |
| 服务代码 | ✅ 已完成 | services/lovart.ts |
| 前端照片上传 | ✅ 已完成 | 支持相机/相册调用，文件校验，预览显示 |
| Lovart API集成 | ✅ 已完成 | 前端直接调用，生成状态轮询，错误处理 |
| 生成结果展示 | ✅ 已完成 | 成功/失败状态UI，支持重试 |

---

## 🔑 API 凭证信息

```
Access Key: ak_402309c6f4ef252d790e16ce4cf7aa46
Secret Key: sk_18abdc1d21fc716286478b460d5d740fddb00e9f511f1661c03b9a7179dc74ae
```

**认证方式**: Bearer Token
```
Authorization: Bearer sk_18abdc1d21fc716286478b460d5d740fddb00e9f511f1661c03b9a7179dc74ae
```

---

## 🧪 测试 API

### 方法1: 使用测试脚本

```bash
cd /mnt/okcomputer/output/pet-app
node scripts/test-lovart.js
```

### 方法2: 使用 cURL

```bash
# 获取用户信息
curl -X GET https://api.lovart.pro/v1/user/me \
  -H "Authorization: Bearer sk_18abdc1d21fc716286478b460d5d740fddb00e9f511f1661c03b9a7179dc74ae"

# 生成宠物形象
curl -X POST https://api.lovart.pro/v1/design/generate \
  -H "Authorization: Bearer sk_18abdc1d21fc716286478b460d5d740fddb00e9f511f1661c03b9a7179dc74ae" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cute kawaii cartoon golden retriever dog avatar, big expressive sparkling eyes, happy friendly expression, soft pastel colors, clean white background",
    "model": "nano-banana-pro",
    "width": 1024,
    "height": 1024,
    "num_outputs": 1
  }'
```

---

## 📦 使用 Lovart 服务

```typescript
import { generatePetAvatar, getAvatarStatus } from './services/lovart';

// 生成金毛犬形象
const designId = await generatePetAvatar('dog', 'golden retriever', 'happy');
// 返回: design_xxx

// 查询生成状态
const { status, url } = await getAvatarStatus(designId);
// status: 'pending' | 'processing' | 'completed' | 'failed'
```

---

## 🎨 宠物形象 Prompt 模板

### 狗狗
```
A cute kawaii cartoon {breed} dog avatar, big expressive sparkling eyes, {expression} expression, soft pastel colors, clean white background, children book illustration style, simple and clean design, perfect for app avatar
```

### 猫咪
```
A cute kawaii cartoon {breed} cat avatar, big round sparkling eyes, {expression} expression, soft pastel colors, clean white background, children book illustration style, simple and clean design, perfect for app avatar
```

**变量说明**:
- `{breed}`: 品种 (golden retriever, siamese, corgi 等)
- `{expression}`: 表情 (happy, playful, calm, curious)

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [ARCH.md](./ARCH.md) | 架构决策、API设计 |
| [PRD.md](./PRD.md) | 产品需求 |
| [Design.md](./Design.md) | UI设计规范 |
| [README.md](./README.md) | 项目说明 |

---

## 🛠️ 下一步

1. ✅ **测试 API 连接** - 运行 `node scripts/test-lovart.js`
2. 🔧 **安装依赖** - `npm install`
3. 🚀 **启动开发服务器** - `npm run dev`
4. 💻 **开始开发** - 参考 `services/lovart.ts` 集成到项目

---

## 📞 支持

- Lovart API 文档: https://lovart.pro/lovart-api
- 问题反馈: 在项目中创建 Issue
