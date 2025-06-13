<template>
  <div class="py-4">
    <div class="row">
      <div class="col-12">
        <div class="multisteps-form__content">
          <node-version-manager @show-alert="showAlert" />
        </div>
      </div>
    </div>

    <!-- Alert messages -->
    <div v-if="alert.show" class="position-fixed top-0 end-0 p-3" style="z-index: 1050">
      <soft-alert
        :color="alert.type === 'error' ? 'danger' : alert.type"
        :dismissible="true"
        @dismissed="alert.show = false"
      >
        {{ alert.message }}
      </soft-alert>
    </div>
  </div>
</template>

<script>
import NodeVersionManager from "@/components/NodeVersionManager.vue";
import SoftAlert from "@/components/SoftAlert.vue";

export default {
  name: "NodeVersions",
  components: {
    NodeVersionManager,
    SoftAlert,
  },
  data() {
    return {
      alert: {
        show: false,
        type: 'info',
        message: ''
      }
    };
  },
  methods: {
    showAlert(alertData) {
      this.alert = {
        show: true,
        type: alertData.type || 'info',
        message: alertData.message || ''
      };
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        this.alert.show = false;
      }, 5000);
    }
  }
};
</script>

<style scoped>
.multisteps-form__content {
  min-height: 70vh;
}
</style>
