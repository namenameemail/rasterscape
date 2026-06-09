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
    },
  },
  server: {
    fs: {
      allow: [bbuutoonnssPath, path.resolve(__dirname, '..')],
    },
  },
  define: {global: 'globalThis'}
  // define: {
  //   // By default, Vite doesn't include shims for NodeJS/
  //   // necessary for segment analytics lib to work
  //   global: {},
  // },
})
