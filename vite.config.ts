import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const controllerProxy: ProxyOptions = {
    target: `${env.VITE_API_SCHEME}://${env.VITE_CONTROLLER_API_HOST}`,
    changeOrigin: true,
    // controllers often run with a self-signed certificate
    secure: false,
    ws: true,
    rewriteWsOrigin: true
  }

  return {
    base: './',
    server:
      env.VITE_UI_MODE === 'controller'
        ? {
            proxy: {
              '/api': controllerProxy,
              // units served through the controller, /<unit-uuid>/
              '^/[0-9a-f-]{36}/': controllerProxy
            }
          }
        : undefined,
    plugins: [
      vue(),
      vueDevTools(),
      tailwindcss(),
      VueI18nPlugin({
        include: [path.resolve(import.meta.dirname, './src/i18n/**')]
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
      MIN_UI_VERSION_FOR_DIRECT_SERVE: JSON.stringify(
        process.env.npm_package_config_minUiVersionForDirectServe
      )
    }
  }
})
