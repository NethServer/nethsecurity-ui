import { onMounted, onUnmounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { padStart, upperFirst } from 'lodash'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'

export function useTrafficSummary() {
  const REFRESH_INTERVAL = 10000
  const CHART_NUM_ITEMS = 5
  const CHART_COLOR = '#0891b2'
  const { t } = useI18n()
  const intervalId = ref<number>(0)
  const clientsLabels = ref<any>([])
  const clientsDatasets = ref<any>([])
  const protocolsLabels = ref<any[]>([])
  const protocolsDatasets = ref<any[]>([])
  const appsLabels = ref<any>([])
  const appsDatasets = ref<any>([])
  const loadingTrafficSummary = ref(false)
  const errorTitle = ref('')
  const errorDescription = ref('')

  const datasetProps = {
    label: t('standalone.dashboard.traffic'),
    backgroundColor: CHART_COLOR,
    borderRadius: 6,
    maxBarThickness: 25
  }

  onMounted(() => {
    getTrafficSummary()

    // periodically reload data
    intervalId.value = setInterval(getTrafficSummary, REFRESH_INTERVAL)
  })

  onUnmounted(() => {
    if (intervalId.value) {
      clearInterval(intervalId.value)
    }
  })

  async function getTrafficSummary() {
    errorTitle.value = ''
    errorDescription.value = ''
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const day = today.getDate()

    // show skeleton only the first time
    if (!intervalId.value) {
      loadingTrafficSummary.value = true
    }

    try {
      const res = await ubusCall('ns.dpireport', 'summary', {
        year: padStart(year.toString(), 2, '0'),
        month: padStart(month.toString(), 2, '0'),
        day: day.toString()
      })

      //// remove mock data
      // const data: any = {
      //   total: 53431766455,
      //   clients: [
      //     ['172.25.5.13', 31861541373],
      //     ['192.168.5.5', 21861541373],
      //     ['192.168.5.9', 61541373],
      //     ['192.168.5.10', 31541373],
      //     ['192.168.5.2', 21541373],
      //     ['192.168.5.3', 1541373],
      //     ['192.168.5.4', 541373],
      //     ['fe80::9451:4aff:fec4:42d3', 924]
      //   ],
      //   hours: [
      //     ['00', 148225512],
      //     ['23', 0]
      //   ],
      //   names: {
      //     'fe80::9528:c0f8:553e:14ae': 'fe80::9528:c0f8:553e:14ae',
      //     '192.168.5.5': 'filippo-v6.nethesis.it',
      //     '192.168.5.10': 'test'
      //   },
      //   protocol: [
      //     ['http/s', 39098676979],
      //     ['stun', 4719233858]
      //   ],
      //   host: [
      //     ['f003.backblazeb2.com', 12985715728],
      //     ['191.meet.nethesis.it', 4618635575]
      //   ],
      //   application: [
      //     ['netify.backblaze', 30906291212],
      //     ['netify.ubuntu', 753625987],
      //     ['netify.test1', 653625987],
      //     ['netify.test2', 553625987],
      //     ['netify.test3', 453625987],
      //     ['netify.test4', 353625987],
      //     ['netify.test5', 253625987],
      //     ['netify.test6', 153625987]
      //   ]
      // }

      // protocols chart

      protocolsLabels.value = res.data.protocol
        .slice(0, CHART_NUM_ITEMS)
        .map((proto: any[]) => proto[0])

      const protocolsChartData = res.data.protocol
        .slice(0, CHART_NUM_ITEMS)
        .map((proto: any[]) => proto[1])

      protocolsDatasets.value = [
        {
          ...datasetProps,
          data: protocolsChartData
        }
      ]

      // apps chart

      appsLabels.value = res.data.application.slice(0, CHART_NUM_ITEMS).map((app: any) => {
        let appName = app[0]

        // beautify app names
        if (appName.includes('netify.')) {
          appName = appName.split('netify.')[1]
        }
        appName = upperFirst(appName)
        return appName
      })

      const appsChartData = res.data.application.slice(0, CHART_NUM_ITEMS).map((app: any) => app[1])

      appsDatasets.value = [
        {
          ...datasetProps,
          data: appsChartData
        }
      ]

      // clients chart

      // try to resolve clients names

      clientsLabels.value = res.data.clients.slice(0, CHART_NUM_ITEMS).map((client: any) => {
        const ipAddress = client[0]
        const resolvedName = res.data.names[ipAddress] ? res.data.names[ipAddress] : ipAddress
        return resolvedName
      })

      const clientsChartData = res.data.clients
        .slice(0, CHART_NUM_ITEMS)
        .map((client: any[]) => client[1])

      clientsDatasets.value = [
        {
          ...datasetProps,
          data: clientsChartData
        }
      ]
    } catch (err: any) {
      console.error(err)
      errorTitle.value = t('error.cannot_retrieve_traffic_summary')
      errorDescription.value = t(getAxiosErrorMessage(err))
    } finally {
      loadingTrafficSummary.value = false
    }
  }

  return {
    clientsLabels,
    clientsDatasets,
    protocolsLabels,
    protocolsDatasets,
    appsLabels,
    appsDatasets,
    loadingTrafficSummary,
    errorTitle,
    errorDescription
  }
}
