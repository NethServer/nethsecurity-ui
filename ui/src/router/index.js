import Vue from "vue";
import VueRouter from "vue-router";

import Controller from "../components/Controller";
import Manage from "../components/Manage";
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
  {
    path: "/configuration",
    name: "Manage",
    component: Manage,
  },
  {
    path: "/manage/:clientId",
    name: "Manage",
    component: Manage,
  },
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
