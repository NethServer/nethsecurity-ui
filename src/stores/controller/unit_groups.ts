import { getControllerApiEndpoint } from '@/lib/config'
import axios from 'axios'
import { defineStore } from 'pinia'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage } from '@nethesis/vue-components'

export type UnitGroup = {
  id: number
  name: string
  description: string
  units: string[]
  created: string
  updated: string
  used_by: string[]
}

export const useUnitGroupsStore = defineStore('unitGroups', () => {
  const { t } = useI18n()
  const unitGroups = ref<UnitGroup[]>([])
  const unitGroupsLoading = ref(false)

  const controllerLoginStore = useControllerLoginStore()

  const loadUnitGroups = async () => {
    try {
      unitGroupsLoading.value = true
      const res = await axios.get(`${getControllerApiEndpoint()}/unit_groups`, {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      })
      unitGroups.value = res.data.data as UnitGroup[]
    } catch (err: any) {
    } finally {
      unitGroupsLoading.value = false
    }
  }

  const getUnitGroup = async (groupId: number) => {
    const res = await axios.get<{ unit_group: UnitGroup }>(
      `${getControllerApiEndpoint()}/unit_groups/${groupId}`,
      {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      }
    )
    return res.data.unit_group
  }

  const addUnitGroup = async (name: string, description: string, units: string[]) => {
    const res = await axios.post<{ id: number }>(
      `${getControllerApiEndpoint()}/unit_groups`,
      { name, description, units },
      {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      }
    )
    return res.data.id
  }

  const updateUnitGroup = async (
    groupId: number,
    name: string,
    description: string,
    units: string[]
  ) => {
    await axios.put(
      `${getControllerApiEndpoint()}/unit_groups/${groupId}`,
      { name, description, units },
      {
        headers: {
          Authorization: `Bearer ${controllerLoginStore.token}`
        }
      }
    )
  }

  const deleteUnitGroup = async (groupId: number) => {
    await axios.delete(`${getControllerApiEndpoint()}/unit_groups/${groupId}`, {
      headers: {
        Authorization: `Bearer ${controllerLoginStore.token}`
      }
    })
  }

  return {
    unitGroups,
    unitGroupsLoading,
    loadUnitGroups,
    getUnitGroup,
    addUnitGroup,
    updateUnitGroup,
    deleteUnitGroup
  }
})
