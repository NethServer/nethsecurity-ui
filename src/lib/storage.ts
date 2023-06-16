//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

//// move to vue-tailwind library?

/**
 * Save a string or a JSON object to local storage
 *
 * @param name name of the entry
 * @param value value of the entry
 */
export const saveToStorage = (name: string, value: any) => {
  if (typeof value !== 'string') {
    value = JSON.stringify(value)
  }
  localStorage.setItem(name, value)
}

/**
 * Get a JSON object from local storage
 *
 * @param name name of the entry
 * @returns a JSON object
 */
export const getJsonFromStorage = (name: string) => {
  const item = localStorage.getItem(name)

  if (item) {
    return JSON.parse(item)
  }
}

/**
 * Get a string from local storage
 *
 * @param name name of the entry
 * @returns the string value of the entry
 */
export const getStringFromStorage = (name: string) => {
  return localStorage.getItem(name)
}

export const deleteFromStorage = (name: string) => {
  localStorage.removeItem(name)
}

/**
 * Save a user preference to local storage entry "preferences-<username>"
 *
 * @param preferenceName name of the preference
 * @param preferenceValue string or JSON object
 * @param currentUsername username currently logged in
 */
export const savePreference = (
  preferenceName: string,
  preferenceValue: any,
  currentUsername: string
) => {
  const preferences = getJsonFromStorage(`preferences-${currentUsername}`) || {}
  preferences[preferenceName] = preferenceValue
  saveToStorage(`preferences-${currentUsername}`, preferences)
}

/**
 * Get a user preference from the local storage entry "preferences-<username>"
 *
 * @param preferenceName name of the preference
 * @param currentUsername username currently logged in
 * @returns a string or a JSON object
 */
export const getPreference = (preferenceName: string, currentUsername: string) => {
  const preferences = getJsonFromStorage(`preferences-${currentUsername}`) || {}
  return preferences[preferenceName]
}
