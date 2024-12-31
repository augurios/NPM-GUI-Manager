<template>
  <div class="timeline-log">
    <timeline-list
      class="h-100"
      title="Command Logs"
      description="Logs of executed commands"
    >
      <timeline-item
        v-for="log in logs"
        :key="log.timestamp"
        :color="log.result === 'success' ? 'success' : log.result === 'failed' ? 'danger' : 'warning'"
        :icon="log.result === 'success' ? 'check-bold' : log.result === 'failed' ? 'fat-remove' : 'bell-55'"
        :title="log.command"
        :date-time="log.timestamp"
      />
    </timeline-list>
  </div>
</template>

<script>
import { mapState } from "vuex";
import TimelineList from "./TimelineList.vue";
import TimelineItem from "./TimelineItem.vue";

export default {
  name: "TimelineLog",
  components: {
    TimelineList,
    TimelineItem,
  },
  computed: {
    ...mapState(["logs"]),
  },
  updated() {
    this.scrollToBottom();
  },
  methods: {
    scrollToBottom() {
      const container = this.$el.querySelector('.timeline-log');
      container.scrollTop = container.scrollHeight;
    }
  }
};
</script>

<style>
.timeline-log {
  max-height: 400px;
  overflow-y: auto;
}
</style>
