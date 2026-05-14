import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  sourcemap: 'inline',
  deps: {
    neverBundle: ['vite'],
  },
  dts: {
    cjsReexport: true,
  },
  clean: true,
})
