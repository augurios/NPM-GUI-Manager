<template>
  <ModalPrompt @close="$emit('close')">
    <template v-slot:title>
      Enter FTP Details
    </template>
    <template v-slot:body>
      <soft-input @input="$emit('update-ftp-host', $event)" type="text" placeholder="FTP Host" aria-label="FTP Host" :isRequired="true" />
      <soft-input @input="$emit('update-ftp-port', $event)" type="text" placeholder="FTP Port" aria-label="FTP Port" :isRequired="true" />
      <soft-input @input="$emit('update-ftp-user', $event)" type="text" placeholder="FTP User" aria-label="FTP User" :isRequired="true" />
      <soft-input @input="$emit('update-ftp-password', $event)" type="password" placeholder="FTP Password" aria-label="FTP Password" :isRequired="true" />
      <soft-input @input="$emit('update-ftp-path', $event)" type="text" placeholder="FTP Path" aria-label="FTP Path" :isRequired="true" />
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
  name: "FtpModal",
  components: {
    ModalPrompt,
    SoftInput,
    SoftButton
  }
};
</script>