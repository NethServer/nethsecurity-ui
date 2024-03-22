import { getControllerApiEndpoint } from '@/lib/config'
import axios from 'axios'
import { defineStore } from 'pinia'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage } from '@nethesis/vue-components'

export type ControllerAccount = {
  id: number
  username: string
  password: string
  display_name: string
  created: string
}

export const useAccountsStore = defineStore('accounts', () => {
  const { t } = useI18n()
  const sshKeys = ref({
    key: '',
    key_pub: ''
  })
  const accounts = ref<ControllerAccount[]>([])

  const listAccountsLoading = ref(false)
  const listAccountsError = ref({
    notificationDescription: '',
    notificationDetails: ''
  })

  const listSshKeysLoading = ref(false)
  const listSshKeysError = ref({
    notificationDescription: '',
    notificationDetails: ''
  })

  const controllerLoginStore = useControllerLoginStore()

  const loadSshKeys = async () => {
    try {
      listSshKeysLoading.value = true
      const res = await axios.get(`${getControllerApiEndpoint()}/accounts/ssh-keys`, {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      })

      sshKeys.value = res.data
    } catch (err: any) {
      listSshKeysError.value.notificationDescription = t(getAxiosErrorMessage(err))
      listSshKeysError.value.notificationDetails = err.toString()
    } finally {
      listSshKeysLoading.value = false
    }
  }

  const generateSshKeys = async (passphrase: string) => {
    return (
      await axios.post(
        `${getControllerApiEndpoint()}/accounts/ssh-keys`,
        { passphrase },
        {
          headers: {
            Authorization: `Bearer ${controllerLoginStore.token}`
          }
        }
      )
    ).data as { key_pub: string }
  }

  const deleteSshKeys = async () => {
    return (
      await axios.delete(`${getControllerApiEndpoint()}/accounts/ssh-keys`, {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      })
    ).data as { key_pub: string }
  }

  return {
    sshKeys,
    accounts,
    listAccountsLoading,
    listAccountsError,
    listSshKeysLoading,
    listSshKeysError,
    loadSshKeys
  }
})
