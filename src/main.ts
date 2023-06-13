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

import { loadFontAwesome } from './fontawesome'
loadFontAwesome(app)

// i18n

import { createI18n } from 'vue-i18n'
import { loadLanguage } from './i18n'

loadI18n()

async function loadI18n() {
  const locale = navigator.language.substring(0, 2)
  const translations = await loadLanguage(locale)
  const messages: any = {}
  messages[locale] = { ...translations }

  const i18n = createI18n({
    legacy: false,
    locale,
    messages
  })

  app.use(i18n)
  app.mount('#app')
}
