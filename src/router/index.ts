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
      component: () => import('../views/controller/DashboardView.vue')
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
      component: () => import('../views/standalone/DashboardView.vue')
    },
    {
      path: '/standalone/system',
      name: 'standaloneSystem',
      component: () => import('../views/standalone/SystemView.vue')
    }
  ]
})

export default router
