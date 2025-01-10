<template>
  <div class="card">
    <ProjectsCardHeader @addProject="addProject" />
    <ProjectsCardBody :projects="projects" @runNpmBuild="runNpmBuild" @runNpmInstall="runNpmInstall" @uploadBuild="uploadBuild" @confirmDelete="confirmDelete" @showFtpModalAction="showFtpModalAction" @toggleOptionsMenu="toggleOptionsMenu" @editFtpDetails="editFtpDetails" />
    <ProjectModal v-if="showModal" @close="closeModal" @save="saveProjectName" @updatePrName="updatePrName" />
    <DeleteModal v-if="showDeleteModal" :project="projectToDelete" @close="closeDeleteModal" @delete="deleteProject" />
    <FtpModal v-if="showFtpModal" @close="closeFtpModal" @save="saveFtpDetails" @updateFtpHost="updateFtpHost" @updateFtpPort="updateFtpPort" @updateFtpUser="updateFtpUser" @updateFtpPassword="updateFtpPassword" @updateFtpPath="updateFtpPath" @updateFtpProtocol="updateFtpProtocol" :ftpDetails="ftpDetails" />
  </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import setTooltip from "@/assets/js/tooltip.js";
import ProjectsCardHeader from "@/components/ProjectsCardHeader.vue";
import ProjectsCardBody from "@/components/ProjectsCardBody.vue";
import ProjectModal from "@/components/ProjectModal.vue";
import DeleteModal from "@/components/DeleteModal.vue";
import FtpModal from "@/components/FtpModal.vue";
const { ipcRenderer } = window.electron;
const path = require('path');

export default {
  name: "projects-card",
  components: {
    ProjectsCardHeader,
    ProjectsCardBody,
    ProjectModal,
    DeleteModal,
    FtpModal,
  },
  data() {
    return {
      initial: null,
      projectName: '',
      showModal: false,
      showDeleteModal: false,
      projectToDelete: null,
      showFtpModal: false,
      ftpDetails: {
        host: '',
        port: '',
        user: '',
        password: '',
        path: '',
        protocol: 'ftp' // Add protocol field
      },
      projectToAddFtp: null
    };
  },
  computed: {
    ...mapState(["projects"]),
  },
  methods: {
    ...mapMutations(["addProjectToStore", "removeProjectFromStore", "addLog", "updateProjectFtp"]),
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
      this.closeOptionsMenu();
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
    async runNpmInstall(project) {
      this.closeOptionsMenu();
      const command = `--prefix ${project.path} install`;
      const timestamp = new Date().toISOString();
      this.addLog({ timestamp, command: `${project.name} install`, result: 'running', response: command });
      try {
        const result = await ipcRenderer.invoke('run-npm-command', command);
        console.log(result);
        this.addLog({ timestamp, command: `${project.name} install`, result: 'success', response: result });
      } catch (error) {
        console.error(error);
        this.addLog({ timestamp, command: `${project.name} install`, result: 'failed', response: error.message });
      }
    },
    async runNpmBuild(project) {
      this.closeOptionsMenu();
      project.isBuilding = true;
      const command = `--prefix ${project.path} run build`;
      const timestamp = new Date().toISOString();
      this.addLog({ timestamp, command: `${project.name} build`, result: 'running', response: command });
      try {
        const result = await ipcRenderer.invoke('run-npm-command', command);
        console.log(result);
        this.addLog({ timestamp, command: `${project.name} build`, result: 'success', response: result });
      } catch (error) {
        console.error(error);
        this.addLog({ timestamp, command: `${project.name} build`, result: 'failed', response: error.message });
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
    closeOptionsMenu() {
      this.projects.forEach(p => {
        p.showOptions = false;
      });
    },
    updatePrName(event) {
      this.projectName = event.target.value;
    },
    resetBuildingStatus() {
      this.projects.forEach(project => {
        project.isBuilding = false;
        project.isUploading = false;
      });
    },
    showFtpModalAction(project) {
      this.closeOptionsMenu();
      this.projectToAddFtp = project;
      this.showFtpModal = true;
    },
    closeFtpModal() {
      this.showFtpModal = false;
      this.projectToAddFtp = null;
    },
    saveFtpDetails() {
      if (this.projectToAddFtp) {
        this.updateProjectFtp({ 
          project: this.projectToAddFtp, 
          ftpConfig: this.ftpDetails 
        });
      }
      this.closeFtpModal();
    },
    editFtpDetails(project) {
      this.closeOptionsMenu();
      this.projectToAddFtp = project;
      this.ftpDetails = { ...project.ftpConfig };
      console.log('this.ftpDetails',this.ftpDetails)
      this.showFtpModal = true;
    },
    updateFtpHost(event) {
      this.ftpDetails.host = event.target.value;
    },
    updateFtpPort(event) {
      this.ftpDetails.port = event.target.value;
    },
    updateFtpUser(event) {
      this.ftpDetails.user = event.target.value;
    },
    updateFtpPassword(event) {
      this.ftpDetails.password = event.target.value;
    },
    updateFtpPath(event) {
      this.ftpDetails.path = event.target.value;
    },
    updateFtpProtocol(event) {
      this.ftpDetails.protocol = event.target.value;
    },
    async uploadBuild(project) {
      project.isUploading = true;
      const timestamp = new Date().toISOString();
      this.addLog({ timestamp, command: `${project.name} build`, result: 'running', response: 'Running build command' });
      await this.runNpmBuild(project);
      const config = {
        host: project.ftpConfig.host,
        port: project.ftpConfig.port,
        username: project.ftpConfig.user,
        password: project.ftpConfig.password,
        localPath: path.join(project.path, 'dist'),
        remotePath: project.ftpConfig.path,
        protocol: project.ftpConfig.protocol
      };
      this.addLog({ timestamp, command: `${project.name} upload`, result: 'running', response: 'Uploading build' });
      try {
        const result = await ipcRenderer.invoke('push-to-remote', config);
        console.log(result);
        this.addLog({ timestamp, command: `${project.name} upload`, result: 'success', response: result });
      } catch (error) {
        console.error(error);
        this.addLog({ timestamp, command: `${project.name} upload`, result: 'failed', response: error.message });
      } finally {
        this.$nextTick(() => {
          project.isUploading = false;
        });
      }
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
  display: inline-block !important;
}

.fa-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
td.align-middle.text-right {
    text-align: end;
}
</style>
