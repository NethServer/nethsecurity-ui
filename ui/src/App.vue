<template>
<div id="app">
  <Manage msg="Manage client" />
</div>
</template>

<script>
import Manage from './components/Manage.vue'

export default {
  name: 'App',
  components: {
    Manage
  }
}
</script>

<style>
html {
  background-color: #5d5b5b;
}

body {
  background-color: #5d5b5b;
}
</style>
