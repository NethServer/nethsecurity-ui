<template>
<div class="content">
  <cv-loading :active="isLoading" overlay></cv-loading>

  <cv-grid v-if="!isLoading && isLogged" fullWidth>
    <cv-row>
      <cv-column>
        <h2 class="page-title">Dashboard</h2>
      </cv-column>
    </cv-row>
    <cv-row>
      <cv-column>
        <h3 class="page-title">Server list</h3>
      </cv-column>
    </cv-row>
    <cv-row>
      <cv-column v-for="(server, index) in servers" :key="index" :sm="2" :md="3" :lg="3">
        <div class="cv-grid-story__preview-col">
          <cv-tile :kind="'standard'">
            <h4>{{server.name}}</h4>
            <p>{{server.ipaddress}} | {{server.netmask}}</p>
            <cv-tooltip :alignment="'center'" :direction="'right'" :tip="server.registered ? $t('controller.client_registered') : $t('controller.client_unregistered')">
              <CheckmarkFilled32 v-if="server.registered" />
              <ErrorFilled32 v-if="!server.registered" />
            </cv-tooltip>
            <br />
            <br />
            <cv-button :kind="'primary'" @click="goTo('/manage/' + server.name)" :size="'sm'" :disabled="server.registered ? false : true">
              {{$t('controller.manage_client')}}
            </cv-button>

          </cv-tile>
        </div>
      </cv-column>
    </cv-row>
  </cv-grid>

</div>
</template>

<script>
import to from "await-to-js";

import StorageService from "../services/storage";

import CheckmarkFilled32 from "@carbon/icons-vue/es/checkmark--filled/32";
import ErrorFilled32 from "@carbon/icons-vue/es/error--filled/32";

export default {
  name: 'Controller',
  mixins: [StorageService],
  components: {
    CheckmarkFilled32,
    ErrorFilled32
  },
  data() {
    return {
      isLoading: true,
      servers: []
    };
  },
  mounted() {
    // set page title
    document.title = this.$root.config.PRODUCT_NAME + " - " + this.$t("controller.title");

    // set page
    this.$parent.$parent.page = "[Configuration]";

    // get dashboard info
    this.getClientList()
  },
  methods: {
    goTo(path) {
      this.$router.push(path);
    },
    async getClientList() {
      // get loginInfo
      const loginInfo = this.getFromStorage("loginInfo")

      // check loginInfo
      if (!loginInfo) {
        this.isLoading = false;
        this.isLogged = false;
        return
      }

      // invoke
      const [serversError, serversResponse] = await to(this.axios
        .get(`${this.$root.serverURL}/servers`, {
          headers: {
            Authorization: `Bearer ${loginInfo.access_token}`,
          }
        })
      );

      // check error
      if (serversError || !serversResponse) {
        console.log(serversError);
        this.isLogged = false;
        this.isLoading = false;
        this.deleteFromStorage("loginInfo")
        return
      }

      // set servers list
      this.servers = serversResponse.data
      this.servers.push({
        "ipaddress": "172.21.0.2",
        "name": "fake-client1",
        "netmask": "255.255.0.0",
        "registered": false
      });
      this.servers.push({
        "ipaddress": "172.21.0.2",
        "name": "fake-client2",
        "netmask": "255.255.0.0",
        "registered": false
      });
      this.servers.push({
        "ipaddress": "172.21.0.2",
        "name": "fake-client3",
        "netmask": "255.255.0.0",
        "registered": false
      });

      // all done
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
