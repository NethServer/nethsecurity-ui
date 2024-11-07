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
  two_fa: boolean
}

/*
 * Store of controller accounts
 */
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
    listSshKeysError.value.notificationDescription = ''
    listSshKeysError.value.notificationDetails = ''
    try {
      listSshKeysLoading.value = true
      const res = await axios.get(`${getControllerApiEndpoint()}/accounts/ssh-keys`, {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      })

      sshKeys.value = res.data.data
    } catch (err: any) {
      listSshKeysError.value.notificationDescription = t(getAxiosErrorMessage(err))
      listSshKeysError.value.notificationDetails = err.toString()
    } finally {
      listSshKeysLoading.value = false
    }
  }

  const loadAccounts = async () => {
    listAccountsError.value.notificationDescription = ''
    listAccountsError.value.notificationDetails = ''
    try {
      listAccountsLoading.value = true
      const res = await axios.get(`${getControllerApiEndpoint()}/accounts`, {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      })

      accounts.value = res.data.data.accounts
    } catch (err: any) {
      listAccountsError.value.notificationDescription = t(getAxiosErrorMessage(err))
      listAccountsError.value.notificationDetails = err.toString()
    } finally {
      listAccountsLoading.value = false
    }
  }

  const addAccount = async (username: string, password: string, displayName: string) => {
    await axios.post(
      `${getControllerApiEndpoint()}/accounts`,
      { username, password, display_name: displayName },
      {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      }
    )
  }

  const updateAccount = async (
    accountId: number,
    username: string,
    password: string,
    displayName: string
  ) => {
    await axios.put(
      `${getControllerApiEndpoint()}/accounts/${accountId}`,
      { username, password, display_name: displayName },
      {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      }
    )
  }

  const deleteAccount = async (accountId: number) => {
    await axios.delete(`${getControllerApiEndpoint()}/accounts/${accountId}`, {
      headers: {
        Authorization: `Bearer ${controllerLoginStore.token}`
      }
    })
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

  const changePassword = async (oldPassword: string, newPassword: string) => {
    return (
      await axios.put(
        `${getControllerApiEndpoint()}/accounts/password`,
        { old_password: oldPassword, new_password: newPassword },
        {
          headers: {
            Authorization: `Bearer ${controllerLoginStore.token}`
          }
        }
      )
    ).data as { key_pub: string }
  }

  return {
    sshKeys,
    accounts,
    listAccountsLoading,
    listAccountsError,
    listSshKeysLoading,
    listSshKeysError,
    loadSshKeys,
    generateSshKeys,
    deleteSshKeys,
    changePassword,
    loadAccounts,
    addAccount,
    updateAccount,
    deleteAccount
  }
})
