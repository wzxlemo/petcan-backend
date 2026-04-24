
/**
 * ============================================================
 * Petcan 宠物音色参数计算引擎 (Pet Voice Engine)
 * ============================================================
 * 
 * 功能：根据宠物的品种、年龄、性别、绝育情况计算TTS语音参数
 * 输出：pitch(音调百分比)、speed(语速)、timbre_desc(音色描述词)
 */

// ===== 常量定义 =====
const BASE_PITCH = 100;        // 基准音调 (成年雄性中型犬)
const BASE_SPEED = 100;        // 基准语速

// ===== 品种基线映射 =====
const BREED_BASE = {
  // 小型犬 (音调偏高)
  'poodle':       { pitch: +15, size: 'small' },
  'chihuahua':    { pitch: +20, size: 'small' },
  'pomeranian':   { pitch: +18, size: 'small' },
  'yorkshire':    { pitch: +15, size: 'small' },

  // 中型犬 (基准)
  'golden':       { pitch: 0,   size: 'medium' },
  'labrador':     { pitch: 0,   size: 'medium' },
  'shiba':        { pitch: -2,  size: 'medium' },
  'corgi':        { pitch: +5,  size: 'medium' },

  // 大型犬 (音调偏低)
  'german':       { pitch: -10, size: 'large' },
  'rottweiler':   { pitch: -12, size: 'large' },
  'husky':        { pitch: -8,  size: 'large' },

  // 猫 (默认偏高)
  'persian':      { pitch: +10, size: 'cat' },
  'british':      { pitch: +8,  size: 'cat' },
  'ragdoll':      { pitch: +12, size: 'cat' },
  'siamese':      { pitch: +15, size: 'cat' },
  'bengal':       { pitch: +5,  size: 'cat' },
  'munchkin':     { pitch: +18, size: 'cat' },
};

// ===== 年龄计算 =====
function calcAgeFactor(birthdayStr) {
  // birthdayStr: "2024-03" 或 "2020-06-15" 或 "未知"

  if (birthdayStr === '未知') {
    return { pitch: 0, label: '未知年龄', months: null };
  }

  // 解析年月
  const parts = birthdayStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) || 1;

  const birthDate = new Date(year, month - 1, 1);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - birthDate.getFullYear()) * 12 
                    + (now.getMonth() - birthDate.getMonth());

  // 年龄映射到音调
  let agePitch = 0;
  let label = '';

  if (monthsDiff < 6) {
    agePitch = +25;        // 幼年 (0-6月) - 很高
    label = '幼年';
  } else if (monthsDiff < 12) {
    agePitch = +15;        // 少年 (6-12月)
    label = '少年';
  } else if (monthsDiff < 24) {
    agePitch = +5;         // 青年 (1-2岁)
    label = '青年';
  } else if (monthsDiff < 84) {
    agePitch = 0;          // 成年 (2-7岁) - 基准
    label = '成年';
  } else if (monthsDiff < 120) {
    agePitch = -5;         // 中年 (7-10岁)
    label = '中年';
  } else {
    agePitch = -15;        // 老年 (10岁+) - 偏低
    label = '老年';
  }

  return { pitch: agePitch, label, months: monthsDiff };
}

// ===== 性别因子 =====
const GENDER_FACTOR = {
  'male':   { pitch: 0,   label: '雄性' },
  'female': { pitch: +5,  label: '雌性' },
};

// ===== 绝育因子 =====
const NEUTER_FACTOR = {
  'yes': {
    'male':   { pitch: +10, label: '绝育雄性' },   // 雄性激素下降，声音变柔和
    'female': { pitch: +3,  label: '绝育雌性' },   // 变化较小
  },
  'no': {
    'male':   { pitch: 0,   label: '未绝育雄性' },
    'female': { pitch: 0,   label: '未绝育雌性' },
  },
  'unknown': {
    'male':   { pitch: +5,  label: '未知绝育状态' },
    'female': { pitch: +2,  label: '未知绝育状态' },
  },
};

// ===== 主计算函数 =====
function calculateVoiceParams(pet) {
  const { type, breed, gender, birthday, neutered } = pet;

  // 1. 品种基线
  const breedBase = BREED_BASE[breed] || { pitch: 0, size: 'medium' };

  // 2. 年龄因子
  const ageFactor = calcAgeFactor(birthday);

  // 3. 性别因子
  const genderFactor = GENDER_FACTOR[gender] || { pitch: 0, label: '未知' };

  // 4. 绝育因子
  const neuterKey = neutered || 'unknown';
  const genderKey = gender || 'male';
  const neuterFactor = NEUTER_FACTOR[neuterKey]?.[genderKey] || { pitch: 0, label: '' };

  // 5. 计算总音调
  const totalPitch = BASE_PITCH 
    + breedBase.pitch 
    + ageFactor.pitch 
    + genderFactor.pitch 
    + neuterFactor.pitch;

  // 6. 生成音色描述词（用于TTS Prompt）
  const timbreWords = generateTimbreWords({
    size: breedBase.size,
    ageLabel: ageFactor.label,
    genderLabel: genderFactor.label,
    neuterLabel: neuterFactor.label,
    totalPitch
  });

  // 7. 生成语速（年龄越小越快）
  let speed = BASE_SPEED;
  if (ageFactor.months !== null) {
    if (ageFactor.months < 12) speed += 10;      // 幼宠语速稍快
    if (ageFactor.months > 84) speed -= 5;      // 老宠语速稍慢
  }

  return {
    pitch: Math.round(totalPitch),           // 音调百分比 (100=基准)
    speed: Math.round(speed),                  // 语速百分比
    timbreDescription: timbreWords,             // 音色描述词
    factors: {
      breed: breedBase.pitch,
      age: ageFactor.pitch,
      gender: genderFactor.pitch,
      neuter: neuterFactor.pitch,
    }
  };
}

// ===== 音色描述词生成 =====
function generateTimbreWords({ size, ageLabel, genderLabel, neuterLabel, totalPitch }) {
  const words = [];

  // 体型描述
  if (size === 'small') words.push('清脆', '明亮');
  if (size === 'large') words.push('低沉', '浑厚');
  if (size === 'cat') words.push('柔软', '细腻');

  // 年龄描述
  if (ageLabel === '幼年') words.push('稚嫩', '活泼');
  if (ageLabel === '老年') words.push('稳重', '温和');

  // 性别+绝育描述
  if (genderLabel === '雄性' && neuterLabel.includes('绝育')) {
    words.push('柔和');
  }
  if (genderLabel === '雌性') {
    words.push('温柔');
  }

  // 音调范围描述
  if (totalPitch > 120) words.push('高音调');
  if (totalPitch < 90) words.push('低音调');

  return words.join('、');
}

// ===== 生成完整TTS Prompt =====
function generateTTSPrompt(pet, callName) {
  const voice = calculateVoiceParams(pet);

  const prompt = `一只${voice.factors.age > 0 ? '年轻的' : ''}${pet.type === 'dog' ? '狗狗' : '猫咪'}，
${voice.timbreDescription}的声音，
用${voice.factors.gender > 0 ? '温柔' : '亲切'}可爱的语气喊"${callName}"`;

  return {
    text: callName,
    prompt: prompt,
    voiceParams: voice
  };
}

// ===== 示例 =====
console.log('示例1: 幼年雌性未绝育泰迪');
console.log(calculateVoiceParams({
  type: 'dog', breed: 'poodle', gender: 'female', 
  birthday: '2024-06', neutered: 'no'
}));

console.log('\n示例2: 成年雄性已绝育金毛');
console.log(calculateVoiceParams({
  type: 'dog', breed: 'golden', gender: 'male', 
  birthday: '2020-01', neutered: 'yes'
}));

console.log('\n示例3: 老年雄性未绝育德牧');
console.log(calculateVoiceParams({
  type: 'dog', breed: 'german', gender: 'male', 
  birthday: '2015-03', neutered: 'no'
}));
