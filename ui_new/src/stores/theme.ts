//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ref } from 'vue'
import { defineStore } from 'pinia'
// import { useLoginUserStore } from './loginUser' ////

export const useThemeStore = defineStore('theme', () => {
  const theme = ref('system')

  function setTheme(newTheme: string) {
    //// todo update preferences

    theme.value = newTheme
  }

  function loadTheme() {
    //// TODO load theme from preferences

    //// TODO load theme from credentials if necessary

    let theme = 'system'

    //// remove mockup:
    const preferences = { theme: 'dark' }

    if (preferences.theme === 'dark') {
      theme = 'dark'
      addDarkClassToDocument()
    } else if (preferences.theme === 'light') {
      theme = 'light'
      removeDarkClassFromDocument()
    } else {
      // system theme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        addDarkClassToDocument()
      } else {
        removeDarkClassFromDocument()
      }
    }

    setTheme(theme)
  }

  const addDarkClassToDocument = () => {
    document.documentElement.classList.add('dark')
  }

  const removeDarkClassFromDocument = () => {
    document.documentElement.classList.remove('dark')
  }

  return { theme, setTheme, loadTheme }
})
