import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig } from 'tsdown';
import { tsxResolveTypes } from 'vite-plugin-tsx-resolve-types';

export default defineConfig({
  plugins: [
    tsxResolveTypes({
      defaultPropsToUndefined: ['Boolean'],
    }),
    vueJsx(),
    vue(),
  ],
  entry: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/tests/*',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
  ],
  unbundle: true,
  format: 'es',
  outExtensions() {
    return {
      js: '.js',
      dts: '.d.ts',
    };
  },
  // minify: true,
  clean: true,
  copy: [{ from: 'src/styles/reset.css', to: 'dist' }],
  deps: {
    onlyBundle: false,
    neverBundle: true,
  },
});
