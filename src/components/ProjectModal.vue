
<template>
  <ModalPrompt @close="$emit('close')">
    <template v-slot:title>
      Enter Project Name
    </template>
    <template v-slot:body>
      <soft-input @input="$emit('update-pr-name', $event)" type="text" placeholder="Project Name" aria-label="Project Name" :isRequired="true" />
    </template>
    <template v-slot:footer>
      <soft-button color="dark" full-width variant="gradient" @click="$emit('save')">Save</soft-button>
    </template>
  </ModalPrompt>
</template>

<script>
import ModalPrompt from "@/components/ModalPrompt.vue";
import SoftInput from "@/components/SoftInput.vue";
import SoftButton from "@/components/SoftButton.vue";

export default {
  name: "ProjectModal",
  components: {
    ModalPrompt,
    SoftInput,
    SoftButton
  }
};
</script>