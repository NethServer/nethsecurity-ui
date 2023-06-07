//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: import.meta.env.VITE_UI_MODE === 'standalone' ? '/standalone' : '/controller'
    },
    // controller
    {
      path: '/controller',
      redirect: '/controller/dashboard'
    },
    {
      path: '/controller/dashboard',
      name: 'controllerDashboard',
      component: () => import('../views/controller/ControllerDashboardView.vue')
    },
    {
      path: '/controller/logs',
      name: 'controllerLogs',
      component: () => import('../views/controller/LogsView.vue')
    },
    {
      path: '/controller/settings',
      name: 'controllerSettings',
      component: () => import('../views/controller/SettingsView.vue')
    },
    // standalone
    {
      path: '/standalone',
      redirect: '/standalone/dashboard'
    },
    {
      path: '/standalone/dashboard',
      name: 'standaloneDashboard',
      component: () => import('../views/standalone/StandaloneDashboardView.vue')
    },
    {
      path: '/standalone/system/registration',
      name: 'standaloneRegistration',
      component: () => import('../views/standalone/system/RegistrationView.vue')
    },
    {
      path: '/standalone/system/systemSettings',
      name: 'standaloneSystemSettings',
      component: () => import('../views/standalone/system/SystemSettingsView.vue')
    },
    {
      path: '/standalone/system/services',
      name: 'standaloneServices',
      component: () => import('../views/standalone/system/ServicesView.vue')
    },
    {
      path: '/standalone/system/ssh',
      name: 'standaloneSSH',
      component: () => import('../views/standalone/system/SSHView.vue')
    },
    {
      path: '/standalone/system/backup-restore',
      name: 'standaloneBackupAndRestore',
      component: () => import('../views/standalone/system/BackupAndRestoreView.vue')
    },
    {
      path: '/standalone/system/reboot-shutdown',
      name: 'standaloneRebootAndShutdown',
      component: () => import('../views/standalone/system/RebootAndShutdownView.vue')
    }
  ]
})

export default router
