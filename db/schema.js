/**
 * Petcan 数据库 Schema - Supabase PostgreSQL 版本
 */

const {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
} = require('drizzle-orm/pg-core');

// ===== 枚举类型 =====
const petTypeEnum = pgEnum('pet_type', ['cat', 'dog']);
const genderEnum = pgEnum('gender', ['male', 'female', 'unknown']);
const neuteredEnum = pgEnum('neutered', ['yes', 'no', 'unknown']);
const photoTypeEnum = pgEnum('photo_type', ['full', 'face']);
const providerEnum = pgEnum('provider', ['lovart', 'freepik', 'mock']);
const jobStatusEnum = pgEnum('job_status', ['pending', 'processing', 'completed', 'failed']);

// ===== 用户表 =====
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  openid: varchar('openid', { length: 128 }).notNull().unique(),
  unionid: varchar('unionid', { length: 128 }),
  nickname: varchar('nickname', { length: 64 }),
  avatarUrl: varchar('avatar_url', { length: 512 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ===== 宠物表 =====
const pets = pgTable('pets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 64 }).notNull(),
  type: petTypeEnum('type').notNull(),
  breed: varchar('breed', { length: 64 }).notNull(),
  gender: genderEnum('gender').notNull(),
  birthday: varchar('birthday', { length: 32 }),
  neutered: neuteredEnum('neutered').notNull(),
  avatarUrl: varchar('avatar_url', { length: 512 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ===== 宠物照片表 =====
const petPhotos = pgTable('pet_photos', {
  id: serial('id').primaryKey(),
  petId: integer('pet_id').notNull(),
  type: photoTypeEnum('type').notNull(),
  url: varchar('url', { length: 512 }).notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

// ===== 语音设置表 =====
const voiceSettings = pgTable('voice_settings', {
  id: serial('id').primaryKey(),
  petId: integer('pet_id').notNull().unique(),
  callName: varchar('call_name', { length: 32 }).notNull(),
  wakeWord: varchar('wake_word', { length: 32 }).notNull(),
  recordedUrl: varchar('recorded_url', { length: 512 }),
  generatedVoiceUrl: varchar('generated_voice_url', { length: 512 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ===== 生成任务表 =====
const generationJobs = pgTable('generation_jobs', {
  id: serial('id').primaryKey(),
  petId: integer('pet_id').notNull(),
  provider: providerEnum('provider').notNull(),
  externalJobId: varchar('external_job_id', { length: 128 }),
  status: jobStatusEnum('status').default('pending'),
  prompt: text('prompt'),
  resultUrl: varchar('result_url', { length: 512 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

module.exports = {
  users,
  pets,
  petPhotos,
  voiceSettings,
  generationJobs,
  petTypeEnum,
  genderEnum,
  neuteredEnum,
  photoTypeEnum,
  providerEnum,
  jobStatusEnum,
};
