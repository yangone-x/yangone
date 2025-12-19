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
    'decimal.js',
    'exceljs',
    '@inquirer/prompts',
    'lodash.merge',
    'node-fetch',
    'progress',
  ],
});
