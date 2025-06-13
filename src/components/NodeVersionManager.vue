<template>
  <div class="node-version-manager">
    <div class="card">
      <div class="card-header pb-0">
        <div class="d-flex align-items-center">
          <p class="mb-0">Node Version Manager</p>
          <soft-button 
            class="btn btn-sm btn-primary ms-auto"
            @click="refreshVersions"
            :disabled="loading"
          >
            <i class="fas fa-sync-alt me-2"></i>
            Refresh
          </soft-button>
        </div>
      </div>
      <div class="card-body">
        <!-- Current Version Display -->
        <div class="row mb-4">
          <div class="col-md-6">
            <div class="info-box">
              <h6>Current Active Version</h6>
              <div class="version-display">
                <span v-if="currentVersion" class="badge bg-success">
                  {{ currentVersion }}
                </span>
                <span v-else class="badge bg-secondary">
                  No version active
                </span>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="info-box">
              <h6>Default Version</h6>
              <div class="version-display">
                <span v-if="defaultVersion" class="badge bg-info">
                  {{ defaultVersion }}
                </span>
                <span v-else class="badge bg-secondary">
                  No default set
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Installed Versions -->
        <div class="row mb-4">
          <div class="col-12">
            <h6>Installed Versions</h6>
            <div v-if="loading" class="text-center">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
            <div v-else-if="installedVersions.length === 0" class="alert alert-info">
              No Node versions installed via NVM
            </div>
            <div v-else class="versions-grid">
              <div 
                v-for="version in installedVersions" 
                :key="version.version"
                class="version-card"
                :class="{ 'active': version.current, 'default': version.default }"
              >
                <div class="version-info">
                  <span class="version-number">{{ version.version }}</span>
                  <div class="version-badges">
                    <span v-if="version.current" class="badge bg-success">Current</span>
                    <span v-if="version.default" class="badge bg-info">Default</span>
                  </div>
                </div>
                <div class="version-actions">
                  <soft-button
                    v-if="!version.current"
                    size="sm"
                    color="primary"
                    @click="switchToVersion(version.version)"
                    :disabled="switching"
                  >
                    Use
                  </soft-button>
                  <soft-button
                    v-if="!version.default"
                    size="sm"
                    color="info"
                    @click="setAsDefault(version.version)"
                    :disabled="settingDefault"
                  >
                    Set Default
                  </soft-button>
                  <soft-button
                    v-if="!version.current && !version.default"
                    size="sm"
                    color="danger"
                    @click="uninstallVersion(version.version)"
                    :disabled="uninstalling"
                  >
                    Remove
                  </soft-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Install New Version -->
        <div class="row">
          <div class="col-12">
            <h6>Install New Version</h6>
            <div class="install-section">
              <div class="row">
                <div class="col-md-8">
                  <soft-input
                    v-model="newVersionInput"
                    placeholder="Enter version (e.g., 18.17.0, 16.20.0, or 'lts')"
                    :disabled="installing"
                  />
                </div>
                <div class="col-md-4">
                  <soft-button
                    color="success"
                    @click="installNewVersion"
                    :disabled="installing || !newVersionInput.trim()"
                    class="w-100"
                  >
                    <i v-if="installing" class="fas fa-spinner fa-spin me-2"></i>
                    <i v-else class="fas fa-download me-2"></i>
                    {{ installing ? 'Installing...' : 'Install' }}
                  </soft-button>
                </div>
              </div>
              
              <!-- Quick Install Options -->
              <div class="quick-install mt-3">
                <h6>Quick Install</h6>
                <div class="d-flex gap-2 flex-wrap">
                  <soft-button
                    v-for="option in quickInstallOptions"
                    :key="option.version"
                    size="sm"
                    color="secondary"
                    @click="installQuickVersion(option.version)"
                    :disabled="installing"
                  >
                    {{ option.label }}
                  </soft-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Installation Progress -->
        <div v-if="installProgress" class="mt-4">
          <div class="progress-section">
            <h6>Installation Progress</h6>
            <div class="progress">
              <div 
                class="progress-bar progress-bar-striped progress-bar-animated" 
                role="progressbar" 
                style="width: 50%"
              ></div>
            </div>
            <small class="text-muted">Installing Node {{ installProgress }}...</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SoftButton from "@/components/SoftButton.vue";
import SoftInput from "@/components/SoftInput.vue";

// Use the exposed electron API instead of window.require
const { ipcRenderer } = window.electron;

export default {
  name: "NodeVersionManager",
  components: {
    SoftButton,
    SoftInput,
  },
  data() {
    return {
      loading: false,
      installing: false,
      switching: false,
      settingDefault: false,
      uninstalling: false,
      currentVersion: null,
      defaultVersion: null,
      installedVersions: [],
      availableVersions: [],
      newVersionInput: '',
      installProgress: null,
      quickInstallOptions: [
        { label: 'Latest LTS', version: 'lts' },
        { label: 'Node 18 LTS', version: '18' },
        { label: 'Node 16 LTS', version: '16' },
        { label: 'Latest', version: 'node' }
      ]
    };
  },
  async mounted() {
    await this.loadVersions();
  },
  methods: {
    async loadVersions() {
      this.loading = true;
      try {
        // Load current version
        try {
          this.currentVersion = await ipcRenderer.invoke('nvm-get-current');
        } catch (error) {
          console.warn('Could not get current version:', error);
          this.currentVersion = null;
        }

        // Load installed versions
        try {
          this.installedVersions = await ipcRenderer.invoke('nvm-list-installed');
          // Find default version
          const defaultVer = this.installedVersions.find(v => v.default);
          this.defaultVersion = defaultVer ? defaultVer.version : null;
        } catch (error) {
          console.warn('Could not get installed versions:', error);
          this.installedVersions = [];
        }
      } catch (error) {
        console.error('Error loading versions:', error);
        this.$emit('show-alert', {
          type: 'error',
          message: 'Failed to load Node versions: ' + error.message
        });
      } finally {
        this.loading = false;
      }
    },

    async refreshVersions() {
      await this.loadVersions();
      this.$emit('show-alert', {
        type: 'success',
        message: 'Node versions refreshed successfully'
      });
    },

    async switchToVersion(version) {
      this.switching = true;
      try {
        await ipcRenderer.invoke('nvm-switch-version', version);
        await this.loadVersions();
        this.$emit('show-alert', {
          type: 'success',
          message: `Switched to Node ${version}`
        });
      } catch (error) {
        console.error('Error switching version:', error);
        this.$emit('show-alert', {
          type: 'error',
          message: 'Failed to switch version: ' + error.message
        });
      } finally {
        this.switching = false;
      }
    },

    async setAsDefault(version) {
      this.settingDefault = true;
      try {
        await ipcRenderer.invoke('nvm-set-default', version);
        await this.loadVersions();
        this.$emit('show-alert', {
          type: 'success',
          message: `Set Node ${version} as default`
        });
      } catch (error) {
        console.error('Error setting default:', error);
        this.$emit('show-alert', {
          type: 'error',
          message: 'Failed to set default version: ' + error.message
        });
      } finally {
        this.settingDefault = false;
      }
    },

    async uninstallVersion(version) {
      if (!confirm(`Are you sure you want to uninstall Node ${version}?`)) {
        return;
      }

      this.uninstalling = true;
      try {
        await ipcRenderer.invoke('nvm-uninstall-version', version);
        await this.loadVersions();
        this.$emit('show-alert', {
          type: 'success',
          message: `Uninstalled Node ${version}`
        });
      } catch (error) {
        console.error('Error uninstalling version:', error);
        this.$emit('show-alert', {
          type: 'error',
          message: 'Failed to uninstall version: ' + error.message
        });
      } finally {
        this.uninstalling = false;
      }
    },

    async installNewVersion() {
      if (!this.newVersionInput.trim()) return;
      
      await this.installVersion(this.newVersionInput.trim());
      this.newVersionInput = '';
    },

    async installQuickVersion(version) {
      await this.installVersion(version);
    },

    async installVersion(version) {
      this.installing = true;
      this.installProgress = version;
      
      try {
        await ipcRenderer.invoke('nvm-install-version', version);
        await this.loadVersions();
        this.$emit('show-alert', {
          type: 'success',
          message: `Successfully installed Node ${version}`
        });
      } catch (error) {
        console.error('Error installing version:', error);
        this.$emit('show-alert', {
          type: 'error',
          message: 'Failed to install version: ' + error.message
        });
      } finally {
        this.installing = false;
        this.installProgress = null;
      }
    }
  }
};
</script>

<style scoped>
.node-version-manager {
  max-width: 1200px;
  margin: 0 auto;
}

.info-box {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.info-box h6 {
  margin-bottom: 0.5rem;
  color: #6c757d;
}

.version-display {
  font-size: 1.1rem;
}

.versions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.version-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  background: white;
  transition: all 0.2s ease;
}

.version-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.version-card.active {
  border-color: #28a745;
  background: #f8fff9;
}

.version-card.default {
  border-color: #17a2b8;
  background: #f0fcff;
}

.version-info {
  margin-bottom: 1rem;
}

.version-number {
  font-size: 1.2rem;
  font-weight: 600;
  color: #495057;
}

.version-badges {
  margin-top: 0.5rem;
}

.version-badges .badge {
  margin-right: 0.5rem;
}

.version-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.install-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
}

.quick-install h6 {
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.progress-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}

.progress-section h6 {
  margin-bottom: 1rem;
  color: #6c757d;
}

@media (max-width: 768px) {
  .versions-grid {
    grid-template-columns: 1fr;
  }
  
  .version-actions {
    justify-content: center;
  }
}
</style>
