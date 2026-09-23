/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import rawPlugin from 'vite-raw-plugin'
import { profilingSavePlugin } from './scripts/viteProfilingPlugin'

const bbuutoonnssPath = path.resolve(__dirname, '../bbuutoonnss')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    rawPlugin({
      fileRegex: /\.glsl$/
    }),
    profilingSavePlugin(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      'store': path.resolve(__dirname, './src/store'),
      'components': path.resolve(__dirname, './src/components'),
      'utils': path.resolve(__dirname, './src/utils'),
      'bbuutoonnss': bbuutoonnssPath,
    },
  },
  server: {
    fs: {
      allow: [bbuutoonnssPath, path.resolve(__dirname, '..')],
    },
  },
  define: {global: 'globalThis'},
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/storage/test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
})
