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
    <cv-row>
      <cv-column :sm="2" :md="2" :lg="2">
        <cv-tooltip :alignment="'center'" :direction="'right'" :tip="$t('controller.change_view_mode')">
          <cv-content-switcher class="override-spaces" :size="'sm'" @selected="selectView">
            <cv-content-switcher-button owner-id="list" :selected="isSelected('list')" :icon="ListBoxes20"></cv-content-switcher-button>
            <cv-content-switcher-button owner-id="card" :selected="isSelected('card')" :icon="Thumbnail20"></cv-content-switcher-button>
          </cv-content-switcher>
        </cv-tooltip>
      </cv-column>
    </cv-row>
    <cv-row v-if="clients.length > 0">
      <cv-column>
        <h4 class="page-sub-subtitle">{{$t("controller.clients_registered")}}</h4>
      </cv-column>
    </cv-row>
    <cv-row v-if="clients.length > 0 && viewMode.defaultSelected == 'list'">
      <cv-data-table :columns="clientColumns" :pagination="false" :overflow-menu="false" ref="table">
        <template slot="data">
          <cv-data-table-row v-for="(client, index) in clients" :key="index" v-show="client.registered">
            <cv-data-table-cell>{{client.name}}</cv-data-table-cell>
            <cv-data-table-cell>{{client.ipaddress}}</cv-data-table-cell>
            <cv-data-table-cell>{{client.netmask}}</cv-data-table-cell>
            <cv-data-table-cell>
              <cv-tooltip :alignment="'center'" :direction="'top'" :tip="client.vpn ? $t('controller.client_connected') : $t('controller.client_not_connected')">
                <CheckmarkFilled20 class="icon-success" v-if="client.vpn" />
                <ErrorFilled20 class="icon-error" v-if="!client.vpn" />
              </cv-tooltip>
            </cv-data-table-cell>
            <cv-data-table-cell>
              <cv-interactive-tooltip v-if="client.vpn" :alignment="'center'" :direction="'top'" :visible="false" class="card-tooltip">
                <template slot="trigger">
                  <a>{{$t("common.show")}}</a>
                </template>
                <template slot="content">
                  <p>
                    <span class="margin-right">{{$t("controller.stats_bytes_rcvd")}}:</span> <span class="float-right"><strong>{{client.vpn.bytes_rcvd | byteFormat}}</strong></span>
                    <br />
                    <span class="margin-right">{{$t("controller.stats_bytes_sent")}}:</span> <span class="float-right"><strong>{{client.vpn.bytes_sent | byteFormat}}</strong></span>
                    <br />
                    <span class="margin-right">{{$t("controller.stats_connected_since")}}:</span> <span class="float-right"><strong>{{client.vpn.connected_since | timestampToDate}} ({{$t("controller.local_time")}})</strong></span>
                    <br />
                    <span class="margin-right">{{$t("controller.stats_real_address")}}:</span> <span class="float-right"><strong>{{client.vpn.real_address}}</strong></span>
                    <br />
                    <span class="margin-right">{{$t("controller.stats_virtual_address")}}:</span> <span class="float-right"><strong>{{client.vpn.virtual_address}}</strong></span>
                  </p>
                </template>
              </cv-interactive-tooltip>
            </cv-data-table-cell>
            <cv-data-table-cell>
              <cv-button :kind="'primary'" @click="goTo('/manage/' + client.name)" :icon="CloudServiceManagement20" :size="'sm'" :disabled="client.vpn ? false : true">
                {{$t('controller.manage_client')}}
              </cv-button>
            </cv-data-table-cell>
            <cv-data-table-cell>
              <cv-overflow-menu class="small-menu" :label="$t('controller.client_options')" :flip-menu="true" :up="false" :tip-position="'left'" :tip-alignment="'center'">
                <cv-overflow-menu-item @click="showDeleteClient(client)">
                  <div class="menu-item">
                    <TrashCan20 class="menu-item-icon" />
                    <span class="menu-item-label">{{$t('controller.delete_client')}}</span>
                  </div>
                </cv-overflow-menu-item>
              </cv-overflow-menu>
            </cv-data-table-cell>
          </cv-data-table-row>
        </template>
      </cv-data-table>
    </cv-row>
    <cv-row v-if="clients.length > 0 && viewMode.defaultSelected == 'card'">
      <cv-column v-for="(client, index) in clients" :key="index" :sm="2" :md="3" :lg="3" v-show="client.registered">
        <div v-if="client.registered" class="cv-grid-story__preview-col">
          <cv-tile kind="standard" class="basic-card">
            <cv-overflow-menu class="small-menu" :label="$t('controller.client_options')" :flip-menu="true" :up="false" :tip-position="'top'" :tip-alignment="'center'">
              <cv-overflow-menu-item @click="showDeleteClient(client)">
                <div class="menu-item">
                  <TrashCan20 class="menu-item-icon" />
                  <span class="menu-item-label">{{$t('controller.delete_client')}}</span>
                </div>
              </cv-overflow-menu-item>
            </cv-overflow-menu>
            <h4>{{client.name}}</h4>
            <p>{{client.ipaddress}} | {{client.netmask}}</p>
            <cv-tooltip :alignment="'center'" :direction="'right'" :tip="client.vpn ? $t('controller.client_connected') : $t('controller.client_not_connected')">
              <CheckmarkFilled20 class="icon-success" v-if="client.vpn" />
              <ErrorFilled20 class="icon-error" v-if="!client.vpn" />
            </cv-tooltip>

            <cv-interactive-tooltip v-if="client.vpn" :alignment="'center'" :direction="'right'" :visible="false" class="card-tooltip">
              <template slot="trigger">
                <a>{{$t("controller.vpn_statistics")}}</a>
              </template>
              <template slot="content">
                <p>
                  <span class="margin-right">{{$t("controller.stats_bytes_rcvd")}}:</span> <span class="float-right"><strong>{{client.vpn.bytes_rcvd | byteFormat}}</strong></span>
                  <br />
                  <span class="margin-right">{{$t("controller.stats_bytes_sent")}}:</span> <span class="float-right"><strong>{{client.vpn.bytes_sent | byteFormat}}</strong></span>
                  <br />
                  <span class="margin-right">{{$t("controller.stats_connected_since")}}:</span> <span class="float-right"><strong>{{client.vpn.connected_since | timestampToDate}} ({{$t("controller.local_time")}})</strong></span>
                  <br />
                  <span class="margin-right">{{$t("controller.stats_real_address")}}:</span> <span class="float-right"><strong>{{client.vpn.real_address}}</strong></span>
                  <br />
                  <span class="margin-right">{{$t("controller.stats_virtual_address")}}:</span> <span class="float-right"><strong>{{client.vpn.virtual_address}}</strong></span>
                </p>
              </template>
            </cv-interactive-tooltip>
            <br />
            <br />
            <cv-button :kind="'primary'" @click="goTo('/manage/' + client.name)" :icon="CloudServiceManagement20" :size="'sm'" :disabled="client.vpn ? false : true">
              {{$t('controller.manage_client')}}
            </cv-button>
          </cv-tile>
        </div>
      </cv-column>
    </cv-row>
    <cv-row v-if="clients.length > 0">
      <cv-column>
        <h4 class="page-sub-subtitle">{{$t("controller.clients_not_registered")}}</h4>
      </cv-column>
    </cv-row>
    <cv-row v-if="clients.length > 0 && viewMode.defaultSelected == 'list'">
      <cv-data-table :columns="clientColumns" :pagination="false" :overflow-menu="false" ref="table">
        <template slot="data">
          <cv-data-table-row v-for="(client, index) in clients" :key="index" v-show="!client.registered">
            <cv-data-table-cell>{{client.name}}</cv-data-table-cell>
            <cv-data-table-cell>-</cv-data-table-cell>
            <cv-data-table-cell>-</cv-data-table-cell>
            <cv-data-table-cell>
              <cv-tooltip :alignment="'center'" :direction="'top'" :tip="$t('controller.client_not_registered')">
                <InProgress20 />
              </cv-tooltip>
            </cv-data-table-cell>
            <cv-data-table-cell>
              -
            </cv-data-table-cell>
            <cv-data-table-cell>
              <cv-button :kind="'primary'" @click="showAddClient(client.name)" :icon="Checkmark20" :size="'sm'">
                {{$t('controller.approve_client')}}
              </cv-button>
            </cv-data-table-cell>
            <cv-data-table-cell>
              <cv-overflow-menu class="small-menu" :label="$t('controller.client_options')" :flip-menu="true" :up="false" :tip-position="'left'" :tip-alignment="'center'">
                <cv-overflow-menu-item @click="showDeleteClient(client)">
                  <div class="menu-item">
                    <TrashCan20 class="menu-item-icon" />
                    <span class="menu-item-label">{{$t('controller.delete_client')}}</span>
                  </div>
                </cv-overflow-menu-item>
              </cv-overflow-menu>
            </cv-data-table-cell>
          </cv-data-table-row>
        </template>
      </cv-data-table>
    </cv-row>
    <cv-row v-if="clients.length > 0 && viewMode.defaultSelected == 'card'">
      <cv-column v-for="(client, index) in clients" :key="index" :sm="2" :md="3" :lg="3" v-show="!client.registered">
        <div v-if="!client.registered" class="cv-grid-story__preview-col">
          <cv-tile kind="standard" class="basic-card">
            <cv-overflow-menu class="small-menu" :label="$t('controller.client_options')" :flip-menu="true" :up="false" :tip-position="'top'" :tip-alignment="'center'">
              <cv-overflow-menu-item @click="showDeleteClient(client)">
                <div class="menu-item">
                  <TrashCan20 class="menu-item-icon" />
                  <span class="menu-item-label">{{$t('controller.delete_client')}}</span>
                </div>
              </cv-overflow-menu-item>
            </cv-overflow-menu>
            <h4>{{client.name}}</h4>
            <p>{{$t("controller.waiting_approval")}}...</p>
            <cv-tooltip :alignment="'center'" :direction="'right'" :tip="$t('controller.client_not_registered')">
              <InProgress20 />
            </cv-tooltip>
            <br />
            <br />
            <cv-button :kind="'primary'" @click="showAddClient(client.name)" :icon="Checkmark20" :size="'sm'">
              {{$t('controller.approve_client')}}
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
    <template slot="title">{{newClient.exists ? $t("controller.approve_client") : $t("controller.add_client")}}</template>
    <template slot="content">
      <div class="bx--form-item">
        <label class="bx--label">{{$t("controller.client_name")}}</label>
        <input v-model="newClient.name" type="text" class="bx--text-input" :placeholder="$t('controller.client_name')" data-modal-primary-focus v-if="!newClient.exists">
        <cv-tooltip v-if="newClient.exists" :alignment="'center'" :direction="'right'" :tip="$t('controller.client_name_disabled')">
          <input v-model="newClient.name" type="text" class="bx--text-input" :placeholder="$t('controller.client_name')" data-modal-primary-focus disabled>
        </cv-tooltip>
      </div>
      <cv-inline-notification v-if="modalAddClient.errorShow" kind="error" :title="modalAddClient.errorTitle" :sub-title="modalAddClient.errorDetails" :low-contrast="true" :hide-close-button="true">
      </cv-inline-notification>
    </template>
    <template slot="other-button">{{$t("common.cancel")}}</template>
    <template slot="primary-button">
      <span v-if="!modalAddClient.isLoading">{{newClient.exists ? $t("common.approve") : $t("common.add")}}</span>
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

import Checkmark20 from "@carbon/icons-vue/es/checkmark/20";
import CheckmarkFilled20 from "@carbon/icons-vue/es/checkmark--filled/20";
import ErrorFilled20 from "@carbon/icons-vue/es/error--filled/20";
import InProgress20 from "@carbon/icons-vue/es/in-progress/20";
import EdgeNode32 from "@carbon/icons-vue/es/edge-node/32"
import Add20 from "@carbon/icons-vue/es/add/20"
import TrashCan20 from "@carbon/icons-vue/es/trash-can/20"
import CloudServiceManagement20 from "@carbon/icons-vue/es/cloud--service-management/20"
import ListBoxes20 from "@carbon/icons-vue/es/list--boxes/20"
import Thumbnail20 from "@carbon/icons-vue/es/thumbnail--2/20"

export default {
  name: 'Controller',
  mixins: [StorageService],
  components: {
    CheckmarkFilled20,
    ErrorFilled20,
    EdgeNode32,
    TrashCan20,
    InProgress20
  },
  data() {
    return {
      Checkmark20,
      CloudServiceManagement20,
      Add20,
      ListBoxes20,
      Thumbnail20,
      isLoading: true,
      parentLoading: document.getElementsByClassName("bx--loading-overlay cv-loading").length > 0,
      clients: [],
      newClient: {
        name: "",
        exists: false
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
      },
      viewMode: {
        defaultSelected: this.getFromStorage("controller-viewMode") || 'list',
      },
      clientColumns: [
        this.$t("controller.column_name"),
        this.$t("controller.column_ip_address"),
        this.$t("controller.column_netmask"),
        this.$t("controller.column_status"),
        this.$t("controller.column_statistics"),
        this.$t("controller.column_actions"),
        ''
      ]
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
      context.getClientList();
    }, 15000)
  },
  methods: {
    goTo(path) {
      this.$router.push(path);
    },
    isSelected(type) {
      return this.viewMode.defaultSelected == type;
    },
    selectView(type) {
      this.viewMode.defaultSelected = type;
      this.saveToStorage("controller-viewMode", this.viewMode.defaultSelected);
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
        console.error(clientsError);
        this.isLogged = false;
        this.isLoading = false;
        this.deleteFromStorage("loginInfo")
        return
      }

      // set clients list
      this.clients = clientsResponse.data

      // all done
      this.isLoading = false;
      this.isLogged = true;

    },
    showAddClient(name) {
      // clean object fields
      this.newClient.name = name ? name : "";
      this.newClient.exists = name ? true : false;

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
.menu-item {
  display: flex;
  align-items: center;
}

.menu-item-icon {
  margin-right: 0.5rem;
}

.menu-item-label {
  margin-top: 3px;
}
</style>
