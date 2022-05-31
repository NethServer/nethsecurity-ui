<template>
<div id="app">

  <div :class="['content', isLogged ? 'logged' : '']">
    <!-- LOADER -->
    <cv-loading :active="isLoading" overlay :class="[isStandAlone ? 'stand-alone' : '']"></cv-loading>

    <!-- LOGIN MODAL -->
    <cv-modal v-if="!isLoading && !isLogged && !isStandAlone" id="modal-login-config" :size="'default'" :visible="true" @primary-click="login" :auto-hide-off="true">
      <template slot="title">{{config.PRODUCT_NAME}} Controller Login</template>
      <template slot="content">
        <cv-form>
          <cv-text-input label="Username" placeholder="Username" v-model="username" required>
          </cv-text-input>
          <cv-text-input type="password" label="Password" placeholder="Password" v-model="password" required>
          </cv-text-input>
        </cv-form>
      </template>
      <template slot="primary-button">Login</template>
    </cv-modal>

    <!-- MAIN HEADER AND LEFT MENU -->
    <cv-header v-if="!isLoading && isLogged && !isStandAlone" :aria-label="$root.config.PRODUCT_NAME + 'Controller'">
      <cv-header-menu-button aria-controls="side-nav" />
      <cv-header-name href="javascript:void(0)" :prefix="$root.config.PRODUCT_NAME">
        {{this.page}}
      </cv-header-name>
      <template v-slot:header-global>
        <cv-header-global-action aria-label="User avatar" @click="logout" label="Logout" tipPosition="left" tipAlignment="center">
          <Logout20 />
        </cv-header-global-action>
      </template>
      <template v-slot:left-panels>
        <cv-side-nav id="side-nav">
          <cv-side-nav-items>

            <cv-side-nav-link @click="goTo('/controller')" :active="isLinkActive('/controller')">
              <template v-slot:nav-icon>
                <DataVisualization20 />
              </template>
              {{$t("main.controller")}}
            </cv-side-nav-link>

            <cv-side-nav-link @click="goTo('/logs')" :active="isLinkActive('logs')">
              <template v-slot:nav-icon>
                <Catalog20 />
              </template>
              {{$t("main.logs")}}
            </cv-side-nav-link>

            <cv-side-nav-link @click="goTo('/settings')" :active="isLinkActive('settings')">
              <template v-slot:nav-icon>
                <Settings20 />
              </template>
              {{$t("main.settings")}}
            </cv-side-nav-link>

          </cv-side-nav-items>
        </cv-side-nav>
      </template>
    </cv-header>
    <!-- END MAIN HEADER AND LEFT MENU -->

    <!-- MAIN CONTENT AND ROUTER -->
    <cv-content v-if="!isLoading && isLogged" id="main-content" :class="[isStandAlone ? 'stand-alone' : '']">
      <router-view />
    </cv-content>
    <!-- MAIN CONTENT AND ROUTER -->

  </div>
</div>
</template>

<script>
import to from "await-to-js";

import StorageService from "./services/storage";

import Logout20 from "@carbon/icons-vue/es/logout/20";
import Catalog20 from "@carbon/icons-vue/es/catalog/20";
import Settings20 from "@carbon/icons-vue/es/settings/20";
import DataVisualization20 from "@carbon/icons-vue/es/data-vis--1/20";

export default {
  name: 'App',
  mixins: [StorageService],
  components: {
    DataVisualization20,
    Catalog20,
    Settings20,
    Logout20
  },
  data() {
    return {
      page: "",
      username: 'admin',
      password: 'admin',
      config: window.CONFIG,
      isLoading: this.$route.path.indexOf('/configuration') > -1 ? false : true,
      isLogged: this.$route.path.indexOf('/configuration') > -1 ? true : false,
      loginError: false,
      loginMessage: "",
      isStandAlone: this.$route.path.indexOf('/configuration') > -1 ? true : false,
    };
  },
  mounted() {
    if (this.$route.path.indexOf('/configuration') > -1) {
      this.isLoading = false;
      this.isLogged = true;
      this.isStandAlone = true;
    } else {
      // check token validation
      this.verifyToken();
    }
  },
  methods: {
    isLinkActive(path) {
      return this.$route.path.includes(path);
    },
    goTo(path) {
      this.$router.push(path);
    },
    async logout() {
      // get loginInfo
      const loginInfo = this.getFromStorage("loginInfo")

      // check loginInfo
      if (!loginInfo) {
        this.isLoading = false;
        this.isLogged = false;
        this.deleteFromStorage("loginInfo");
        return
      }

      // invoke logout API
      await to(this.axios
        .post(`${this.$root.serverURL}/logout`, {}, {
          headers: {
            Authorization: `Bearer ${loginInfo.refresh_token}`,
          }
        })
      );

      // set logout
      this.deleteFromStorage("loginInfo");
      this.isLogged = false;
      this.isLoading = false;
    },
    async login() {
      // start loading
      this.isLoading = true;

      // invoke login API
      const [loginError, loginResponse] = await to(this.axios
        .post(`${this.$root.serverURL}/login`, {
          "username": this.username,
          "password": this.password
        })
      );

      // check error
      if (loginError) {
        console.error(loginError);
      }

      // check loginResponse
      if (!loginResponse) {
        this.isLogged = false;
        this.isLoading = false;
        this.loginError = true;
        this.loginMessage = "";
      }

      // read token loginResponse
      const loginInfo = {
        username: this.username,
        access_token: loginResponse.data.access_token,
        refresh_token: loginResponse.data.refresh_token,
      }
      this.saveToStorage("loginInfo", loginInfo);
      this.isLogged = true;
      this.isLoading = false;
    },
    async verifyToken() {
      // get loginInfo
      const loginInfo = this.getFromStorage("loginInfo")

      // check loginInfo
      if (!loginInfo) {
        this.isLoading = false;
        this.isLogged = false;
        return
      }

      // call token verification
      const [verifyError, verifyResponse] = await to(this.axios
        .post(`${this.$root.serverURL}/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${loginInfo.refresh_token}`,
          }
        })
      );

      // check error
      if (verifyError || !verifyResponse) {
        console.error(verifyError);
        this.isLogged = false;
        this.isLoading = false;
        this.deleteFromStorage("loginInfo")
        return
      }

      // update access token
      loginInfo.access_token = verifyResponse.data.access_token;
      this.saveToStorage("loginInfo", loginInfo);

      // set logged in
      this.isLogged = true;
      this.isLoading = false;
    }
  },
}
</script>

<style lang="css">
@import "./styles/main.css";
</style>
