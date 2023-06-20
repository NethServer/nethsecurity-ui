//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

import { loadFontAwesome } from './lib/fontawesome'
loadFontAwesome(app)

// i18n

import { setupI18n } from '@/lib/i18n'

loadI18n()

async function loadI18n() {
  const locale = navigator.language.substring(0, 2)

  const i18n = setupI18n({
    legacy: false,
    missingWarn: false,
    fallbackWarn: false,
    locale
  })
  app.use(i18n)
  app.mount('#app')
}
