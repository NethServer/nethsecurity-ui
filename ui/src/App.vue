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
      isLoading: this.$route.path == '/configuration' ? false : true,
      isLogged: this.$route.path == '/configuration' ? true : false,
      loginError: false,
      loginMessage: "",
      isStandAlone: this.$route.path == '/configuration' ? true : false,
    };
  },
  mounted() {
    if (this.$route.path == '/configuration') {
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

<style>
html {
  background-color: #ffffff;
}

body {
  background-color: #ffffff;
}

.content {
  overflow: hidden;
}

.page-title {
  margin-top: 2rem;
  margin-bottom: 1.5rem;
}

.page-subtitle {
  margin-bottom: 1rem;
}

.page-sub-subtitle {
  margin-bottom: 0.75rem;
}

.empty-state {
  text-align: center;
}

.basic-card h4 {
  margin-bottom: 0.75rem;
}

.basic-card p {
  margin-bottom: 0.5rem;
}

.align-right {
  text-align: right;
}

.float-right {
  float: right;
}

.no-margin-top {
  margin-top: 0rem;
}

.margin-bottom {
  margin-bottom: 0.5rem;
}

.margin-left {
  margin-left: 3rem;
}

.margin-right {
  margin-right: 3rem;
}

.small-menu {
  float: right;
  margin-top: -1rem;
  margin-right: -1rem;
}

.main-button {
  margin-bottom: 1rem !important;
}

.card-tooltip {
  display: inline-block;
  vertical-align: top;
  outline: none;
}

.card-tooltip button {
  outline: none !important;
}

.bx--content .bx--col-sm-2 {
  margin-bottom: 2rem;
}

.bx--content .bx--col-md-3 {
  margin-bottom: 2rem;
}

.bx--content .bx--col-lg-3 {
  margin-bottom: 2rem;
}

.bx--tooltip {
  max-width: 35rem !important;
}

.bx--content.stand-alone {
  margin-left: 0rem !important;
  margin-top: 3rem !important;
  padding: 0px !important;
}

.bx--content .bx--modal-container.stand-alone {
  margin-left: 0rem !important;
}

.bx--content .bx--loading-overlay.stand-alone {
  padding-left: 0rem !important;
}

.content .bx--loading-overlay.stand-alone {
  padding-left: 0rem !important;
}

@media (max-width: 1055px) {
  .bx--content {
    margin-left: 0rem !important;
    margin-top: 3rem !important;
    padding: 0px !important;
  }

  .bx--content .bx--modal-container {
    margin-left: 0rem;
  }

  .bx--content .bx--loading-overlay {
    padding-left: 0rem;
  }

  .content .bx--loading-overlay {
    padding-left: 0rem;
  }
}

@media (min-width: 1056px) {
  .bx--content {
    margin-left: 16rem;
    margin-top: 3rem !important;
    padding: 0px !important;
  }

  .bx--content .bx--modal-container {
    margin-left: 16rem;
  }

  .bx--content .bx--loading-overlay {
    padding-left: 16rem;
  }

  .content.logged .bx--loading-overlay {
    padding-left: 16rem;
  }

  .content .bx--loading-overlay {
    padding-left: 0rem;
  }
}

.bx--side-nav {
  background-color: #161616 !important;
}

.bx--side-nav__submenu {
  color: #f4f4f4 !important;
}

.bx--side-nav__submenu:hover {
  background-color: #393939 !important;
  cursor: pointer;
}

.bx--side-nav__link {
  height: 3rem;
}

.bx--side-nav__link--current {
  background-color: #393939 !important;
}

.bx--side-nav__link-text {
  color: #f4f4f4 !important;
}

.bx--side-nav__link:hover {
  background-color: #393939 !important;
  cursor: pointer;
}

.bx--side-nav__icon>svg {
  fill: #f4f4f4 !important;
  width: 20px !important;
  height: 20px !important;
}

.bx--modal .bx--inline-loading__text {
  font-size: 0.875rem;
  color: #ffffff;
}

#modal-login-config {
  z-index: 5000;
}

#modal-login-config .bx--form .bx--form-item {
  margin-bottom: 2rem;
}

#modal-login-config .bx--modal-content {
  margin-bottom: 1rem;
}

#modal-login-config .bx--modal-close {
  display: none;
}

#modal-login-config .bx--modal-header__heading {
  font-size: 2rem;
}

#modal-login-config .bx--modal-content {
  height: 100%;
}

.icon-success {
  fill: #198038 !important;
}

.icon-error {
  fill: #da1e28 !important;
}
</style>
