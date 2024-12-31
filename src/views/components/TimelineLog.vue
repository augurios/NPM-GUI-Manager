<template>
  <div class="timeline-log" ref="timelineLog">
    <timeline-list
      class="h-100"
      title="Logs"
      description="Of executed commands"
      ref="timelineList"
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
  watch: {
    logs: {
      handler() {
        this.scrollToBottom();
      },
      deep: true
    }
  },
  mounted() {
    this.scrollToBottom();
  },
  updated() {
    this.scrollToBottom();
  },
  methods: {
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.timelineList.$el.querySelector('.timeline.timeline-one-side');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }
};
</script>

<style>
.timeline-log .timeline.timeline-one-side {
  max-height: 200px;
  overflow-y: auto;
}
</style>
