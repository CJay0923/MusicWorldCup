// src/utils/text.js
// 共享文本工具：歌曲名归一化、去重 key、展示名清洗
// 照搬 music-cup api.js 的 baseKey / displayName 实现
// 增强：中文数字→阿拉伯数字转换（解决「爱情三十六计」vs「爱情36计」匹配问题）

// 中文数字映射
const CN_DIGITS = {
  '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9,
  '壹': 1, '贰': 2, '叁': 3, '肆': 4, '伍': 5,
  '陆': 6, '柒': 7, '捌': 8, '玖': 9,
};
const CN_UNITS = {
  '十': 10, '百': 100, '千': 1000, '万': 10000,
  '拾': 10, '佰': 100, '仟': 1000, '萬': 10000,
};

/**
 * 将字符串中的中文数字子串转换为阿拉伯数字
 * 支持：三十六→36, 二十四→24, 一百→100, 九十九→99, 十→10
 * @param {string} str
 * @returns {string}
 */
function convertChineseNumerals(str) {
  return str.replace(/([零一二三四五六七八九壹贰叁肆伍陆柒捌玖十百千万拾佰仟萬]+)/g, (match) => {
    let result = 0;
    let current = 0;
    for (const ch of match) {
      if (CN_DIGITS[ch] !== undefined) {
        current = CN_DIGITS[ch];
      } else if (CN_UNITS[ch] !== undefined) {
        const unit = CN_UNITS[ch];
        if (current === 0) current = 1; // 处理「十」开头的情况
        result += current * unit;
        current = 0;
      }
    }
    result += current;
    return result > 0 ? String(result) : match;
  });
}

// 同音异体字归一表（简繁转换之外的历史写法差异）
// 仅含「同字不同写法」的安全映射（如 长髮/长发），不含同音异义字（如 地/第 需按词处理）
const HOMOPHONE_VARIANTS = {
  '髮': '发',   // 长髮/长发
  '佈': '布',   // 公佈/公布
  '峯': '峰',   // 山峯/山峰
  '並': '并',   // 並且/并且
  '裏': '里',   // 夜裏/夜里
  '徵': '征',   // 象徵/象征
  '著': '着',   // 聽著/听着
  '佔': '占',   // 佔據/占据
  '唸': '念',   // 唸唸不忘/念念不忘
  '餵': '喂',   // 餵養/喂养
  '溼': '湿',   // 潮溼/潮湿
  '凍': '冻',   // 冷凍/冷冻
};

/**
 * 歌曲名归一化为去重 key：
 * NFKC 归一化 + 同音异体字归一 + 中文数字转换 + 去括号注记 + 去 " - xxx" 后缀 + 去空格标点
 * @param {string} name - 歌曲名
 * @returns {string} 归一化后的 key
 */
export function baseKey(name) {
  let s = String(name).normalize('NFKC').toLowerCase();
  s = s.replace(/[髮佈峯並裏徵著佔唸餵溼凍]/g, (ch) => HOMOPHONE_VARIANTS[ch] || ch);
  s = convertChineseNumerals(s);
  s = s.replace(/[([（【][^)\]）】]*[)\]）】]/g, ' '); // 去括号注记
  s = s.split(/\s+[-–—]\s+/)[0]; // 去 " - xxx" 后缀
  s = s.replace(/[\s''"""!！?？。，、·&+]/g, ''); // 去空格标点
  return s || String(name).toLowerCase();
}

/**
 * 剥离括号注记后的展示名
 * @param {string} name - 原始歌曲名
 * @returns {string} 清洗后的展示名
 */
export function displayName(name) {
  let s = String(name).normalize('NFKC');
  s = s.replace(/[([（【][^)\]）】]*[)\]）】]/g, '').trim();
  return s || String(name).trim();
}
