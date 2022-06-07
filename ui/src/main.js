import Vue from 'vue';
import App from './App.vue';
import router from "./router";
import store from "./store"

// carbon styles
import 'carbon-components/css/carbon-components.css';
import CarbonComponentsVue from '@carbon/vue';
Vue.use(CarbonComponentsVue);

// http stack request
import axios from "axios";
axios.defaults.timeout = 10000;
import VueAxios from "vue-axios";
Vue.use(VueAxios, axios);

// i18n
import VueI18n from "vue-i18n";
Vue.use(VueI18n);
const i18n = new VueI18n();
const messages = require("../public/i18n/language.json");
const langCode = navigator.language.substring(0, 2);
i18n.setLocaleMessage(langCode, messages);
i18n.locale = langCode;

// filters
import filters from "./filters";
for (var f in filters) {
  Vue.filter(f, filters[f]);
}

Vue.config.productionTip = true;

new Vue({
  store,
  router,
  i18n,
  created: function() {
    this.config = window.CONFIG;
    this.$root.luciURL = this.config.LUCI_API_ENDPOINT;
    this.$root.serverURL = this.config.SERVER_API_ENDPOINT;
    this.$root.page = "";
  },
  render: h => h(App),
}).$mount('#app')
