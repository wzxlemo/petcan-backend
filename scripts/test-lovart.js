/**
 * Lovart API 测试脚本
 * 
 * 使用方法:
 * 1. 确保已配置 .env.local 文件
 * 2. 运行: node scripts/test-lovart.js
 */

require('dotenv').config({ path: '.env.local' });

const LOVART_API_KEY = process.env.LOVART_API_KEY;
const LOVART_BASE_URL = process.env.LOVART_BASE_URL || 'https://api.lovart.pro';

console.log('🐾 宠物能APP - Lovart API 测试\n');
console.log('================================\n');

// 检查配置
if (!LOVART_API_KEY) {
  console.error('❌ 错误: LOVART_API_KEY 未配置');
  process.exit(1);
}

console.log('📋 配置信息:');
console.log(`   Base URL: ${LOVART_BASE_URL}`);
console.log(`   API Key: ${LOVART_API_KEY.substring(0, 10)}...${LOVART_API_KEY.substring(LOVART_API_KEY.length - 5)}\n`);

// 测试1: 获取用户信息
async function testGetUserInfo() {
  console.log('🧪 测试1: 获取用户信息...');
  try {
    const response = await fetch(`${LOVART_BASE_URL}/v1/user/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LOVART_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 成功!');
      console.log(`   用户ID: ${data.id}`);
      console.log(`   套餐: ${data.plan}`);
      console.log(`   剩余额度: ${data.credits_remaining}`);
      console.log(`   已用额度: ${data.credits_used}\n`);
      return true;
    } else {
      console.error(`❌ 失败: HTTP ${response.status}`);
      const error = await response.text();
      console.error(`   错误: ${error}\n`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 请求失败: ${error.message}\n`);
    return false;
  }
}

// 测试2: 生成宠物形象
async function testGeneratePetAvatar() {
  console.log('🧪 测试2: 生成宠物形象...');
  console.log('   Prompt: A cute kawaii cartoon golden retriever dog avatar...');
  
  try {
    const response = await fetch(`${LOVART_BASE_URL}/v1/design/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVART_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'A cute kawaii cartoon golden retriever dog avatar, big expressive sparkling eyes, happy friendly expression, soft pastel colors, clean white background, children book illustration style, simple and clean design, perfect for app avatar',
        model: 'nano-banana-pro',
        width: 1024,
        height: 1024,
        style: 'artistic',
        num_outputs: 1
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 成功!');
      console.log(`   任务ID: ${data.id}`);
      console.log(`   状态: ${data.status}`);
      console.log(`   预计时间: ${data.estimated_time}秒\n`);
      return data.id;
    } else {
      console.error(`❌ 失败: HTTP ${response.status}`);
      const error = await response.text();
      console.error(`   错误: ${error}\n`);
      return null;
    }
  } catch (error) {
    console.error(`❌ 请求失败: ${error.message}\n`);
    return null;
  }
}

// 测试3: 查询生成状态
async function testGetDesignStatus(designId) {
  if (!designId) return false;
  
  console.log('🧪 测试3: 查询生成状态...');
  console.log(`   任务ID: ${designId}`);
  
  try {
    const response = await fetch(`${LOVART_BASE_URL}/v1/design/${designId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LOVART_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 成功!');
      console.log(`   状态: ${data.status}`);
      if (data.status === 'completed' && data.output) {
        console.log(`   图片URL: ${data.output.images[0].url}`);
      }
      console.log('');
      return true;
    } else {
      console.error(`❌ 失败: HTTP ${response.status}\n`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 请求失败: ${error.message}\n`);
    return false;
  }
}

// 运行所有测试
async function runTests() {
  console.log('开始测试...\n');
  
  // 测试1
  const userInfoOk = await testGetUserInfo();
  
  // 测试2
  const designId = await testGeneratePetAvatar();
  
  // 测试3
  if (designId) {
    // 等待几秒再查询状态
    console.log('⏳ 等待5秒后查询状态...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await testGetDesignStatus(designId);
  }
  
  console.log('================================');
  console.log('🎉 测试完成!');
  console.log('\n下一步:');
  console.log('   1. 查看测试结果');
  console.log('   2. 如果所有测试通过，可以开始开发');
  console.log('   3. 参考 services/lovart.ts 集成到项目中');
}

runTests().catch(console.error);
