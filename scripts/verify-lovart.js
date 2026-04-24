/**
 * Lovart API 配置验证脚本
 * 
 * 使用方法:
 * 1. 确保已配置 .env.local 文件
 * 2. 运行: node scripts/verify-lovart.js
 */

require('dotenv').config({ path: '.env.local' });

const LOVART_API_KEY = process.env.LOVART_API_KEY;
const LOVART_BASE_URL = process.env.LOVART_BASE_URL || 'https://api.lovart.pro';

async function verifyLovartConfig() {
  console.log('🔍 正在验证 Lovart API 配置...\n');

  // 1. 检查 API Key 是否存在
  if (!LOVART_API_KEY || LOVART_API_KEY === 'YOUR_LOVART_API_KEY_HERE') {
    console.error('❌ 错误: LOVART_API_KEY 未配置');
    console.log('💡 请在 .env.local 文件中设置您的 API Key');
    console.log('   格式: LOVART_API_KEY=your-actual-api-key\n');
    process.exit(1);
  }

  // 2. 检查 API Key 格式
  if (LOVART_API_KEY.length < 20) {
    console.error('❌ 错误: LOVART_API_KEY 格式不正确');
    console.log('💡 API Key 通常是一个较长的字符串，请检查是否复制完整\n');
    process.exit(1);
  }

  console.log('✅ API Key 已配置');
  console.log(`   Base URL: ${LOVART_BASE_URL}`);
  console.log(`   API Key: ${LOVART_API_KEY.substring(0, 10)}...${LOVART_API_KEY.substring(LOVART_API_KEY.length - 5)}\n`);

  // 3. 测试 API 连接
  try {
    console.log('🌐 正在测试 API 连接...');
    
    const response = await fetch(`${LOVART_BASE_URL}/v1/user/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LOVART_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API 连接成功！\n');
      console.log('📊 账户信息:');
      console.log(`   用户ID: ${data.id}`);
      console.log(`   套餐: ${data.plan}`);
      console.log(`   剩余额度: ${data.credits_remaining}`);
      console.log(`   已用额度: ${data.credits_used}\n`);
      
      // 4. 测试生成一个简单图片
      console.log('🎨 正在测试图片生成...');
      const genResponse = await fetch(`${LOVART_BASE_URL}/v1/design/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVART_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: 'A simple cute cartoon dog avatar, kawaii style, white background',
          model: 'nano-banana-pro',
          width: 512,
          height: 512,
          num_outputs: 1
        })
      });

      if (genResponse.ok) {
        const genData = await genResponse.json();
        console.log('✅ 图片生成请求成功！');
        console.log(`   任务ID: ${genData.id}`);
        console.log(`   状态: ${genData.status}`);
        console.log(`   预计时间: ${genData.estimated_time}秒\n`);
        
        console.log('🎉 所有验证通过！Lovart API 配置正确。\n');
        console.log('下一步:');
        console.log('   1. 运行 npm install 安装依赖');
        console.log('   2. 运行 npm run dev 启动开发服务器');
        console.log('   3. 开始开发您的宠物能APP！\n');
      } else {
        const error = await genResponse.text();
        console.error('❌ 图片生成测试失败');
        console.error(`   错误: ${error}\n`);
        process.exit(1);
      }
    } else {
      const error = await response.text();
      console.error('❌ API 连接失败');
      console.error(`   状态码: ${response.status}`);
      console.error(`   错误: ${error}\n`);
      console.log('💡 可能的解决方案:');
      console.log('   1. 检查 API Key 是否正确');
      console.log('   2. 确认您的 Lovart 账户是否激活');
      console.log('   3. 检查网络连接\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 网络请求失败');
    console.error(`   错误: ${error.message}\n`);
    console.log('💡 可能的解决方案:');
    console.log('   1. 检查网络连接');
    console.log('   2. 如果使用代理，请配置代理设置');
    console.log('   3. 确认 Base URL 是否正确\n');
    process.exit(1);
  }
}

verifyLovartConfig();
