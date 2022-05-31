<template>
<div class="content">
  <cv-loading :active="isLoading" overlay></cv-loading>

  <cv-grid fullWidth>
    <cv-row>
      <cv-column>
        <h2 class="page-title">Menu1</h2>
      </cv-column>
    </cv-row>
  </cv-grid>

</div>
</template>

<script>
import StorageService from "../../services/storage";

export default {
  name: 'Menu1',
  mixins: [StorageService],
  data() {
    return {
      isLoading: false
    };
  },
  mounted() {
    // set page title
    document.title = this.$root.config.PRODUCT_NAME + " - " + this.$t("menu1.title");
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
