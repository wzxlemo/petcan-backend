/**
 * Petcan 数据库 Schema
 * 使用 Drizzle ORM + MySQL
 */

import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  json,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';

// ===== 用户表 =====
export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  openid: varchar('openid', { length: 128 }).notNull().unique(), // 微信OpenID
  unionid: varchar('unionid', { length: 128 }), // 微信UnionID
  nickname: varchar('nickname', { length: 64 }), // 微信昵称
  avatarUrl: varchar('avatar_url', { length: 512 }), // 微信头像
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ===== 宠物表 =====
export const pets = mysqlTable('pets', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull(), // 关联用户
  name: varchar('name', { length: 64 }).notNull(), // 宠物昵称
  type: mysqlEnum('type', ['cat', 'dog']).notNull(), // 宠物类型
  breed: varchar('breed', { length: 64 }).notNull(), // 品种
  gender: mysqlEnum('gender', ['male', 'female', 'unknown']).notNull(), // 性别
  birthday: varchar('birthday', { length: 32 }), // 生日（YYYY-MM-DD 或 "未知"）
  neutered: mysqlEnum('neutered', ['yes', 'no', 'unknown']).notNull(), // 绝育情况
  avatarUrl: varchar('avatar_url', { length: 512 }), // 生成的2D形象URL
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ===== 宠物照片表 =====
export const petPhotos = mysqlTable('pet_photos', {
  id: serial('id').primaryKey(),
  petId: int('pet_id').notNull(), // 关联宠物
  type: mysqlEnum('type', ['full', 'face']).notNull(), // 全身照 or 正脸照
  url: varchar('url', { length: 512 }).notNull(), // 图片URL
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

// ===== 语音设置表 =====
export const voiceSettings = mysqlTable('voice_settings', {
  id: serial('id').primaryKey(),
  petId: int('pet_id').notNull().unique(), // 关联宠物（一对一）
  callName: varchar('call_name', { length: 32 }).notNull(), // 应答称呼（妈妈/爸爸/主人等）
  wakeWord: varchar('wake_word', { length: 32 }).notNull(), // 唤醒词（宠物名字）
  recordedUrl: varchar('recorded_url', { length: 512 }), // 录音文件URL
  generatedVoiceUrl: varchar('generated_voice_url', { length: 512 }), // TTS生成的语音URL
  isActive: boolean('is_active').default(true), // 是否启用
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ===== 生成任务表（追踪AI生成状态） =====
export const generationJobs = mysqlTable('generation_jobs', {
  id: serial('id').primaryKey(),
  petId: int('pet_id').notNull(), // 关联宠物
  provider: mysqlEnum('provider', ['lovart', 'freepik', 'mock']).notNull(), // 使用的AI服务商
  externalJobId: varchar('external_job_id', { length: 128 }), // 外部任务ID
  status: mysqlEnum('status', ['pending', 'processing', 'completed', 'failed']).default('pending'),
  prompt: text('prompt'), // 使用的prompt
  resultUrl: varchar('result_url', { length: 512 }), // 生成结果URL
  errorMessage: text('error_message'), // 错误信息
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});
