// src/utils/filters.js — 兼容壳：实际实现见 functions/_shared/filters.mjs
//
// 设计：筛选规则（Live/伴奏/串烧/低收藏量）原前后端各一份心智，现抽出
// functions/_shared/filters.mjs 作为单一来源；前端经此 re-export 透传，
// 业务代码（useSingerData / useDynamicSinger 等）的 import 路径无需改动。
export * from '../../functions/_shared/filters.mjs';
