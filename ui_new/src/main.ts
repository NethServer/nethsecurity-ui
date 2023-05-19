import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome' ////
import { faUserSecret } from '@fortawesome/free-solid-svg-icons' ////
import { faHeadset } from '@nethesis/nethesis-light-svg-icons' ////

const app = createApp(App)

app.use(createPinia())
app.use(router)

library.add(faUserSecret, faHeadset) ////
app.component('font-awesome-icon', FontAwesomeIcon) ////

app.mount('#app')
