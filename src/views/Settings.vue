<template>
    <div class="container-fluid py-4">
      <div class="card">
        <div class="card-header pb-0">
          <h6>Platform Settings</h6>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-check-label">Email me when someone follows me</label>
            <soft-switch v-model="settings.followEmail" class="ms-2" />
          </div>
          <div class="form-group">
            <label class="form-check-label">Email me when someone answers on my post</label>
            <soft-switch v-model="settings.answerEmail" class="ms-2" />
          </div>
          <div class="form-group">
            <label class="form-check-label">Email me when someone mentions me</label>
            <soft-switch v-model="settings.mentionEmail" class="ms-2" />
          </div>
          <div class="form-group">
            <label class="form-check-label">New launches and projects</label>
            <soft-switch v-model="settings.launchEmail" class="ms-2" />
          </div>
          <div class="form-group">
            <label class="form-check-label">Monthly product updates</label>
            <soft-switch v-model="settings.updateEmail" class="ms-2" />
          </div>
          <div class="form-group">
            <label class="form-check-label">Subscribe to newsletter</label>
            <soft-switch v-model="settings.newsletter" class="ms-2" />
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import SoftSwitch from '@/components/SoftSwitch.vue'; // Corrected to SoftSwitch
  
  export default {
    name: 'Settings',
    components: {
      SoftSwitch, // Use SoftSwitch
    },
    data() {
      return {
        settings: {
          followEmail: false,
          answerEmail: false,
          mentionEmail: false,
          launchEmail: false,
          updateEmail: false,
          newsletter: false,
        },
      };
    },
  };
  </script>