import { defineConfig } from '@rslib/core';

export default defineConfig({
  build: {
    format: ['cjs', 'esm'],
    target: 'es2020',
    dts: true,
    outDir: {
      cjs: 'dist',
      esm: 'dist'
    },
    sourceMap: true
  },
  output: {
    target: 'es2020'
  }
});
