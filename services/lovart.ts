/**
 * Lovart API 服务 - 宠物2D形象生成
 * 
 * 文档: https://lovart.pro/lovart-api
 * Base URL: https://api.lovart.pro
 */

import axios from 'axios';

// Lovart API 配置
const LOVART_API_KEY = process.env.LOVART_API_KEY;
const LOVART_BASE_URL = process.env.LOVART_BASE_URL || 'https://api.lovart.pro';

if (!LOVART_API_KEY) {
  throw new Error('LOVART_API_KEY is not defined in environment variables');
}

// 创建axios实例
const lovartClient = axios.create({
  baseURL: LOVART_BASE_URL,
  headers: {
    'Authorization': `Bearer ${LOVART_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30秒超时
});

// 宠物类型
export type PetType = 'dog' | 'cat' | 'other';

// 表情类型
export type ExpressionType = 'happy' | 'playful' | 'calm' | 'curious' | 'sleepy';

// 生成状态
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 构建宠物形象Prompt
 */
function buildPetPrompt(
  petType: PetType,
  breed: string,
  expression: ExpressionType = 'happy'
): string {
  const expressionMap: Record<ExpressionType, string> = {
    happy: 'happy friendly',
    playful: 'playful energetic',
    calm: 'calm peaceful',
    curious: 'curious inquisitive',
    sleepy: 'sleepy relaxed'
  };

  const expr = expressionMap[expression] || expressionMap.happy;

  if (petType === 'dog') {
    return `A cute kawaii cartoon ${breed} dog avatar, big expressive sparkling eyes, ${expr} expression, soft pastel colors, clean white background, children's book illustration style, simple and clean design, perfect for app avatar, high quality, detailed`;
  } else if (petType === 'cat') {
    return `A cute kawaii cartoon ${breed} cat avatar, big round sparkling eyes, ${expr} expression, soft pastel colors, clean white background, children's book illustration style, simple and clean design, perfect for app avatar, high quality, detailed`;
  } else {
    return `A cute kawaii cartoon ${breed} avatar, big expressive sparkling eyes, ${expr} expression, soft pastel colors, clean white background, children's book illustration style, simple and clean design, perfect for app avatar, high quality, detailed`;
  }
}

/**
 * 生成宠物2D形象
 * @param petType 宠物类型
 * @param breed 品种
 * @param expression 表情
 * @returns Lovart设计任务ID
 */
export async function generatePetAvatar(
  petType: PetType,
  breed: string,
  expression: ExpressionType = 'happy'
): Promise<string> {
  try {
    const prompt = buildPetPrompt(petType, breed, expression);

    const response = await lovartClient.post('/v1/design/generate', {
      prompt,
      model: 'nano-banana-pro',
      width: 1024,
      height: 1024,
      style: 'artistic',
      num_outputs: 1
    });

    return response.data.id;
  } catch (error) {
    console.error('Lovart generate error:', error);
    throw new Error('Failed to generate pet avatar');
  }
}

/**
 * 查询生成状态
 * @param designId Lovart设计任务ID
 * @returns 状态和结果URL
 */
export async function getAvatarStatus(
  designId: string
): Promise<{
  status: GenerationStatus;
  url?: string;
  error?: string;
}> {
  try {
    const response = await lovartClient.get(`/v1/design/${designId}`);
    const { status, output, error } = response.data;

    return {
      status,
      url: status === 'completed' ? output?.images?.[0]?.url : undefined,
      error
    };
  } catch (error) {
    console.error('Lovart status check error:', error);
    throw new Error('Failed to check avatar status');
  }
}

/**
 * 上传参考图片
 * @param imageBuffer 图片Buffer
 * @param filename 文件名
 * @returns 上传后的图片ID和URL
 */
export async function uploadReferenceImage(
  imageBuffer: Buffer,
  filename: string
): Promise<{ id: string; url: string }> {
  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer]);
    formData.append('file', blob, filename);
    formData.append('purpose', 'reference');

    const response = await lovartClient.post('/v1/image/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      id: response.data.id,
      url: response.data.url
    };
  } catch (error) {
    console.error('Lovart upload error:', error);
    throw new Error('Failed to upload reference image');
  }
}

/**
 * 增强图片质量
 * @param imageId 图片ID
 * @param upscaleFactor 放大倍数 (2x, 4x)
 * @returns 增强后的图片URL
 */
export async function enhanceImage(
  imageId: string,
  upscaleFactor: 2 | 4 = 2
): Promise<string> {
  try {
    const response = await lovartClient.post('/v1/image/enhance', {
      image_id: imageId,
      operations: ['upscale', 'denoise'],
      upscale_factor: upscaleFactor
    });

    return response.data.output.url;
  } catch (error) {
    console.error('Lovart enhance error:', error);
    throw new Error('Failed to enhance image');
  }
}

/**
 * 获取可用模型列表
 * @returns 模型列表
 */
export async function listModels(): Promise<Array<{
  id: string;
  name: string;
  type: string;
  styles: string[];
  max_resolution: number;
}>> {
  try {
    const response = await lovartClient.get('/v1/models');
    return response.data.models;
  } catch (error) {
    console.error('Lovart list models error:', error);
    throw new Error('Failed to list models');
  }
}

/**
 * 获取用户信息和使用统计
 * @returns 用户信息和配额
 */
export async function getUserInfo(): Promise<{
  id: string;
  plan: string;
  credits_remaining: number;
  credits_used: number;
}> {
  try {
    const response = await lovartClient.get('/v1/user/me');
    return response.data;
  } catch (error) {
    console.error('Lovart user info error:', error);
    throw new Error('Failed to get user info');
  }
}

/**
 * 带重试的状态查询
 * @param designId 设计任务ID
 * @param maxRetries 最大重试次数
 * @param retryInterval 重试间隔（毫秒）
 * @returns 最终结果
 */
export async function pollAvatarStatusWithRetry(
  designId: string,
  maxRetries: number = 60,
  retryInterval: number = 5000
): Promise<{ status: GenerationStatus; url?: string }> {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const check = async () => {
      try {
        const result = await getAvatarStatus(designId);

        if (result.status === 'completed') {
          resolve({ status: 'completed', url: result.url });
          return;
        }

        if (result.status === 'failed') {
          reject(new Error(result.error || 'Avatar generation failed'));
          return;
        }

        retries++;
        if (retries >= maxRetries) {
          reject(new Error('Max retries exceeded'));
          return;
        }

        setTimeout(check, retryInterval);
      } catch (error) {
        reject(error);
      }
    };

    check();
  });
}

// 导出默认对象
export default {
  generatePetAvatar,
  getAvatarStatus,
  uploadReferenceImage,
  enhanceImage,
  listModels,
  getUserInfo,
  pollAvatarStatusWithRetry
};
