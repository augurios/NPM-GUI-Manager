
<template>
  <ModalPrompt @close="$emit('close')">
    <template v-slot:title>
      Confirm Deletion
    </template>
    <template v-slot:body>
      <p>Are you sure you want to delete the project "{{ project.name }}"?</p>
    </template>
    <template v-slot:footer>
      <soft-button color="dark" variant="gradient" @click="$emit('delete')">Delete</soft-button>
      <soft-button color="secondary" variant="gradient" @click="$emit('close')">Cancel</soft-button>
    </template>
  </ModalPrompt>
</template>

<script>
import ModalPrompt from "@/components/ModalPrompt.vue";
import SoftButton from "@/components/SoftButton.vue";

export default {
  name: "DeleteModal",
  props: {
    project: Object
  },
  components: {
    ModalPrompt,
    SoftButton
  }
};
</script>