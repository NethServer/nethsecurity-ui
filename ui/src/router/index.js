import Vue from "vue";
import VueRouter from "vue-router";

import Controller from "../components/Controller";
import Manage from "../components/Manage";
import Logs from "../components/Logs";
import Settings from "../components/Settings";

Vue.use(VueRouter);

const routes = [{
    path: "/",
    redirect: "/controller"
  }, {
    path: "/controller",
    name: "Controller",
    component: Controller,
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
  routes,
});

export default router;
