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
