import Vue from "vue";
import VueRouter from "vue-router";
import Manage from "../components/Manage";

Vue.use(VueRouter);

const routes = [{
    path: "/",
    redirect: "/manage"
  },
  {
    path: "/manage",
    name: "Manage",
    component: Manage,
  },
  {
    path: "/manage/:clientId",
    name: "Manage",
    component: Manage,
  },
];

const router = new VueRouter({
  routes,
});

export default router;
