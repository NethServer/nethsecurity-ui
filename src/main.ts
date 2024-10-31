//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import './assets/main.css'
import 'tippy.js/dist/tippy.css'

import itTranslation from './i18n/it/translation.json'
import enTranslation from './i18n/en/translation.json'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { loadFontAwesome } from './lib/fontawesome'
import VueTippy from 'vue-tippy'
import { createI18n } from 'vue-i18n'

import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// fontawesome
loadFontAwesome(app)

// tooltip library
app.use(VueTippy, {
  defaultProps: { theme: 'tailwind' }
})

// i18n
app.use(
  createI18n({
    legacy: false,
    fallbackLocale: 'en',
    fallbackWarn: false,
    missingWarn: false,
    messages: {
      it: itTranslation,
      en: enTranslation
    }
  })
)

app.mount('#app')
