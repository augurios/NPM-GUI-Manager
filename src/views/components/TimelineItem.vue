<template>
  <div class="mb-3 timeline-block" :class="darkMode" >
    <span class="timeline-step" :class="darkMode ? 'bg-dark' : ''">
      <i class="ni text-gradient" :class="`ni-${icon} text-${color}`"></i>
    </span>
    <div class="timeline-content">
      <h6
        class="mb-0 text-sm font-weight-bold"
        :class="darkMode ? 'text-white' : 'text-dark'"
        @click="handleClick"
      >
        {{ title }}
      </h6>
      <p  v-if="!URLavailable" class="mt-1 mb-0 text-xs text-secondary font-weight-bold">
        {{ dateTime }}
      </p>
      <p v-if="URLavailable" class="mt-1 mb-2 text-sm">
        Launch: <a :href="URLavailable" target="_blank" rel="noopener noreferrer" @click.prevent="openUrl">{{ URLavailable }}</a>
      </p>
      <p v-else-if="description" class="mt-3 mb-2 text-sm">
        {{ description }}
      </p>
      <span
        v-for="(badge, index) of badges"
        :key="index"
        class="badge badge-sm me-1"
        :class="`bg-gradient-${color}`"
      >
        {{ badge }}
      </span>
    </div>
  </div>
</template>
<script>
const { ipcRenderer } = window.electron;
export default {
  name: "TimelineItem",
  props: {
    color: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    dateTime: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    badges: {
      type: Array,
      default: () => [],
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
    response: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      URLavailable: this.extractUrl(this.title)
    };
  },
  methods: {
    handleClick() {
      this.$emit('item-clicked', this.response);
    },
    isUrl(string) {
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      return urlPattern.test(string);
    },
    extractUrl(string) {
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      const match = string.match(urlPattern);
      return match ? match[0] : null;
    },
    openUrl() {
      ipcRenderer.invoke('open-url', this.URLavailable);
    }
  }
};
</script>

<style scoped>
.timeline-block h6 {
  cursor: pointer;
}
.timeline-block h6:hover {
  color: #6d85ac !important;
}
</style>
