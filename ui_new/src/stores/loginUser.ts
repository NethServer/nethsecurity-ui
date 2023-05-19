import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useLoginUserStore = defineStore('loginUser', () => {
  const username = ref('')
  const isLoggedIn = ref(false)

  function setUsername(newUsername: string) {
    username.value = newUsername
  }

  function setLoggedIn(newLoggedIn: boolean) {
    isLoggedIn.value = newLoggedIn
  }

  return { username, isLoggedIn, setUsername, setLoggedIn }
})
