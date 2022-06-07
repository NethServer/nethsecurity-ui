<template>
<div class="content">
  <cv-grid fullWidth>
    <cv-row>
      <cv-column class="no-margin-bottom">
        <h2 class="page-title">{{$t("manage.dashboard")}}</h2>
      </cv-column>
    </cv-row>
    <cv-row>
      <!-- SYSTEM -->
      <cv-column :sm="12" :md="4" :lg="4">
        <cv-tile>
          <h1>System</h1>
          <p>Uptime<span class="float-right">{{1654613439 | timestampToDate}}</span></p>
          <p>Version<span class="float-right">{{'NextSecurity 22.03.0-rc1'}}</span></p>
          <cv-interactive-tooltip :alignment="'center'" :direction="'right'" class="card-tooltip float-right" :tip="$t('controller.client_not_connected')">
            <template slot="trigger">
              <a>{{$t("common.more_info")}}</a>
            </template>
            <template slot="content">
              <p>
                <span class="margin-right">{{$t("manage.local_time")}}:</span> <span class="float-right"><strong>{{1654613439 | timestampToDate}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.kernel_version")}}:</span> <span class="float-right"><strong>{{'5.10.111'}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.model")}}:</span> <span class="float-right"><strong>{{'innotek GmbH VirtualBox'}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.architecture")}}:</span> <span class="float-right"><strong>{{'Intel(R) Core(TM) i5-1035G1 CPU @ 1.00GHz'}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.firware_version")}}:</span> <span class="float-right"><strong>{{'NextSecurity 22.03.0-rc1 r19302-df622768da'}}</strong></span>
                <br />
              </p>
            </template>
          </cv-interactive-tooltip>
          <br />
        </cv-tile>
      </cv-column>
      <!-- END SYSTEM -->
      <!-- HOSTNAME -->
      <cv-column :sm="12" :md="4" :lg="4">
        <cv-tile>
          <h1>Hostname</h1>
          <h2>nextsec-local</h2>
        </cv-tile>
      </cv-column>
      <!-- END HOSTNAME -->
      <!-- INTERNET -->
      <cv-column :sm="12" :md="4" :lg="4">
        <cv-tile>
          <h1>Internet</h1>
          <p class="inline-block">IPv4: <strong>192.168.122.8</strong></p>
          <cv-tooltip class="float-right" :alignment="'center'" :direction="'left'" :tip="true ? $t('manage.ipv4_connected') : $t('manage.ipv4_not_connected')">
            <ErrorFilled20 class="icon-error" v-if="false" />
            <CheckmarkFilled20 class="icon-success" v-if="true" />
          </cv-tooltip>
          <cv-interactive-tooltip :alignment="'center'" :direction="'left'" class="card-tooltip float-right" :tip="$t('controller.client_not_connected')">
            <template slot="trigger">
              <a class="margin-right-min">{{$t("common.show_details")}}</a>
            </template>
            <template slot="content">
              <p>
                <span class="margin-right">{{$t("manage.connected_since")}}:</span> <span class="float-right"><strong>{{1654613439 | timestampToDate}} ({{$t("manage.local_time")}})</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.protocol")}}:</span> <span class="float-right"><strong>{{'DHCP Client'}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.ipv4")}}:</span> <span class="float-right"><strong>{{'192.168.122.8'}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.gatewayv4")}}:</span> <span class="float-right"><strong>{{'192.168.122.1'}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.dnsv4")}}:</span> <span class="float-right"><strong>{{'192.168.122.1'}}</strong></span>
                <br />
              </p>
            </template>
          </cv-interactive-tooltip>
          <br />
          <p class="inline-block">IPv6</p>
          <cv-tooltip class="float-right" :alignment="'center'" :direction="'left'" :tip="false ? $t('manage.ipv6_connected') : $t('manage.ipv6_not_connected')">
            <ErrorFilled20 class="icon-error" v-if="true" />
            <CheckmarkFilled20 class="icon-success" v-if="false" />
          </cv-tooltip>
          <cv-interactive-tooltip v-if="false" :alignment="'center'" :direction="'left'" class="card-tooltip float-right" :tip="$t('controller.client_not_connected')">
            <template slot="trigger">
              <a class="margin-right-min">{{$t("common.show_details")}}</a>
            </template>
            <template slot="content">
              <p>
                <span class="margin-right">{{$t("manage.connected_since")}}:</span> <span class="float-right"><strong>{{1654613439 | timestampToDate}} ({{$t("manage.local_time")}})</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.protocol")}}:</span> <span class="float-right"><strong>{{'DHCP Client'}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.ipv6")}}:</span> <span class="float-right"><strong>{{'192.168.122.8'}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.gatewayv6")}}:</span> <span class="float-right"><strong>{{'192.168.122.1'}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.dnsv6")}}:</span> <span class="float-right"><strong>{{'192.168.122.1'}}</strong></span>
                <br />
              </p>
            </template>
          </cv-interactive-tooltip>
        </cv-tile>
      </cv-column>
      <!-- END INTERNET -->
    </cv-row>
    <cv-row>
      <cv-column :sm="12" :md="12" :lg="6">
        <cv-tile>
          <h1>Hello</h1>
          <p>This is some tile content.</p>
        </cv-tile>
      </cv-column>
      <cv-column :sm="12" :md="12" :lg="6">
        <cv-tile>
          <h1>Hello</h1>
          <p>This is some tile content.</p>
        </cv-tile>
      </cv-column>
    </cv-row>
    <cv-row>
      <cv-column :sm="12" :md="12" :lg="12">
        <cv-tile>
          <h1>Hello</h1>
          <p>This is some tile content.</p>
        </cv-tile>
      </cv-column>
    </cv-row>
  </cv-grid>

</div>
</template>

<script>
import to from "await-to-js";

import StorageService from "../../services/storage";

import CheckmarkFilled20 from "@carbon/icons-vue/es/checkmark--filled/20";
import ErrorFilled20 from "@carbon/icons-vue/es/error--filled/20";

export default {
  name: 'Dashboard',
  mixins: [StorageService],
  components: {
    CheckmarkFilled20,
    ErrorFilled20,
  },
  data() {
    return {
      clientId: this.$route.path.indexOf('/configuration') > -1 ? 'stand-alone' : this.$route.params.clientId,
      configIds: [
        'adblock',
        'banip',
        'dhcp',
        'dropbear',
        'firewall',
        'luci',
        'mwan3',
        'netifyd',
        'network',
        'nginx',
        'ns-plug',
        'penssl',
        'openvpn',
        'openvpn_recipes',
        'rpcd',
        'sqm',
        'system',
        'ucitrack',
        'uhttpd'
      ],
      configs: {}
    };
  },
  mounted() {
    // set page title
    document.title = this.$root.config.PRODUCT_NAME + " - " + this.$t("manage.dashboard");

    // get dashboard data
    this.getDashboardData()
  },
  methods: {
    goTo(path) {
      this.$router.push(path);
    },
    async getDashboardData() {
      // get clientInfo
      const clientInfo = this.getFromStorage("clientInfo-" + this.clientId)

      // check clientInfo
      if (!clientInfo) {
        this.$store.state.manage.isLoading = false;
        this.$store.state.manage.isLogged = false;
        if (!this.$store.state.manage.isStandAlone) {
          this.$parent.login()
        }
        return
      }

      // invoke
      for (var c in this.configIds) {
        var configId = this.configIds[c];

        // execute config read
        const [err, response] = await to(this.axios
          .post(`${this.$root.luciURL}/uci?auth=${clientInfo.token}`.replace("_CLIENT_", this.clientId), {
            "method": "get_all",
            "params": [
              configId
            ]
          })
        );

        // check error
        if (err || !response) {
          this.$store.state.manage.isLogged = false;
          this.$store.state.manage.isLoading = false;
          this.deleteFromStorage("clientInfo-" + this.clientId)
          if (!this.$store.state.manage.isStandAlone) {
            this.login()
          }
          return
        }

        // all done
        this.configs[configId] = response.data.result;
      }

      // set all configs
      this.$store.state.manage.configs = this.configs;

      // all done
      this.$store.state.manage.isLogged = true;
      this.$store.state.manage.isLoading = false;
    }
  },
};
</script>

<style>

</style>
