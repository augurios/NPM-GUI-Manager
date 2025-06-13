<template>
  <div class="version-selector">
    <div class="dropdown">
      <button
        class="btn btn-sm dropdown-toggle version-button"
        :class="buttonClass"
        type="button"
        :id="`nodeVersion-${project.id || project.name}`"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <i class="fab fa-node-js me-1"></i>
        {{ displayVersion }}
      </button>
      <ul class="dropdown-menu" :aria-labelledby="`nodeVersion-${project.id || project.name}`">
        <!-- Current project version -->
        <li v-if="projectVersion">
          <h6 class="dropdown-header">Project Version</h6>
        </li>
        <li v-if="projectVersion">
          <a 
            class="dropdown-item" 
            href="#"
            @click.prevent="switchToVersion(projectVersion)"
            :class="{ active: currentVersion === projectVersion }"
          >
            <i class="fas fa-file-code me-2"></i>
            {{ projectVersion }} 
            <span class="badge bg-info ms-2">from .nvmrc</span>
          </a>
        </li>
        <li v-if="projectVersion"><hr class="dropdown-divider"/></li>

        <!-- Installed versions -->
        <li v-if="installedVersions.length > 0">
          <h6 class="dropdown-header">Installed Versions</h6>
        </li>
        <li v-for="version in installedVersions" :key="version.version">
          <a 
            class="dropdown-item" 
            href="#"
            @click.prevent="switchToVersion(version.version)"
            :class="{ active: currentVersion === version.version || currentVersion === `v${version.version}` }"
          >
            <i class="fas fa-circle me-2" :class="getVersionIcon(version)"></i>
            {{ version.version }}
            <span v-if="version.current" class="badge bg-success ms-2">Current</span>
            <span v-if="version.default" class="badge bg-primary ms-2">Default</span>
          </a>
        </li>

        <li v-if="installedVersions.length > 0"><hr class="dropdown-divider"></li>

        <!-- Actions -->
        <li>
          <a class="dropdown-item" href="#" @click.prevent="openNodeManager">
            <i class="fas fa-cog me-2"></i>
            Manage Node Versions
          </a>
        </li>
        <li v-if="!projectVersion">
          <a class="dropdown-item" href="#" @click.prevent="setProjectVersion">
            <i class="fas fa-pin me-2"></i>
            Set Project Version
          </a>
        </li>
        <li v-else>
          <a class="dropdown-item" href="#" @click.prevent="removeProjectVersion">
            <i class="fas fa-times me-2"></i>
            Remove .nvmrc
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
// Use the exposed electron API instead of window.require
const { ipcRenderer } = window.electron;

export default {
  name: "VersionSelector",
  props: {
    project: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      currentVersion: null,
      projectVersion: null,
      installedVersions: [],
      loading: false
    };
  },
  computed: {
    displayVersion() {
      if (this.loading) return 'Loading...';
      if (this.projectVersion) return this.projectVersion;
      if (this.currentVersion) return this.currentVersion.replace('v', '');
      return 'No version';
    },
    buttonClass() {
      if (this.projectVersion) {
        return this.currentVersion === this.projectVersion || this.currentVersion === `v${this.projectVersion}` 
          ? 'btn-success' 
          : 'btn-warning';
      }
      return this.currentVersion ? 'btn-outline-success' : 'btn-outline-secondary';
    }
  },
  async mounted() {
    await this.loadVersionInfo();
  },
  methods: {
    async loadVersionInfo() {
      this.loading = true;
      try {
        // Check for project .nvmrc
        const nvmrcInfo = await ipcRenderer.invoke('project-get-nvmrc', this.project.path);
        this.projectVersion = nvmrcInfo.exists ? nvmrcInfo.version : null;

        // Get current active version
        try {
          this.currentVersion = await ipcRenderer.invoke('nvm-get-current');
        } catch (error) {
          this.currentVersion = null;
        }

        // Get installed versions
        try {
          this.installedVersions = await ipcRenderer.invoke('nvm-list-installed');
        } catch (error) {
          this.installedVersions = [];
        }
      } catch (error) {
        console.error('Error loading version info:', error);
      } finally {
        this.loading = false;
      }
    },

    async switchToVersion(version) {
      try {
        await ipcRenderer.invoke('nvm-switch-version', version);
        await this.loadVersionInfo();
        this.$emit('version-changed', {
          project: this.project,
          version: version,
          message: `Switched to Node ${version}`
        });
      } catch (error) {
        console.error('Error switching version:', error);
        this.$emit('version-error', {
          project: this.project,
          error: error.message
        });
      }
    },

    async setProjectVersion() {
      if (!this.currentVersion) {
        this.$emit('version-error', {
          project: this.project,
          error: 'No Node version is currently active'
        });
        return;
      }

      try {
        const version = this.currentVersion.replace('v', '');
        await ipcRenderer.invoke('project-set-nvmrc', {
          projectPath: this.project.path,
          version: version
        });
        await this.loadVersionInfo();
        this.$emit('version-changed', {
          project: this.project,
          version: version,
          message: `Set Node ${version} as project version`
        });
      } catch (error) {
        console.error('Error setting project version:', error);
        this.$emit('version-error', {
          project: this.project,
          error: error.message
        });
      }
    },

    async removeProjectVersion() {
      if (confirm('Remove .nvmrc file from this project?')) {
        try {
          const result = await ipcRenderer.invoke('project-remove-nvmrc', this.project.path);
          if (result.success) {
            await this.loadVersionInfo();
            this.$emit('version-changed', {
              project: this.project,
              message: 'Removed .nvmrc file from project'
            });
          } else {
            throw new Error(result.message);
          }
        } catch (error) {
          console.error('Error removing .nvmrc:', error);
          this.$emit('version-error', {
            project: this.project,
            error: error.message
          });
        }
      }
    },

    openNodeManager() {
      this.$emit('open-node-manager');
    },

    getVersionIcon(version) {
      if (version.current) return 'text-success';
      if (version.default) return 'text-primary';
      return 'text-muted';
    }
  }
};
</script>

<style scoped>
.version-selector {
  display: inline-block;
}

.version-button {
  font-size: 0.875rem;
  border-radius: 4px;
}

.dropdown-menu {
  min-width: 250px;
}

.dropdown-header {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6c757d;
}

.dropdown-item {
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
}

.dropdown-item.active {
  background-color: #e3f2fd;
  color: #1976d2;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.badge {
  font-size: 0.65rem;
}
</style>
