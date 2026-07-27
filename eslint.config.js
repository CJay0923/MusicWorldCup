import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';

export default [
  // 忽略构建产物
  { ignores: ['dist', 'node_modules'] },

  // 基础推荐规则
  js.configs.recommended,

  // React Hooks 规则（检测 effect 依赖遗漏等）
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // 全局变量与解析器配置
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
  },

  // 关闭与 Prettier 冲突的格式化规则
  prettierConfig,
];
