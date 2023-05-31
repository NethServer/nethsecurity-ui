//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

export const saveToStorage = (name: string, value: any) => {
  if (typeof value !== 'string') {
    value = JSON.stringify(value)
  }
  localStorage.setItem(name, value)
}

export const getJsonFromStorage = (name: string) => {
  const item = localStorage.getItem(name)

  if (item) {
    return JSON.parse(item)
  }
}

export const getStringFromStorage = (name: string) => {
  const item = localStorage.getItem(name)
}

export const deleteFromStorage = (name: string) => {
  localStorage.removeItem(name)
}
