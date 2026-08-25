import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'
import { tsxResolveTypes } from 'vite-plugin-tsx-resolve-types'

export default defineConfig({
  plugins: [
    tsxResolveTypes({
      defaultPropsToUndefined: ['Boolean'],
    }),
    vue(),
    vueJsx(),
  ],
  // Browser-facing bundle: replace `process.env.NODE_ENV` so the output does
  // not reference the missing `process` global in the browser (#666).
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    rolldownOptions: {
      external: [
        'vue',
      ],
      output: {
        globals: {
          'vue': 'vue',
        },
      },
    },
    emptyOutDir: false,
    lib: {
      entry: 'src/index.ts',
      name: 'yangdv',
      fileName: () => 'yangdv.esm.js',
      formats: ['es'],
    },
  },
})
