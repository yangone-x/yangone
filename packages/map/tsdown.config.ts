import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts',  'src/map-cli/index'],
  format: ['esm'],
  outExtensions: () => ({
    dts: '.d.ts',
  }),
  // 排除外部依赖
  externals: [
    'chalk',
    '@clack/prompts',
    'decimal.js',
    'exceljs',
    'lodash.merge',
    'node-fetch',
    'progress',
  ],
});
