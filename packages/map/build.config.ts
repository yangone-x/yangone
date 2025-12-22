import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  clean: true,
  declaration: true,
  outDir: 'dist',
  name: 'bundle',
  entries: ['src/index', 'src/map-cli/index'],
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
