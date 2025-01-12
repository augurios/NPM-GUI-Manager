<template>
  <div class="dropdown make-inline scripts-dropdown">
    <ul class="dropdown-menu" :class="{ show: project.showScriptsMenu }">
      <li v-for="(script, name) in scripts" :key="name">
        <a class="dropdown-item" @click="runScript(name)">{{ name }}</a>
      </li>
    </ul>
  </div>
</template>

<script>
const { ipcRenderer } = window.electron;
export default {
  name: "ScriptsDropdown",
  props: {
    project: Object
  },
  data() {
    return {
      scripts: {}
    };
  },
  mounted() {
    this.fetchScripts();
  },
  methods: {
    async fetchScripts() {
      try {
        const result = await ipcRenderer.invoke('get-npm-scripts', this.project.path);
        this.scripts = result;
      } catch (error) {
        console.error('Failed to fetch scripts:', error);
      }
    },
    toggleScriptsMenu() {
      this.$emit('toggle-scripts-menu', this.project);
    },
    runScript(scriptName) {
      this.$emit('run-script', scriptName);
    }
  }
};
</script>
<style>
.scripts-dropdown {
    left: -58px;
    top: -25px;
}
</style>