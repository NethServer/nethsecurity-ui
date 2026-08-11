import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    VueI18nPlugin({
      include: [path.resolve(__dirname, './src/i18n/**')]
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    UI_VERSION: JSON.stringify(process.env.npm_package_version),
    REQUIRED_API_VERSION: JSON.stringify(process.env.npm_package_config_requiredApiVersion),
    // First ns-ui release whose bundle can be served under a path prefix, and therefore the first
    // one the controller can link to directly at /<uuid>/ instead of embedding its own copy.
    MIN_UI_VERSION_FOR_DIRECT_SERVE: JSON.stringify(
      process.env.npm_package_config_minUiVersionForDirectServe
    )
  }
})
