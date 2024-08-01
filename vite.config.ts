import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import rawPlugin from 'vite-raw-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), rawPlugin({
    fileRegex: /\.glsl$/
  })],
  resolve: {
    alias: {
      'store': path.resolve(__dirname, './src/store'),
      'components': path.resolve(__dirname, './src/components'),
      'utils': path.resolve(__dirname, './src/utils'),
    },
  },
  define: {global: 'window'}
  // define: {
  //   // By default, Vite doesn't include shims for NodeJS/
  //   // necessary for segment analytics lib to work
  //   global: {},
  // },
})
