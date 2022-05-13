<template>
<div class="sample">
  <cv-loading :active="isLoading" overlay></cv-loading>

  <cv-modal v-if="!isLoading && !isLogged" id="modal-login" :size="'default'" :visible="true" @primary-click="login" :auto-hide-off="true">
    <template slot="title">{{config.PRODUCT_NAME}} Login</template>
    <template slot="content">
      <cv-form>
        <cv-text-input label="Client" placeholder="Client" v-model="client" readonly>
        </cv-text-input>
        <cv-text-input label="Username" placeholder="Username" v-model="username">
        </cv-text-input>
        <cv-text-input type="password" label="Password" placeholder="Password" v-model="password">
        </cv-text-input>
      </cv-form>
    </template>
    <template slot="primary-button">Login</template>
  </cv-modal>

  <cv-data-table v-if="!isLoading && isLogged" :columns="tableCols" :data="tableRows" ref="table"></cv-data-table>
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
      client: this.$route.params.clientId,
      username: 'root',
      password: 'Nethesis,1234',
      config: window.CONFIG,
      isLoading: true,
      isLogged: false,
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
    // set page title
    document.title = this.$t("manage.manage_title") + " " + this.client;

    // get dashboard info
    this.getDashboardInfo()
  },
  methods: {
    async login() {
      // start loading
      this.isLoading = true;

      // invoke login API
      const [loginError, loginResponse] = await to(this.axios
        .post(`${this.$root.luciURL}/auth`.replace("_CLIENT_", this.client), {
          "id": 1,
          "method": "login",
          "params": [this.username, this.password]
        })
      );

      // check error
      if (loginError) {
        console.error(loginError);
      }

      // read token loginResponse
      const loginInfo = {
        username: this.username,
        token: loginResponse.data.result,
      }
      this.saveToStorage("loginInfo", loginInfo);
      this.isLogged = true;

      // get adshboard info
      this.getDashboardInfo();
    },
    async getDashboardInfo() {
      // get loginInfo
      const loginInfo = this.getFromStorage("loginInfo")

      // check loginInfo
      if (!loginInfo) {
        this.isLoading = false;
        this.isLogged = false;
        return
      }

      // invoke
      const [networkError, networkResponse] = await to(this.axios
        .post(`${this.$root.luciURL}/uci?auth=${loginInfo.token}`.replace("_CLIENT_", this.client), {
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
        this.deleteFromStorage("loginInfo")
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

      this.isLoading = false;
      this.isLogged = true;

    },
  },
};
</script>

<style>
#modal-login {
  z-index: 5000;
}

#modal-login .bx--form .bx--form-item {
  margin-bottom: 2rem;
}

#modal-login .bx--modal-content {
  margin-bottom: 1rem;
}

#modal-login .bx--modal-close {
  display: none;
}

#modal-login .bx--modal-header__heading {
  font-size: 2rem;
}

#modal-login .bx--modal-content {
  height: 100%;
}
</style>
