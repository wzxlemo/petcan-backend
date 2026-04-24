/**
 * "小能" AI 助手 - Kimi K2.5 对话服务
 * 通过 Moonshot API 接入 Kimi K2.5 模型
 * 当 API 不可用时，自动降级到模拟模式
 */

const axios = require('axios');

const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1';

// 检测是否使用模拟模式
const USE_MOCK = !KIMI_API_KEY || KIMI_API_KEY === 'your-kimi-api-key';

// 小能的 System Prompt（角色设定）
const XIAONENG_SYSTEM_PROMPT = `你是"小能"，一位专业的宠物健康管家助手。你的职责是帮助宠物主人科学养宠。

【核心能力】
1. 健康记录：当主人描述宠物状况时（如饮食、排便、精神状态），结构化记录到数据库
2. 疫苗管理：根据品种标准周期，提醒疫苗/驱虫/体检时间
3. 品种知识：提供针对性的养护建议
4. 异常预警：识别异常状况并建议就医

【品种知识库】
- 金毛：易患髋关节发育不良，建议控制体重，避免剧烈运动，每年核心疫苗
- 拉布拉多：贪吃易胖，注意控制饮食，皮肤敏感
- 泰迪：髌骨脱位高发，避免频繁站立，心脏病风险
- 布偶猫：心脏肥厚风险，建议定期心超，温顺粘人
- 英短：易胖体质，注意控制饮食，多囊肾风险
- 美短：活泼好动，心脏病筛查建议

【对话风格】
- 温暖亲切，像一位有经验的宠物医生朋友
- 适当用 emoji 增加亲和力
- 主动关心，不只被动回答
- 每次回复控制在 100 字以内，简洁明了

【数据记录】
当主人提到具体事件时，用 JSON 格式记录：
{
  "record": true,
  "type": "diet|exercise|poop|pee|symptom|vaccine|medication|sleep",
  "description": "事件描述",
  "severity": "normal|mild|moderate|severe"
}

【首次对话开场白】
如果是对话开头，主动询问：
"你好！我是小能，你的宠物健康管家 🐾\n\n最近 [宠物名字] 状态怎么样？睡眠、饮食、排便都正常吗？疫苗上次是什么时候打的呀？"
`;

// 创建 Kimi 客户端
const kimiClient = axios.create({
  baseURL: KIMI_BASE_URL,
  headers: {
    'Authorization': `Bearer ${KIMI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

/**
 * 模拟回复（当 Kimi API 不可用时）
 */
function getMockReply(message, petInfo) {
  const petName = petInfo.name || '宠物';
  const msg = message.toLowerCase();
  
  // 关键词匹配
  if (msg.includes('睡') || msg.includes('sleep')) {
    return `收到！${petName}昨晚睡了多久呀？\n\n正常成犬每天需要 12-14 小时睡眠。如果睡眠不足，可能会影响免疫力哦 😴`;
  }
  if (msg.includes('吃') || msg.includes('饭') || msg.includes('diet')) {
    return `好的，已记录 ${petName} 的饮食情况！\n\n金毛容易贪吃，建议定时定量喂养，避免肥胖和髋关节压力 🍖`;
  }
  if (msg.includes('拉') || msg.includes('便') || msg.includes('poop')) {
    return `收到！便便情况很重要～\n\n正常便便应该是成形、棕黄色的。如果拉稀或便秘超过 24 小时，建议就医检查 💩`;
  }
  if (msg.includes('疫苗') || msg.includes('vaccine')) {
    return `${petName} 上次疫苗是什么时候打的呀？\n\n金毛每年需要接种核心疫苗（犬瘟、细小、腺病毒）。我可以帮你算下次提醒时间 💉`;
  }
  if (msg.includes('运动') || msg.includes('遛') || msg.includes('exercise')) {
    return `运动很重要！金毛每天需要 30-60 分钟散步。\n\n注意不要剧烈运动，避免髋关节损伤 🎾`;
  }
  if (msg.includes('洗澡') || msg.includes('bath')) {
    return `金毛建议 7-10 天洗一次澡，太频繁会伤皮肤～\n\n已为你记录，到时间会提醒 ⏰`;
  }
  if (msg.includes('你好') || msg.includes('hi') || msg.includes('hello')) {
    return `你好！我是小能 🐾\n\n最近 ${petName} 状态怎么样？\n• 睡眠、饮食、排便都正常吗？\n• 疫苗上次是什么时候打的？\n• 最近有没有异常状况？`;
  }
  
  // 默认回复
  return `收到！已帮 ${petName} 记录下来 📋\n\n我会持续关注 ta 的健康状况。有其他问题随时问我！`;
}

/**
 * 发送消息给小能
 * @param {string} message - 用户消息
 * @param {Array} history - 历史对话 [{role, content}]
 * @param {Object} petInfo - 宠物信息 {name, type, breed, age, gender}
 * @returns {Object} {reply, record}
 */
async function chatWithXiaoneng(message, history = [], petInfo = {}) {
  // 模拟模式
  if (USE_MOCK) {
    console.log('🤖 [模拟模式] 小能回复');
    const reply = getMockReply(message, petInfo);
    
    // 尝试提取记录
    let record = null;
    if (message.includes('拉') || message.includes('便')) {
      record = { type: 'poop', description: message, severity: 'normal' };
    } else if (message.includes('吃') || message.includes('饭')) {
      record = { type: 'diet', description: message, severity: 'normal' };
    } else if (message.includes('睡')) {
      record = { type: 'sleep', description: message, severity: 'normal' };
    } else if (message.includes('疫苗')) {
      record = { type: 'vaccine', description: message, severity: 'normal' };
    }
    
    return { reply, record };
  }

  // 真实 Kimi API 调用
  try {
    let systemPrompt = XIAONENG_SYSTEM_PROMPT;
    if (petInfo.name) {
      systemPrompt = systemPrompt.replace(/\[宠物名字\]/g, petInfo.name);
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    const response = await kimiClient.post('/chat/completions', {
      model: 'kimi-k2.5',
      messages: messages,
      max_tokens: 500
    });

    const reply = response.data.choices[0].message.content;
    
    // 尝试从回复中提取 JSON 记录
    let record = null;
    try {
      const jsonMatch = reply.match(/\{[\s\S]*"record"\s*:\s*true[\s\S]*\}/);
      if (jsonMatch) {
        record = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // 解析失败，忽略
    }

    return { reply, record };

  } catch (error) {
    console.error('小能对话失败:', error.message);
    // 如果 API 调用失败，降级到模拟
    const reply = getMockReply(message, petInfo);
    return { reply, record: null };
  }
}

/**
 * 生成首次对话开场白
 * @param {Object} petInfo - 宠物信息
 * @returns {string} 开场白
 */
function generateGreeting(petInfo = {}) {
  const { name = '宠物', type = '宠物', breed = '' } = petInfo;
  
  return `你好！我是小能，你的宠物健康管家 🐾

最近 ${name} 状态怎么样？

我来帮你记录一下：
• 睡眠、饮食、排便都正常吗？
• 疫苗上次是什么时候打的呀？
• 最近有没有异常状况？

有任何问题都可以随时问我！`;
}

module.exports = {
  chatWithXiaoneng,
  generateGreeting
};
