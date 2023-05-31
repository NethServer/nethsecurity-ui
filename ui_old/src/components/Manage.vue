<template>
<div class="content">
  <cv-loading v-if="!parentLoading" :active="$store.state.manage.isLoading" overlay :class="[$store.state.manage.isStandAlone ? 'stand-alone' : '']"></cv-loading>

  <cv-modal v-if="!$store.state.manage.isLoading && !$store.state.manage.isLogged" id="modal-login-manage" :size="'default'" :visible="true" @primary-click="loginStandAlone" :auto-hide-off="true"
    :class="[$store.state.manage.isStandAlone ? 'stand-alone' : '']">
    <template slot="title">{{config.PRODUCT_NAME}} Stand-Alone Login</template>
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

  <cv-header v-if="$store.state.manage.isLogged" id="side-header-manage" :class="[$store.state.manage.isStandAlone ? 'stand-alone' : '']" class="sub-header">
    <cv-header-menu-button aria-controls="side-nav-manage" />
    <cv-header-name href="javascript:void(0)" :prefix="$root.config.PRODUCT_NAME">
      [{{'STAND-ALONE'}}]
    </cv-header-name>
    <template v-slot:header-global>
      <cv-header-global-action aria-label="User avatar" @click="logout" label="Logout" tipPosition="left" tipAlignment="center">
        <Logout20 />
      </cv-header-global-action>
    </template>
    <template v-slot:left-panels>
      <cv-side-nav id="side-nav-manage" :class="[$store.state.manage.isStandAlone ? 'stand-alone' : 'no-stand-alone']">
        <cv-side-nav-items>

          <cv-side-nav-link @click="goTo('/dashboard', $store.state.manage.isStandAlone)" :active="isLinkActive('dashboard')">
            <template v-slot:nav-icon>
              <Dashboard20 />
            </template>
            {{$t("manage.dashboard")}}
          </cv-side-nav-link>

          <!-- <cv-side-nav-link @click="goTo('/menu2', $store.state.manage.isStandAlone)" :active="isLinkActive('menu2')">
            <template v-slot:nav-icon>
              <Catalog20 />
            </template>
            {{$t("manage.menu_2")}}
          </cv-side-nav-link>

          <cv-side-nav-link @click="goTo('/menu3', $store.state.manage.isStandAlone)" :active="isLinkActive('menu3')">
            <template v-slot:nav-icon>
              <Settings20 />
            </template>
            {{$t("manage.menu_3")}}
          </cv-side-nav-link> -->

        </cv-side-nav-items>
      </cv-side-nav>
    </template>
  </cv-header>

  <cv-content v-if="$store.state.manage.isLogged" :class="[$store.state.manage.isStandAlone ? 'stand-alone-sub' : 'no-stand-alone-sub']">
    <router-view></router-view>
  </cv-content>

</div>
</template>

<script>
import to from "await-to-js";

import StorageService from "../services/storage";

import Logout20 from "@carbon/icons-vue/es/logout/20";
//import Catalog20 from "@carbon/icons-vue/es/catalog/20";
//import Settings20 from "@carbon/icons-vue/es/settings/20";
import Dashboard20 from "@carbon/icons-vue/es/dashboard/20";

export default {
  name: 'Manage',
  mixins: [StorageService],
  components: {
    Dashboard20,
    //Catalog20,
    //Settings20,
    Logout20
  },
  data() {
    return {
      clientId: this.$route.path.indexOf('/configuration') > -1 ? 'stand-alone' : this.$route.params.clientId,
      parentLoading: document.getElementsByClassName("bx--loading-overlay cv-loading").length > 0,
      config: window.CONFIG,
      username: "root",
      password: "Nethesis,1234",
    };
  },
  mounted() {
    // check Stand-alone mode
    if (this.$route.params.clientId) { // classic mode
      // set page title
      document.title = this.$root.config.PRODUCT_NAME + " - " + this.$t("manage.title") + " " + this.clientId;

      // set page
      this.$parent.$parent.page = "[Client " + this.clientId + "]";

      // get dashboard info
      this.checkTokenValidity()
    } else { // stand-alone mode
      // set page title
      document.title = this.$root.config.PRODUCT_NAME + " - " + this.$t("manage.title");

      // set page
      this.$parent.$parent.page = "";

      // set stand alone
      this.$store.state.manage.isStandAlone = true;
      this.$parent.$parent.isStandAlone = true;
      this.$parent.$parent.isLoading = true;
      this.$parent.$parent.isLogged = true;

      // get dashboard info
      this.checkTokenValidity()
    }
  },
  methods: {
    isLinkActive(path) {
      return this.$route.path.includes(path);
    },
    goTo(path, isStandAlone) {
      var fullPath = isStandAlone ? '/configuration' + path : '/manage/' + this.clientId + path
      this.$router.push(fullPath);
    },
    async loginStandAlone() {
      // invoke login API
      const [loginError, loginResponse] = await to(this.axios
        .post(`${this.$root.luciURL}/auth`.replace("_CLIENT_/", ""), {
          "id": 1,
          "method": "login",
          "params": [this.username, this.password]
        })
      );

      // check error
      if (loginError) {
        console.error(loginError);
      }

      // check loginResponse
      if (!loginResponse) {
        this.$store.state.manage.isLogged = false;
        this.$store.state.manage.isLoading = false;
        this.loginError = true;
        this.loginMessage = "";
      }

      // read token loginResponse
      const clientInfo = {
        clientId: this.clientId,
        token: loginResponse.data.result,
      }
      this.saveToStorage("clientInfo-" + this.clientId, clientInfo);
      this.$store.state.manage.isLogged = true;

      // get dashboard info
      this.checkTokenValidity();
    },
    async logout() {
      // set logout
      this.deleteFromStorage("loginInfo");
      this.deleteFromStorage("clientInfo-" + this.clientId);
      this.$store.state.manage.isLogged = false;
      this.$store.state.manage.isLoading = false;
    },
    async login() {
      // start loading
      this.$store.state.manage.isLoading = true;

      // get loginInfo
      const loginInfo = this.getFromStorage("loginInfo")

      // check loginInfo
      if (!loginInfo) {
        this.$store.state.manage.isLoading = false;
        this.$store.state.manage.isLogged = false;
        return
      }

      // invoke login API
      const [loginError, loginResponse] = await to(this.axios
        .post(`${this.$root.serverURL}/servers/token`, {
          name: this.clientId
        }, {
          headers: {
            Authorization: `Bearer ${loginInfo.access_token}`,
          }
        })
      );

      // check error
      if (loginError) {
        console.error(loginError);
      }

      // check loginResponse
      if (!loginResponse) {
        this.$store.state.manage.isLogged = false;
        this.$store.state.manage.isLoading = false;
        this.loginError = true;
        this.loginMessage = "";
      }

      // read token loginResponse
      const clientInfo = {
        clientId: this.clientId,
        token: loginResponse.data.token,
      }
      this.saveToStorage("clientInfo-" + this.clientId, clientInfo);
      this.$store.state.manage.isLogged = true;

      // get dashboard info
      this.checkTokenValidity();
    },
    async checkTokenValidity() {
      // get clientInfo
      const clientInfo = this.getFromStorage("clientInfo-" + this.clientId)

      // check clientInfo
      if (!clientInfo) {
        this.$store.state.manage.isLoading = false;
        this.$store.state.manage.isLogged = false;
        if (!this.$store.state.manage.isStandAlone) {
          this.login()
        }
        return
      }

      // invoke
      const [networkError, networkResponse] = await to(this.axios
        .post(`${this.$root.luciURL}/uci?auth=${clientInfo.token}`.replace("_CLIENT_", this.clientId), {
          "method": "get_all",
          "params": [
            "network"
          ]
        })
      );

      // check error
      if (networkError || !networkResponse) {
        this.$store.state.manage.isLogged = false;
        this.$store.state.manage.isLoading = false;
        this.deleteFromStorage("clientInfo-" + this.clientId)
        if (!this.$store.state.manage.isStandAlone) {
          this.login()
        }
        return
      }

      // all done
      this.$store.state.manage.isLoading = false;
      this.$store.state.manage.isLogged = true;
      this.parentLoading = false;

    },
  },
};
</script>

<style>
#modal-login-manage {
  z-index: 5000;
}

#modal-login-manage .bx--form .bx--form-item {
  margin-bottom: 2rem;
}

#modal-login-manage .bx--modal-content {
  margin-bottom: 1rem;
}

#modal-login-manage .bx--modal-close {
  display: none;
}

#modal-login-manage .bx--modal-header__heading {
  font-size: 2rem;
}

#modal-login-manage .bx--modal-content {
  height: 100%;
}

#modal-login-manage.stand-alone .bx--modal-container {
  margin-left: 0rem;
}
</style>
