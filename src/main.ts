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

import { loadI18n } from './i18n'
const i18n = await loadI18n()
app.use(i18n)

app.mount('#app')
