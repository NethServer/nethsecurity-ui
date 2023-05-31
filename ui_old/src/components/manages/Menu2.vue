<template>
<div class="content">
  <cv-loading :active="isLoading" overlay></cv-loading>

  <cv-grid fullWidth>
    <cv-row>
      <cv-column>
        <h2 class="page-title">Menu2</h2>
      </cv-column>
    </cv-row>
  </cv-grid>

</div>
</template>

<script>
import StorageService from "../../services/storage";

export default {
  name: 'Menu2',
  mixins: [StorageService],
  data() {
    return {
      isLoading: false
    };
  },
  mounted() {
    // set page title
    document.title = this.$root.config.PRODUCT_NAME + " - " + this.$t("menu2.title");
  },
  methods: {
    goTo(path) {
      this.$router.push(path);
    }
  },
};
</script>

<style>

</style>
