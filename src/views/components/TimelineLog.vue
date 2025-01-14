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
        :color="getColor(log)"
        :icon="getIcon(log)"
        :title="log.command"
        :date-time="getComment(log)"
        :description="log.duration ? `Duration: ${log.duration}s` : ''"
        :response="log.response"
        @item-clicked="showModal"
      />
    </timeline-list>
    <modal-prompt v-if="modalVisible" @close="modalVisible = false">
      <template v-slot:title>Command Response</template>
      <template v-slot:body>
        <pre>{{ modalContent }}</pre>
      </template>
      <template v-slot:footer>
        <button type="button" class="btn btn-secondary" @click="modalVisible = false">Close</button>
      </template>
    </modal-prompt>
  </div>
</template>

<script>
import { mapState } from "vuex";
import TimelineList from "./TimelineList.vue";
import TimelineItem from "./TimelineItem.vue";
import ModalPrompt from "@/components/ModalPrompt.vue";

export default {
  name: "TimelineLog",
  components: {
    TimelineList,
    TimelineItem,
    ModalPrompt,
  },
  data() {
    return {
      modalVisible: false,
      modalContent: "",
    };
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
    },
    showModal(response) {
      if (response) {
        // eslint-disable-next-line no-control-regex
        this.modalContent = response.replace(/\u001b\[[0-9;]*m/g,'');
        this.modalVisible = true;
      }
    },
    getColor(log) {
      if (log.result === 'success' || log.result === 'completed') return 'success';
      if (log.result === 'failed') return 'danger';
      if (log.result === 'running') return 'success';
      return 'warning';
    },
    getIcon(log) {
      if (log.result === 'success' || log.result === 'completed') return 'check-bold';
      if (log.result === 'failed') return 'fat-remove';
      if (log.result === 'running') return 'button-play';
      if (log.result === 'stopped') return 'bold-down';
      return 'notification-70';
    },
    getComment(log) {
      const prefix = log.result === 'success' ? 'Completed' : log.result === 'failed' ? 'Failed' : log.result === 'running' ? 'Running' : 'Initiated';
      return `${log.result === 'stopped' ? 'Ended' : log.result === 'completed' ? 'Completed' : prefix} at ${log.timestamp}`;
    }
  }
};
</script>

<style>
.timeline-log .timeline.timeline-one-side {
  max-height: 250px;
  overflow-y: auto;
}
.timeline-log pre {
            background-color: black;
            border: 1px solid #ddd;
            padding: 10px;
            overflow-x: auto;
            white-space: pre-wrap; /* Allow wrapping for long lines */
        }
</style>
