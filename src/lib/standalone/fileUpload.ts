//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios, { type AxiosProgressEvent } from 'axios'
import { getStandaloneApiEndpoint } from '../config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'

export const UPLOAD_FOLDER = '/var/run/ns-api-server/uploads/'

export function getUploadedFilePath(filename: string) {
  return `${UPLOAD_FOLDER}${filename}`
}

export async function uploadFile(
  file: File,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
) {
  const loginStore = useLoginStore()
  const formData = new FormData()

  formData.append('file', file)
  return axios.post(`${getStandaloneApiEndpoint()}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${loginStore.token}`
    },
    onUploadProgress
  })
}
