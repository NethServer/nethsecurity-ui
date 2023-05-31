import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)
const state = {
  manage: {
    isLoading: true,
    isLogged: false,
    isStandAlone: false,
    configs: {},
    board: {},
    info: {},
    wan: {},
    lan: {}
  }
}
export default new Vuex.Store({
  state
})
