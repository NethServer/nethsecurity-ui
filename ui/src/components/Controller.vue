<template>
<div class="content">
  <cv-loading v-if="!parentLoading" :active="isLoading" overlay></cv-loading>

  <cv-grid v-if="!isLoading && isLogged" fullWidth>
    <cv-row>
      <cv-column>
        <h2 class="page-title">{{$t("controller.title")}}</h2>
      </cv-column>
    </cv-row>
    <cv-row>
      <cv-column>
        <h3 class="page-subtitle">{{$t("controller.clients_list")}}</h3>
      </cv-column>
    </cv-row>
    <cv-row v-if="clients.length > 0">
      <cv-column>
        <cv-button kind="primary" size="field" @click="showAddClient()" :icon="Add20" class="main-button">
          {{$t("controller.add_client")}}
        </cv-button>
      </cv-column>
    </cv-row>
    <cv-row v-if="clients.length > 0">
      <cv-column v-for="(client, index) in clients" :key="index" :sm="2" :md="3" :lg="3">
        <div class="cv-grid-story__preview-col">
          <cv-tile kind="standard" class="basic-card">
            <cv-overflow-menu class="small-menu" :label="$t('controller.client_options')" :flip-menu="true" :up="false" :tip-position="'top'" :tip-alignment="'center'">
              <cv-overflow-menu-item @click="showDeleteClient(client)">
                <NsMenuItem :icon="TrashCan20" :label="$t('controller.delete_client')" />
              </cv-overflow-menu-item>
            </cv-overflow-menu>
            <h4>{{client.name}}</h4>
            <p>{{client.ipaddress}} | {{client.netmask}}</p>
            <cv-tooltip :alignment="'center'" :direction="'right'" :tip="client.valid ? $t('controller.client_registered') : $t('controller.client_unregistered')">
              <CheckmarkFilled20 class="icon-success" v-if="client.valid" />
              <ErrorFilled20 class="icon-error" v-if="!client.valid" />
            </cv-tooltip>
            <br />
            <br />
            <cv-button :kind="'primary'" @click="goTo('/manage/' + client.name)" :size="'sm'" :disabled="client.valid ? false : true">
              {{$t('controller.manage_client')}}
            </cv-button>

          </cv-tile>
        </div>
      </cv-column>
    </cv-row>
    <cv-row v-if="clients.length == 0">
      <cv-column :sm="12" :md="12" :lg="12">
        <cv-tile kind="standard" class="empty-state basic-card">
          <EdgeNode32 />
          <h4>{{$t("controller.no_clients")}}</h4>
          <p>{{$t("controller.no_clients_desc")}}</p>
          <cv-button kind="primary" size="field" @click="showAddClient()" :icon="Add20">
            {{$t("controller.add_client")}}
          </cv-button>
        </cv-tile>
      </cv-column>
    </cv-row>
  </cv-grid>

  <cv-modal :visible="modalAddClient.isVisible" @primary-click="addClient" @other-btn-click="hideAddClient" @modal-hidden="hideAddClient">
    <template slot="title">{{$t("controller.add_client")}}</template>
    <template slot="content">
      <div class="bx--form-item">
        <label class="bx--label">{{$t("controller.client_name")}}</label>
        <input v-model="newClient.name" type="text" class="bx--text-input" :placeholder="$t('controller.client_name')" data-modal-primary-focus>
      </div>
      <cv-inline-notification v-if="modalAddClient.errorShow" kind="error" :title="modalAddClient.errorTitle" :sub-title="modalAddClient.errorDetails" :low-contrast="true" :hide-close-button="true">
      </cv-inline-notification>
    </template>
    <template slot="other-button">{{$t("common.cancel")}}</template>
    <template slot="primary-button">
      <span v-if="!modalAddClient.isLoading">{{$t("common.add")}}</span>
      <cv-inline-loading v-if="modalAddClient.isLoading" :ending-text="modalAddClient.endingText" :error-text="modalAddClient.errorText" :loading-text="modalAddClient.loadingText" :loaded-text="modalAddClient.loadedText"
        :state="modalAddClient.state">
      </cv-inline-loading>
    </template>
  </cv-modal>

  <cv-modal :kind="'danger'" :visible="modalDeleteClient.isVisible" @primary-click="deleteClient" @other-btn-click="hideDeleteClient" @modal-hidden="hideDeleteClient">
    <template slot="title">{{$t("controller.delete_client")}}</template>
    <template slot="content">
      <p>{{$t("controller.client_delete_ask")}}: <strong>{{this.currentClient.name}}</strong>?</p>
    </template>
    <template slot="other-button">{{$t("common.cancel")}}</template>
    <template slot="primary-button">
      <span v-if="!modalDeleteClient.isLoading">{{$t("common.delete")}}</span>
      <cv-inline-loading v-if="modalDeleteClient.isLoading" :ending-text="modalDeleteClient.endingText" :error-text="modalDeleteClient.errorText" :loading-text="modalDeleteClient.loadingText" :loaded-text="modalDeleteClient.loadedText"
        :state="modalDeleteClient.state">
      </cv-inline-loading>
    </template>
  </cv-modal>

</div>
</template>

<script>
import to from "await-to-js";

import StorageService from "../services/storage";

import CheckmarkFilled20 from "@carbon/icons-vue/es/checkmark--filled/20";
import ErrorFilled20 from "@carbon/icons-vue/es/error--filled/20";
import EdgeNode32 from "@carbon/icons-vue/es/edge-node/32"
import Add20 from "@carbon/icons-vue/es/add/20"
import TrashCan20 from "@carbon/icons-vue/es/trash-can/20"

export default {
  name: 'Controller',
  mixins: [StorageService],
  components: {
    CheckmarkFilled20,
    ErrorFilled20,
    EdgeNode32,
  },
  data() {
    return {
      TrashCan20,
      Add20,
      isLoading: true,
      parentLoading: document.getElementsByClassName("bx--loading-overlay cv-loading").length > 0,
      clients: [],
      newClient: {
        name: ""
      },
      currentClient: {},
      modalAddClient: {
        isLoading: false,
        isVisible: false,
        endingText: "",
        errorText: "",
        loadingText: "",
        loadedText: "",
        state: "loading"
      },
      modalDeleteClient: {
        isLoading: false,
        isVisible: false,
        endingText: "",
        errorText: "",
        loadingText: "",
        loadedText: "",
        state: "loading"
      }
    };
  },
  mounted() {
    // set page title
    document.title = this.$root.config.PRODUCT_NAME + " - " + this.$t("controller.title");

    // set page
    this.$parent.$parent.page = "[" + this.$t("controller.title") + "]";

    // get dashboard info
    this.getClientList()

    // polling to get clients connestions: 15 seconds
    var context = this;
    setInterval(function() {
      context.testClientConnections();
    }, 15000)
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
      const [clientsError, clientsResponse] = await to(this.axios
        .get(`${this.$root.serverURL}/servers`, {
          headers: {
            Authorization: `Bearer ${loginInfo.access_token}`,
          }
        })
      );

      // check error
      if (clientsError || !clientsResponse) {
        console.log(clientsError);
        this.isLogged = false;
        this.isLoading = false;
        this.deleteFromStorage("loginInfo")
        return
      }

      // set clients list
      this.clients = clientsResponse.data

      // test connections
      this.testClientConnections();

      // all done
      this.isLoading = false;
      this.isLogged = true;

    },
    async testClientConnections() {
      // loop clients
      for (var c in this.clients) {
        // test auth
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
            name: this.clients[c].name
          }, {
            headers: {
              Authorization: `Bearer ${loginInfo.access_token}`,
            }
          })
        );

        // check error
        if (loginError || !loginResponse) {
          this.clients[c].valid = false;
        } else {
          // all done
          this.clients[c].valid = true;
        }
      }
    },
    showAddClient() {
      // clean object fields
      this.newClient.name = "";

      // open modal
      this.modalAddClient.isVisible = true;
      this.modalAddClient.isLoading = false;
      this.modalAddClient.state = "loading";
      this.modalAddClient.errorShow = false;
      this.modalAddClient.errorTitle = "";
      this.modalAddClient.errorDetails = "";

    },
    hideAddClient() {
      // hide modal
      this.modalAddClient.isVisible = false;
    },
    showDeleteClient(client) {
      // clean object fields
      this.currentClient = client;

      // open modal
      this.modalDeleteClient.isVisible = true;
      this.modalDeleteClient.isLoading = false;
      this.modalDeleteClient.state = "loading";
      this.modalDeleteClient.errorShow = false;
      this.modalDeleteClient.errorTitle = "";
      this.modalDeleteClient.errorDetails = "";

    },
    hideDeleteClient() {
      // hide modal
      this.modalDeleteClient.isVisible = false;
    },
    async addClient() {
      // set loading
      this.modalAddClient.isLoading = true;
      this.modalAddClient.state = "loading";
      this.modalAddClient.loadingText = this.$t("controller.client_adding");

      // get loginInfo
      const loginInfo = this.getFromStorage("loginInfo")

      // check loginInfo
      if (!loginInfo) {
        this.isLoading = false;
        this.isLogged = false;
        return
      }

      // invoke
      const [clientsError, clientsResponse] = await to(this.axios
        .post(`${this.$root.serverURL}/servers`, {
          name: this.newClient.name
        }, {
          headers: {
            Authorization: `Bearer ${loginInfo.access_token}`,
          }
        })
      );

      // check error
      if (clientsError || !clientsResponse) {
        console.error(clientsError);

        this.modalAddClient.state = "error";
        this.modalAddClient.errorText = this.$t("controller.client_adding_error");
        this.modalAddClient.errorShow = true;
        this.modalAddClient.errorTitle = "QUI-TITOLO-ERRORE";
        this.modalAddClient.errorDetails = "QUI-DETTAGLIO-ERRORI";
        return
      }

      // all done
      var context = this;
      this.modalAddClient.state = "loaded";
      this.modalAddClient.loadedText = this.$t("controller.client_adding_success");
      this.getClientList();
      setTimeout(function() {
        context.modalAddClient.isVisible = false;
      }, 1500);
    },
    async deleteClient() {
      // set loading
      this.modalDeleteClient.isLoading = true;
      this.modalDeleteClient.state = "loading";
      this.modalDeleteClient.loadingText = this.$t("controller.client_deleting");

      // get loginInfo
      const loginInfo = this.getFromStorage("loginInfo")

      // check loginInfo
      if (!loginInfo) {
        this.isLoading = false;
        this.isLogged = false;
        return
      }

      // invoke
      const [clientsError, clientsResponse] = await to(this.axios
        .delete(`${this.$root.serverURL}/servers/${this.currentClient.name}`, {
          headers: {
            Authorization: `Bearer ${loginInfo.access_token}`,
          }
        })
      );

      // check error
      if (clientsError || !clientsResponse) {
        console.error(clientsError);

        this.modalDeleteClient.state = "error";
        this.modalDeleteClient.errorText = this.$t("controller.client_deleting_error");
        this.modalDeleteClient.errorShow = true;
        this.modalDeleteClient.errorTitle = "QUI-TITOLO-ERRORE-DEL";
        this.modalDeleteClient.errorDetails = "QUI-DETTAGLIO-ERRORI-DEL";
        return
      }

      // all done
      var context = this;
      this.modalDeleteClient.state = "loaded";
      this.modalDeleteClient.loadedText = this.$t("controller.client_deleting_success");
      this.getClientList();
      setTimeout(function() {
        context.modalDeleteClient.isVisible = false;
      }, 1500);
    },

  },
};
</script>

<style>
</style>
