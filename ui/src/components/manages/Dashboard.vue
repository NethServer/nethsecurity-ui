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
      <cv-column :sm="12" :md="6" :lg="6">
        <cv-tile class="dashboard-card">
          <h1>{{$t("manage.system")}}</h1>
          <p>{{$t("manage.version")}}
            <span v-if="!$store.state.manage.board.release" class="float-right max-height">
              <cv-inline-loading :state="'loading'" :loading-text="''"></cv-inline-loading>
            </span>
            <span v-if="$store.state.manage.board.release" class="float-right">
              {{$store.state.manage.board.release.distribution}} {{$store.state.manage.board.release.version}}
            </span>
          </p>
          <p>{{$t("manage.uptime")}}
            <span v-if="!$store.state.manage.info.uptime" class="float-right max-height">
              <cv-inline-loading :state="'loading'" :loading-text="''"></cv-inline-loading>
            </span>
            <span v-if="$store.state.manage.info.uptime" class="float-right">{{$store.state.manage.info.uptime | secondsFormat}}</span>
          </p>
          <cv-interactive-tooltip v-if="$store.state.manage.info.localtime" :alignment="'center'" :direction="'right'" class="card-tooltip float-right" :tip="$t('controller.client_not_connected')">
            <template slot="trigger">
              <a>{{$t("common.more_info")}}</a>
            </template>
            <template slot="content">
              <p>
                <span class="margin-right">{{$t("manage.local_time")}}:</span> <span class="float-right"><strong>{{$store.state.manage.info.localtime | timestampToDate}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.kernel_version")}}:</span> <span class="float-right"><strong>{{$store.state.manage.board.kernel}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.model")}}:</span> <span class="float-right"><strong>{{$store.state.manage.board.model}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.architecture")}}:</span> <span class="float-right"><strong>{{$store.state.manage.board.system}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.firware_version")}}:</span> <span class="float-right"><strong>{{$store.state.manage.board.release && $store.state.manage.board.release.description}}</strong></span>
                <br />
              </p>
            </template>
          </cv-interactive-tooltip>
          <br />
        </cv-tile>
      </cv-column>
      <!-- END SYSTEM -->
      <!-- HOSTNAME -->
      <cv-column :sm="12" :md="6" :lg="6">
        <cv-tile class="dashboard-card">
          <h1>Hostname</h1>
          <span v-if="!$store.state.manage.board.hostname" class="max-height">
            <cv-inline-loading :state="'loading'" :loading-text="''"></cv-inline-loading>
          </span>
          <h3 v-if="$store.state.manage.board.hostname">
            <code>{{$store.state.manage.board.hostname}}</code>
          </h3>
        </cv-tile>
      </cv-column>
      <!-- END HOSTNAME -->
      <!-- LAN -->
      <cv-column :sm="12" :md="6" :lg="6">
        <cv-tile class="dashboard-card">
          <h1>LAN</h1>
          <p class="inline-block">IPv4:
            <strong v-if="$store.state.manage.lan && $store.state.manage.lan['ipv4-address'] && $store.state.manage.lan['ipv4-address'].length > 0">
              {{$store.state.manage.lan && $store.state.manage.lan['ipv4-address'] && $store.state.manage.lan['ipv4-address'][0] && $store.state.manage.lan['ipv4-address'][0].address}}
              <span>({{$store.state.manage.lan && $store.state.manage.lan.device}})</span>
            </strong>
          </p>
          <cv-tooltip class="float-right" :alignment="'center'" :direction="'left'" :tip="true ? $t('manage.ipv4_connected') : $t('manage.ipv4_not_connected')">
            <ErrorFilled20 class="icon-error" v-if="$store.state.manage.lan && $store.state.manage.lan['ipv4-address'] && $store.state.manage.lan['ipv4-address'].length == 0" />
            <CheckmarkFilled20 class="icon-success" v-if="$store.state.manage.lan && $store.state.manage.lan['ipv4-address'] && $store.state.manage.lan['ipv4-address'].length > 0" />
          </cv-tooltip>
          <cv-interactive-tooltip v-if="$store.state.manage.lan && $store.state.manage.lan['ipv4-address'] && $store.state.manage.lan['ipv4-address'].length > 0" :alignment="'center'" :direction="'left'" class="card-tooltip float-right"
            :tip="$t('controller.client_not_connected')">
            <template slot="trigger">
              <a class="margin-right-min">{{$t("common.show_details")}}</a>
            </template>
            <template slot="content">
              <p>
                <span class="margin-right">{{$t("manage.connected_since")}}:</span> <span class="float-right"><strong>{{$store.state.manage.lan && $store.state.manage.lan.uptime | secondsFormat}} ({{$t("manage.local_time")}})</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.protocol")}}:</span> <span class="float-right"><strong>{{$store.state.manage.lan && $store.state.manage.lan.proto && $store.state.manage.lan.proto.toUpperCase()}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.gatewayv4")}}:</span> <span
                  class="float-right"><strong>{{$store.state.manage.lan && $store.state.manage.lan.route && $store.state.manage.lan.route[0] && $store.state.manage.lan.route[0].nexthop}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.dnsv4")}}:</span> <span class="float-right"><strong>{{$store.state.manage.lan && $store.state.manage.lan['dns-server'] && $store.state.manage.lan['dns-server'].join(', ')}}</strong></span>
                <br />
              </p>
            </template>
          </cv-interactive-tooltip>
        </cv-tile>
      </cv-column>
      <!-- LAN -->
      <!-- INTERNET -->
      <cv-column :sm="12" :md="6" :lg="6">
        <cv-tile class="dashboard-card">
          <h1>WAN</h1>
          <p class="inline-block">IPv4:
            <strong v-if="$store.state.manage.wan && $store.state.manage.wan['ipv4-address'] && $store.state.manage.wan['ipv4-address'].length > 0">
              {{$store.state.manage.wan && $store.state.manage.wan['ipv4-address'] && $store.state.manage.wan['ipv4-address'][0] && $store.state.manage.wan['ipv4-address'][0].address}}
              <span>({{$store.state.manage.wan && $store.state.manage.wan.device}})</span>
            </strong>
          </p>
          <cv-tooltip class="float-right" :alignment="'center'" :direction="'left'" :tip="true ? $t('manage.ipv4_connected') : $t('manage.ipv4_not_connected')">
            <ErrorFilled20 class="icon-error" v-if="$store.state.manage.wan && $store.state.manage.wan['ipv4-address'] && $store.state.manage.wan['ipv4-address'].length == 0" />
            <CheckmarkFilled20 class="icon-success" v-if="$store.state.manage.wan && $store.state.manage.wan['ipv4-address'] && $store.state.manage.wan['ipv4-address'].length > 0" />
          </cv-tooltip>
          <cv-interactive-tooltip v-if="$store.state.manage.wan && $store.state.manage.wan['ipv4-address'] && $store.state.manage.wan['ipv4-address'].length > 0" :alignment="'center'" :direction="'left'" class="card-tooltip float-right"
            :tip="$t('controller.client_not_connected')">
            <template slot="trigger">
              <a class="margin-right-min">{{$t("common.show_details")}}</a>
            </template>
            <template slot="content">
              <p>
                <span class="margin-right">{{$t("manage.connected_since")}}:</span> <span class="float-right"><strong>{{$store.state.manage.wan && $store.state.manage.wan.uptime | secondsFormat}} ({{$t("manage.local_time")}})</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.protocol")}}:</span> <span class="float-right"><strong>{{$store.state.manage.wan && $store.state.manage.wan.proto && $store.state.manage.wan.proto.toUpperCase()}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.gatewayv4")}}:</span> <span
                  class="float-right"><strong>{{$store.state.manage.wan && $store.state.manage.wan.route && $store.state.manage.wan.route[0] && $store.state.manage.wan.route[0].nexthop}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.dnsv4")}}:</span> <span class="float-right"><strong>{{$store.state.manage.wan && $store.state.manage.wan['dns-server'] && $store.state.manage.wan['dns-server'].join(', ')}}</strong></span>
                <br />
              </p>
            </template>
          </cv-interactive-tooltip>
          <br />
          <p class="inline-block">IPv6:
            <strong v-if="$store.state.manage.wan && $store.state.manage.wan['ipv6-address'] && $store.state.manage.wan['ipv6-address'].length > 0">
              {{ $store.state.manage.wan && $store.state.manage.wan['ipv6-address'] && $store.state.manage.wan['ipv6-address'][0] && $store.state.manage.wan['ipv6-address'][0].address }}
              ({{$store.state.manage.wan && $store.state.manage.wan.device}})</strong>
          </p>
          <cv-tooltip class="float-right" :alignment="'center'" :direction="'left'" :tip="true ? $t('manage.ipv6_connected') : $t('manage.ipv6_not_connected')">
            <ErrorFilled20 class="icon-error" v-if="$store.state.manage.wan && $store.state.manage.wan['ipv6-address'] && $store.state.manage.wan['ipv6-address'].length == 0" />
            <CheckmarkFilled20 class="icon-success" v-if="$store.state.manage.wan && $store.state.manage.wan['ipv6-address'] && $store.state.manage.wan['ipv6-address'].length > 0" />
          </cv-tooltip>
          <cv-interactive-tooltip v-if="$store.state.manage.wan && $store.state.manage.wan['ipv6-address'] && $store.state.manage.wan['ipv6-address'].length > 0" :alignment="'center'" :direction="'left'" class="card-tooltip float-right"
            :tip="$t('controller.client_not_connected')">
            <template slot="trigger">
              <a class="margin-right-min">{{$t("common.show_details")}}</a>
            </template>
            <template slot="content">
              <p>
                <span class="margin-right">{{$t("manage.connected_since")}}:</span> <span class="float-right"><strong>{{$store.state.manage.wan && $store.state.manage.wan.uptime | secondsFormat}} ({{$t("manage.local_time")}})</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.protocol")}}:</span> <span class="float-right"><strong>{{$store.state.manage.wan && $store.state.manage.wan.proto && $store.state.manage.wan.proto.toUpperCase()}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.gatewayv6")}}:</span> <span
                  class="float-right"><strong>{{$store.state.manage.wan && $store.state.manage.wan.route && $store.state.manage.wan.route[0] && $store.state.manage.wan.route[0].nexthop}}</strong></span>
                <br />
                <span class="margin-right">{{$t("manage.dnsv6")}}:</span> <span class="float-right"><strong>{{$store.state.manage.wan && $store.state.manage.wan['dns-server'] && $store.state.manage.wan['dns-server'].join(', ')}}</strong></span>
                <br />
              </p>
            </template>
          </cv-interactive-tooltip>
        </cv-tile>
      </cv-column>
      <!-- END INTERNET -->
    </cv-row>
    <cv-row>
      <cv-column :sm="12" :md="12" :lg="12">
        <cv-tile class="dashboard-card">
          <h1>
            {{$t("manage.connections")}}
            <cv-tooltip :alignment="'center'" :direction="'right'" :tip="$t('manage.3mw_3si')"></cv-tooltip>
          </h1>
          <div>
            <div id="connections-chart-legend" class="chart-legend"></div>
            <div id="connections-chart" class="chart"></div>
            <cv-inline-loading v-if="charts.connections.length == 1" :state="'loading'" :loading-text="$t('common.loading_data')"></cv-inline-loading>
          </div>
        </cv-tile>
      </cv-column>
      <cv-column :sm="12" :md="12" :lg="12">
        <cv-tile class="dashboard-card">
          <h1>
            {{$t("manage.traffic")}}
            <cv-tooltip :alignment="'center'" :direction="'right'" :tip="$t('manage.3mw_3si')"></cv-tooltip>
          </h1>
          <cv-tabs :container="false" aria-label="navigation tab label" @tab-selected="changeTrafficTab">
            <cv-tab :label="$t('manage.interface') + ' ' + tab" v-for="(tab, index) in charts.trafficTabs" :key="index">
              <div :id="'traffic-chart-legend-' + tab" class="chart-legend"></div>
              <div :id="'traffic-chart-' + tab" class="chart"></div>
              <cv-inline-loading v-if="charts.traffic[tab].length == 1" :state="'loading'" :loading-text="$t('common.loading_data')"></cv-inline-loading>
            </cv-tab>
          </cv-tabs>
        </cv-tile>
      </cv-column>
      <!-- <cv-column :sm="12" :md="12" :lg="12">
        <cv-tile class="dashboard-card">
          <h1>
            {{$t("manage.dhcp_devices")}}
          </h1>
          <p>
          </p>
        </cv-tile>
      </cv-column> -->
    </cv-row>
    <!-- <cv-row>
      <cv-column :sm="12" :md="12" :lg="12">
        <cv-tile>
          <h1>Hello</h1>
          <p>This is some tile content.</p>
        </cv-tile>
      </cv-column>
    </cv-row> -->
  </cv-grid>

</div>
</template>

<script>
import to from "await-to-js";

import Dygraph from "dygraphs";

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
      configs: {},
      connectionsInterval: null,
      trafficInterval: null,
      charts: {
        connections: {},
        oldConnections: {},
        connectionsDygraphs: null,
        connectionsTimeRange: 180,
        traffic: {},
        oldTraffic: {},
        trafficDygraphs: {},
        trafficTimeRanges: {},
        trafficTimeRange: 240,
        trafficTabs: [],
        currentTrafficTab: null,
      },
      board: {}
    };
  },
  beforeDestroy() {
    clearInterval(this.connectionsInterval);
    clearInterval(this.trafficInterval);
  },
  mounted() {
    // set page title
    document.title = this.$root.config.PRODUCT_NAME + " - " + this.$t("manage.dashboard");

    // get dashboard data
    this.getDashboardData()

    // update charts
    var context = this
    this.updateConnections();
    this.updateTraffic();
    this.connectionsInterval = setInterval(function() {
      context.updateConnections();
      context.updateTraffic();
    }, 5000);
  },
  methods: {
    goTo(path) {
      this.$router.push(path);
    },
    changeTrafficTab(tab) {
      this.charts.currentTrafficTab = this.charts.trafficTabs[tab];
      this.updateTraffic()
    },
    async updateConnections() {
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
      const [err, response] = await to(this.axios
        .post(`${this.$root.luciURL}/sys?auth=${clientInfo.token}`.replace("_CLIENT_", this.clientId), {
          "method": "exec",
          "params": ["ubus call luci getRealtimeStats '{\"mode\": \"conntrack\"}'"]
        })
      );

      if (err || !response) {
        this.$store.state.manage.isLogged = false;
        this.$store.state.manage.isLoading = false;
        this.deleteFromStorage("clientInfo-" + this.clientId)
        if (!this.$store.state.manage.isStandAlone) {
          this.login()
        }
        return
      }

      this.charts.connections = JSON.parse(response.data.result).result;
      this.charts.connectionsTimeRange--;

      // create 0-filled date before first date
      var firstDate = this.charts.connections && this.charts.connections[0] && this.charts.connections[0][0] || Date.now();
      for (var d = firstDate; d > firstDate - (this.charts.connectionsTimeRange); d--) {
        this.charts.connections.unshift([d, 0, 0, 0]);
      }
      for (const v in this.charts.connections) {
        // convert timestamp to human date
        this.charts.connections[v][0] = new Date(this.charts.connections[v][0] * 1000);
      }

      if (!this.charts.connectionsDygraphs) {
        this.charts.connectionsDygraphs = new Dygraph(
          document.getElementById("connections-chart"),
          this.charts.connections, {
            fillGraph: true,
            stackedGraph: true,
            labels: [this.$i18n.t("common.date"), "UDP", "TCP", this.$i18n.t("common.other")],
            height: 200,
            strokeWidth: 1,
            strokeBorderWidth: 1,
            axisLineColor: "white",
            labelsDiv: document.getElementById("connections-chart-legend"),
            labelsSeparateLines: true,
            drawGrid: true,
            legend: 'always',
          }
        );

        this.charts.oldConnections = this.charts.connections

      } else {
        this.charts.oldConnections.push(this.charts.connections.pop());
        this.charts.oldConnections.shift();
        this.charts.connectionsDygraphs.updateOptions({
          file: this.charts.oldConnections
        });
      }
    },
    async updateTraffic() {
      var context = this;
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
      const [err, response] = await to(this.axios
        .post(`${this.$root.luciURL}/sys?auth=${clientInfo.token}`.replace("_CLIENT_", this.clientId), {
          "method": "exec",
          "params": ["bwm-ng -o plain -c 1 -N | sed '1,2'd | sed '$d' | sed '$d'"]
        })
      );

      if (err || !response) {
        this.$store.state.manage.isLogged = false;
        this.$store.state.manage.isLoading = false;
        this.deleteFromStorage("clientInfo-" + this.clientId)
        if (!this.$store.state.manage.isStandAlone) {
          this.login()
        }
        return
      }

      // parse data response
      var plain = response.data.result;
      plain = plain.split('\n')

      var data = {};
      for (var int in plain) {
        var lineData = plain[int];

        lineData = lineData.split(":");

        if (lineData[1]) {
          var iface = lineData[0].trim();
          var values = lineData[1].split("KB/s")

          data[iface] = [
            [
              Date.now(),
              parseFloat(values[0].trim()),
              parseFloat(values[1].trim()),
            ]
          ]
        }
      }

      // initialize graphs and charts
      this.charts.trafficTabs = Object.keys(data);
      if (!this.charts.currentTrafficTab) {
        this.charts.currentTrafficTab = Object.keys(data)[0];
      }

      this.charts.traffic = data;

      //iface = this.charts.trafficTabs[i];
      iface = this.charts.currentTrafficTab

      // init time ranges
      this.charts.trafficTimeRanges[iface] = this.charts.trafficTimeRange
      this.charts.trafficTimeRanges[iface]--;

      // create 0-filled date before first date
      var firstDate = this.charts.traffic && this.charts.traffic[iface] && Math.ceil(this.charts.traffic[iface][0][0] / 1000) || Date.now();
      for (var d = firstDate; d > firstDate - (this.charts.trafficTimeRanges[iface]); d--) {
        this.charts.traffic[iface].unshift([d, 0, 0]);
      }

      // convert timestamp to human date
      for (const v in this.charts.traffic[iface]) {
        if (this.charts.traffic[iface][v][0].toString().length <= 10) {
          this.charts.traffic[iface][v][0] = new Date(this.charts.traffic[iface][v][0] * 1000);
        } else {
          this.charts.traffic[iface][v][0] = new Date(this.charts.traffic[iface][v][0]);
        }
      }

      await to(this.axios
        .post(`${this.$root.luciURL}/sys?auth=${clientInfo.token}`.replace("_CLIENT_", this.clientId), {
          "method": "exec",
          "params": ["bwm-ng -o plain -c 1 -N | sed '1,2'd | sed '$d' | sed '$d'"]
        })
      );

      // check if graph exists and start drawing
      if (!this.charts.trafficDygraphs[iface]) {
        this.charts.trafficDygraphs[iface] = new Dygraph(
          document.getElementById("traffic-chart-" + iface),
          this.charts.traffic[iface], {
            fillGraph: true,
            stackedGraph: true,
            labels: [this.$i18n.t("common.date"), "Download", "Upload"],
            height: 200,
            strokeWidth: 1,
            strokeBorderWidth: 1,
            axisLineColor: "white",
            labelsDiv: document.getElementById("traffic-chart-legend-" + iface),
            labelsSeparateLines: true,
            drawGrid: true,
            legend: 'always',
            axes: {
              y: {
                axisLabelFormatter: function(y) {
                  return context.$options.filters.byteFormat(y * 1024) + '/s';
                }
              }
            }
          }
        );

        this.charts.oldTraffic[iface] = this.charts.traffic[iface]
      } else {
        this.charts.oldTraffic[iface].push(this.charts.traffic[iface].pop());
        this.charts.oldTraffic[iface].shift();
        this.charts.trafficDygraphs[iface].updateOptions({
          file: this.charts.oldTraffic[iface]
        });
      }
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

      // get configs
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

      // get board
      const [errBoard, responseBoard] = await to(this.axios
        .post(`${this.$root.luciURL}/sys?auth=${clientInfo.token}`.replace("_CLIENT_", this.clientId), {
          "method": "exec",
          "params": ['ubus call system board']
        })
      );

      // check error
      if (errBoard || !responseBoard) {
        this.$store.state.manage.isLogged = false;
        this.$store.state.manage.isLoading = false;
        this.deleteFromStorage("clientInfo-" + this.clientId)
        if (!this.$store.state.manage.isStandAlone) {
          this.login()
        }
        return
      }

      // set board
      this.$store.state.manage.board = JSON.parse(responseBoard.data.result);

      // get info
      const [errInfo, responseInfo] = await to(this.axios
        .post(`${this.$root.luciURL}/sys?auth=${clientInfo.token}`.replace("_CLIENT_", this.clientId), {
          "method": "exec",
          "params": ['ubus call system info']
        })
      );

      // check error
      if (errInfo || !responseInfo) {
        this.$store.state.manage.isLogged = false;
        this.$store.state.manage.isLoading = false;
        this.deleteFromStorage("clientInfo-" + this.clientId)
        if (!this.$store.state.manage.isStandAlone) {
          this.login()
        }
        return
      }

      // set info
      this.$store.state.manage.info = JSON.parse(responseInfo.data.result);

      // get lan status
      const [errLan, responseLan] = await to(this.axios
        .post(`${this.$root.luciURL}/sys?auth=${clientInfo.token}`.replace("_CLIENT_", this.clientId), {
          "method": "exec",
          "params": ['ubus call network.interface.lan status']
        })
      );

      // check error
      if (errLan || !responseLan) {
        this.$store.state.manage.isLogged = false;
        this.$store.state.manage.isLoading = false;
        this.deleteFromStorage("clientInfo-" + this.clientId)
        if (!this.$store.state.manage.isStandAlone) {
          this.login()
        }
        return
      }

      // set lan
      this.$store.state.manage.lan = JSON.parse(responseLan.data.result);

      // get wan status
      const [errWan, responseWan] = await to(this.axios
        .post(`${this.$root.luciURL}/sys?auth=${clientInfo.token}`.replace("_CLIENT_", this.clientId), {
          "method": "exec",
          "params": ['ubus call network.interface.wan status']
        })
      );

      // check error
      if (errWan || !responseWan) {
        this.$store.state.manage.isLogged = false;
        this.$store.state.manage.isLoading = false;
        this.deleteFromStorage("clientInfo-" + this.clientId)
        if (!this.$store.state.manage.isStandAlone) {
          this.login()
        }
        return
      }

      // set wan
      this.$store.state.manage.wan = JSON.parse(responseWan.data.result);

      // all done
      this.$store.state.manage.isLogged = true;
      this.$store.state.manage.isLoading = false;
    }
  },
};
</script>

<style>

</style>
