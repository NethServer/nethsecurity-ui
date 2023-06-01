//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref('system')

  function setTheme(newTheme: string) {
    theme.value = newTheme

    switch (theme.value) {
      case 'light':
        removeDarkClassFromDocument()
        break
      case 'dark':
        addDarkClassToDocument()
        break
      default:
        // system theme
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          addDarkClassToDocument()
        } else {
          removeDarkClassFromDocument()
        }
    }

    //// todo update preferences
  }

  function toggleTheme() {
    switch (theme.value) {
      case 'light':
        setTheme('dark')
        break
      case 'dark':
        setTheme('light')
        break
      default:
        // system theme
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setTheme('light')
        } else {
          setTheme('dark')
        }
    }
  }

  function loadTheme() {
    //// TODO load theme from preferences

    //// TODO load theme from credentials if necessary

    // let theme = 'system' ////

    //// remove mockup:
    const preferences = { theme: 'dark' }

    setTheme(preferences.theme)

    ////
    // if (preferences.theme === 'dark') {
    //   theme = 'dark'
    //   addDarkClassToDocument()
    // } else if (preferences.theme === 'light') {
    //   theme = 'light'
    //   removeDarkClassFromDocument()
    // } else {
    //   // system theme
    //   if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    //     addDarkClassToDocument()
    //   } else {
    //     removeDarkClassFromDocument()
    //   }
    // }

    // setTheme(theme)
  }

  const addDarkClassToDocument = () => {
    document.documentElement.classList.add('dark')
  }

  const removeDarkClassFromDocument = () => {
    document.documentElement.classList.remove('dark')
  }

  return { theme, setTheme, toggleTheme, loadTheme }
})
