<template>
  <div class="card">
    <div class="card-header pb-0">
      <div class="row">
        <div class="col-lg-6 col-7">
          <h6>Projects</h6>
          <!-- <p class="text-sm mb-0">
            <i class="fa fa-check text-info" aria-hidden="true"></i>
            <span class="font-weight-bold ms-1">{{ projects.length }} done</span> this month
          </p> -->
        </div>
        <div class="col-lg-6 col-5 my-auto text-end">
          <button @click="addProject" class="btn btn-primary">Add Project</button>
        </div>
      </div>
    </div>
    <div class="card-body px-0 pb-2">
      <div class="table-responsive">
        <table class="table align-items-center mb-0">
          <thead>
            <tr>
              <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Project Name</th>
              <th class="text-center text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Path</th>
              <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">...</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="project in projects" :key="project.name">
              <td>
                <div class="d-flex px-2 py-1">
                  <div>
                    <div class="avatar avatar-sm me-3">
                      <img :src="project.favicon || '/img/logo-xd.c0c96993.svg'" alt="favicon" class="null null null">
                    </div>
                  </div>
                  <div class="d-flex flex-column justify-content-center">
                      <h6 class="mb-0 text-sm">{{ project.name }}</h6>
                  </div>
                </div>
              </td>
              <td class="align-middle text-center text-sm">
                <span class="text-xs font-weight-bold pj-path">{{ project.path }}</span>
              </td>
              <td class="align-middle">
                <button class="btn btn-success ms-2" @click="runNpmBuild(project)" :disabled="project.isBuilding">
                  <i v-if="!project.isBuilding" class="fa fa-hammer make-inline" aria-hidden="true"></i>
                  <i v-else class="fa fa-spinner fa-spin make-inline" aria-hidden="true"></i>
                </button>
                <div class="dropdown make-inline">
                  <button class="btn btn-link text-secondary mb-0" @click="toggleOptionsMenu(project)" data-bs-toggle="dropdown">
                    <i class="fa fa-ellipsis-v text-xs" aria-hidden="true"></i>
                  </button>
                  <ul class="dropdown-menu" :class="{ show: project.showOptions }">
                    <li><a class="dropdown-item" @click="confirmDelete(project)">Delete</a></li>
                    <li><a class="dropdown-item" @click="runNpmInstall(project.path)">Run npm install</a></li>
                  </ul>
                </div>
                
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="showModal">
      <ModalPrompt @close="closeModal">
        <template v-slot:title>
          Enter Project Name
        </template>
        <template v-slot:body>
          <soft-input @input="updatePrName" type="text" placeholder="Project Name" aria-label="Project Name" :isRequired="true" />
        </template>
        <template v-slot:footer>
          <soft-button color="dark" full-width variant="gradient" @click="saveProjectName">Save</soft-button>
        </template>
      </ModalPrompt>
    </div>
    <div v-if="showDeleteModal">
      <ModalPrompt @close="closeDeleteModal">
        <template v-slot:title>
          Confirm Deletion
        </template>
        <template v-slot:body>
          <p>Are you sure you want to delete the project "{{ projectToDelete.name }}"?</p>
        </template>
        <template v-slot:footer>
          <soft-button color="dark" variant="gradient" @click="deleteProject">Delete</soft-button>
          <soft-button color="secondary" variant="gradient" @click="closeDeleteModal">Cancel</soft-button>
        </template>
      </ModalPrompt>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import setTooltip from "@/assets/js/tooltip.js";
import ModalPrompt from "@/components/ModalPrompt.vue";
import SoftInput from "@/components/SoftInput.vue";
import SoftButton from "@/components/SoftButton.vue";
const { ipcRenderer } = window.electron;
const path = require('path');

export default {
  name: "projects-card",
  components: {
    ModalPrompt,
    SoftInput,
    SoftButton,
  },
  data() {
    return {
      initial: null,
      projectName: '',
      showModal: false,
      showDeleteModal: false,
      projectToDelete: null
    };
  },
  computed: {
    ...mapState(["projects"]),
  },
  methods: {
    ...mapMutations(["addProjectToStore", "removeProjectFromStore", "addLog"]),
    async addProject() {
      const folderPath = await this.browseFolder();
      this.showModal = true; 
      const name = await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (!this.showModal) {
            clearInterval(interval);
            resolve(this.projectName);
          }
        }, 100);
      });
      const favicon = await this.findFavicon(folderPath);
      console.log(name, folderPath, favicon);
      if (name && folderPath) {
        this.addProjectToStore({ name, path: folderPath, favicon });
      }
    },
    browseFolder() {
      return new Promise((resolve) => {
        ipcRenderer.invoke('show-open-dialog', {
          properties: ['openDirectory']
        }).then(result => {
          if (!result.canceled && result.filePaths.length > 0) {
            resolve(result.filePaths[0]);
          } else {
            resolve(undefined);
          }
        }).catch(err => {
          console.error(err);
          resolve(undefined);
        });
      });
    },
    async findFavicon(folderPath) {
      const faviconFiles = ['favicon.ico', 'favicon.png'];
      let faviconPath = null;

      const searchFavicon = async (dir) => {
        const files = await ipcRenderer.invoke('custom-readdir', dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await ipcRenderer.invoke('custom-stat', filePath);
          if (!stat.isDirectory && faviconFiles.includes(file)) {
            return filePath;
          }
        }
        return null;
      };

      // Search in the main folder
      faviconPath = await searchFavicon(folderPath);
      if (faviconPath) return await ipcRenderer.invoke('read-file', faviconPath);

      // Search in immediate subfolders
      const subfolders = await ipcRenderer.invoke('custom-readdir', folderPath);
      
      for (const subfolder of subfolders) {
        const subfolderPath = path.join(folderPath, subfolder);
        const stat = await ipcRenderer.invoke('custom-stat', subfolderPath);
        console.log('stat', stat);
        if (stat.isDirectory) {
          const result = await searchFavicon(subfolderPath);
          if (result) return await ipcRenderer.invoke('read-file', result);
        }
      }

      return null;
    },
    closeModal() {
      this.showModal = false;
      this.projectName = '';
    },
    saveProjectName() {
      this.showModal = false;
    },
    confirmDelete(project) {
      this.projectToDelete = project;
      this.showDeleteModal = true;
    },
    closeDeleteModal() {
      this.showDeleteModal = false;
      this.projectToDelete = null;
    },
    deleteProject() {
      this.removeProjectFromStore(this.projectToDelete);
      this.closeDeleteModal();
    },
    async runNpmInstall(projectPath) {
      const command = `--prefix ${projectPath} install`;
      const timestamp = new Date().toISOString();
      this.addLog({ timestamp, command, result: 'running' });
      try {
        const result = await ipcRenderer.invoke('run-npm-command', command);
        console.log(result);
        this.addLog({ timestamp, command, result: 'success', response: result });
      } catch (error) {
        console.error(error);
        this.addLog({ timestamp, command, result: 'failed', response: error });
      }
    },
    async runNpmBuild(project) {
      project.isBuilding = true;
      const command = `--prefix ${project.path} run build`;
      const timestamp = new Date().toISOString();
      this.addLog({ timestamp, command: `${project.name} build`, result: 'running' });
      try {
        const result = await ipcRenderer.invoke('run-npm-command', command);
        console.log(result);
        this.addLog({ timestamp, command: `${project.name} build`, result: 'success', response: result });
      } catch (error) {
        console.error(error);
        this.addLog({ timestamp, command: `${project.name} build`, result: 'failed', response: error });
      } finally {
        this.$nextTick(() => {
          project.isBuilding = false;
        });
      }
    },
    toggleOptionsMenu(project) {
      this.projects.forEach(p => {
        if (p !== project) {
          p.showOptions = false;
        }
      });
      project.showOptions = !project.showOptions;
    },
    updatePrName(event) {
      this.projectName = event.target.value;
    },
    resetBuildingStatus() {
      this.projects.forEach(project => {
        project.isBuilding = false;
      });
    }
  },
  mounted() {
    setTooltip();
    this.resetBuildingStatus();
  },
};
</script>

<style>


.pj-path {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.table-responsive {
  overflow-x: initial !important;
}
.make-inline {
  display: inline !important;
}
</style>
