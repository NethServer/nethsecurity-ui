import Vue from "vue";
import VueRouter from "vue-router";

import Controller from "../components/Controller";

import Manage from "../components/Manage";
import ManageMenu1 from "../components/manages/Menu1";
import ManageMenu2 from "../components/manages/Menu2";
import ManageMenu3 from "../components/manages/Menu3";

import Logs from "../components/Logs";
import Settings from "../components/Settings";

Vue.use(VueRouter);

const routes = [{
    path: "/",
    redirect: window.CONFIG.MODE == 'stand-alone' ? "/configuration" : "/controller"
  }, {
    path: "/controller",
    name: "Controller",
    component: Controller,
  },
  // CONFIGURATION (STAND-ALONE) SECTION
  {
    path: '/configuration',
    redirect: '/configuration/menu1'
  },
  {
    path: "/configuration",
    name: "Manage",
    component: Manage,
    children: [{
        path: "menu1",
        name: "ManageMenu1",
        component: ManageMenu1,
      },
      {
        path: "menu2",
        name: "ManageMenu2",
        component: ManageMenu2,
      },
      {
        path: "menu3",
        name: "ManageMenu3",
        component: ManageMenu3,
      },
    ]
  },
  // END CONFIGURATION (STAND-ALONE) SECTION
  // MANAGE SECTION
  {
    path: '/manage/:clientId',
    redirect: '/manage/:clientId/menu1'
  },
  {
    path: "/manage/:clientId",
    name: "Manage",
    component: Manage,
    children: [{
        path: "menu1",
        name: "ManageMenu1",
        component: ManageMenu1,
      },
      {
        path: "menu2",
        name: "ManageMenu2",
        component: ManageMenu2,
      },
      {
        path: "menu3",
        name: "ManageMenu3",
        component: ManageMenu3,
      },
    ]
  },

  // END MANAGE SECTION
  {
    path: "/logs",
    name: "Logs",
    component: Logs,
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
  },
];

const router = new VueRouter({
  mode: window.CONFIG.MODE == 'stand-alone' ? 'history' : 'hash',
  routes,
});

export default router;
