import { defineStore } from 'pinia'
import { data } from '@/catalog.json'

export const useNetifydStore = defineStore('netifyd', () => {
  return {
    data
  }
})
