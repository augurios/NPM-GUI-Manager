<template>
  <div class="dropdown make-inline">
    <button class="btn btn-link text-secondary mb-0" @click="toggleOptionsMenu" data-bs-toggle="dropdown">
      <i class="fa fa-ellipsis-v text-xs" aria-hidden="true"></i>
    </button>
    <ul class="dropdown-menu" :class="{ show: project.showOptions }">
      <li><a class="dropdown-item" @click="confirmDelete(project)">Delete</a></li>
      <li><a class="dropdown-item" @click="runNpmInstall(project.path)">Run npm install</a></li>
      <li><a class="dropdown-item" v-if="!project.ftpConfig" @click="addFtp(project)">Add FTP</a></li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "OptionsDropdown",
  props: {
    project: Object
  },
  methods: {
    toggleOptionsMenu() {
      this.$emit('toggle-options-menu', this.project);
    },
    confirmDelete(project) {
      this.$emit('confirm-delete', project);
    },
    runNpmInstall(path) {
      this.$emit('run-npm-install', path);
    },
    addFtp(project) {
      this.$emit('add-ftp', project);
    }
  }
};
</script>
