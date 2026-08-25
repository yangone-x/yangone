import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig } from 'vite';
import { tsxResolveTypes } from 'vite-plugin-tsx-resolve-types';
import { defineProject, mergeConfig } from 'vitest/config';

export default mergeConfig(
  defineConfig({
    plugins: [
      tsxResolveTypes({
        defaultPropsToUndefined: ['Boolean'],
      }),
      vue(),
      vueJsx({}),
      {
        name: 'vue-docs-block',
        transform(_code, id) {
          if (id.includes('?vue&type=docs')) {
            return { code: 'export default {}', map: null };
          }
        },
      },
    ],
    optimizeDeps: {
      include: [],
    },
    resolve: {},
  }),
  defineProject({
    test: {
      include: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
      environment: 'jsdom',
      setupFiles: ['../../tests/setup.ts', '../../tests/setupAfterEnv.ts'],
      server: {
        deps: {
          inline: [/@v-c\//],
        },
      },
    },
  }),
);
