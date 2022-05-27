<template>
<div class="content">
  <cv-loading v-if="!parentLoading" :active="isLoading" overlay :class="[isStandAlone ? 'stand-alone' : '']"></cv-loading>

  <cv-modal v-if="!isLoading && !isLogged" id="modal-login-manage" :size="'default'" :visible="true" @primary-click="loginStandAlone" :auto-hide-off="true" :class="[isStandAlone ? 'stand-alone' : '']">
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

  <div v-if="!isLoading && isLogged">
    <cv-grid fullWidth>
      <cv-row v-if="!isStandAlone">
        <cv-column>
          <cv-breadcrumb class="page-title" :no-trailing-slash="true">
            <cv-breadcrumb-item>
              <cv-link href="#controller" @click="goTo('/controller')">{{$t("controller.title")}}</cv-link>
            </cv-breadcrumb-item>
            <cv-breadcrumb-item>
              <cv-link :href="'#manage/'+this.clientId" aria-current="page">{{this.clientId}}</cv-link>
            </cv-breadcrumb-item>
          </cv-breadcrumb>
        </cv-column>
      </cv-row>
      <cv-row>
        <cv-column>
          <h2 class="page-title no-margin-top">Manage {{isStandAlone ? '' : this.clientId}}</h2>
        </cv-column>
      </cv-row>
      <cv-row>
        <cv-column>
          <div class="cv-grid-story__preview-col">
            <cv-data-table v-if="!isLoading && isLogged" :columns="tableCols" :data="tableRows" ref="table"></cv-data-table>
          </div>
        </cv-column>
      </cv-row>
    </cv-grid>
  </div>

</div>
</template>

<script>
import to from "await-to-js";

import StorageService from "../services/storage";

export default {
  name: 'Manage',
  mixins: [StorageService],
  data() {
    return {
      clientId: this.$route.path == '/configuration' ? 'stand-alone' : this.$route.params.clientId,
      parentLoading: document.getElementsByClassName("bx--loading-overlay cv-loading").length > 0,
      config: window.CONFIG,
      isLoading: true,
      isLogged: false,
      isStandAlone: false,
      username: "root",
      password: "Nethesis,1234",
      tableCols: [
        "Name",
        "Type",
        "Device",
        "Ip Address",
        "Netmask",
        "Protocol"
      ],
      tableRows: [],
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
      this.getDashboardInfo()
    } else { // stand-alone mode
      // set page title
      document.title = this.$root.config.PRODUCT_NAME + " - " + this.$t("manage.title");

      // set page
      this.$parent.$parent.page = "";

      // show login
      this.isLoading = false;
      this.isLogged = false;

      // set stand alone
      this.isStandAlone = true;
      this.$parent.$parent.isStandAlone = true;
      this.$parent.$parent.isLoading = true;
      this.$parent.$parent.isLogged = true;

      // get dashboard info
      this.getDashboardInfo()
    }
  },
  methods: {
    goTo(path) {
      this.$router.push(path);
    },
    async loginStandAlone() {
      console.log(`${this.$root.luciURL}/auth`.replace("_CLIENT_/", ""))

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
        this.isLogged = false;
        this.isLoading = false;
        this.loginError = true;
        this.loginMessage = "";
      }

      // read token loginResponse
      const clientInfo = {
        clientId: this.clientId,
        token: loginResponse.data.result,
      }
      this.saveToStorage("clientInfo-" + this.clientId, clientInfo);
      this.isLogged = true;

      // get dashboard info
      this.getDashboardInfo();
    },
    async login() {
      // start loading
      this.isLoading = true;

      // get loginInfo
      const loginInfo = this.getFromStorage("loginInfo")

      // check loginInfo
      if (!loginInfo) {
        this.isLoading = false;
        this.isLogged = false;
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
        this.isLogged = false;
        this.isLoading = false;
        this.loginError = true;
        this.loginMessage = "";
      }

      // read token loginResponse
      const clientInfo = {
        clientId: this.clientId,
        token: loginResponse.data.token,
      }
      this.saveToStorage("clientInfo-" + this.clientId, clientInfo);
      this.isLogged = true;

      // get dashboard info
      this.getDashboardInfo();
    },
    async getDashboardInfo() {
      // get clientInfo
      const clientInfo = this.getFromStorage("clientInfo-" + this.clientId)

      // check clientInfo
      if (!clientInfo) {
        this.isLoading = false;
        this.isLogged = false;
        this.login();
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
        this.isLogged = false;
        this.isLoading = false;
        this.deleteFromStorage("clientInfo-" + this.clientId)
        this.login();
        return
      }

      console.log(networkResponse.data.result)

      // filter results
      var interfaces = Object.values(networkResponse.data.result);
      interfaces.map(interf => this.tableRows.push({
        name: interf['.name'] || '-',
        type: interf['.type'] || '-',
        device: interf['device'] || '-',
        ipaddr: interf['ipaddr'] || '-',
        netmask: interf['netmask'] || '-',
        proto: interf['proto'] || '-'
      }))

      // all done
      this.isLoading = false;
      this.isLogged = true;

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
