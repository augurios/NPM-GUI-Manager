<template>
  <div class="card">
    <div class="card-header pb-0">
      <div class="row">
        <div class="col-lg-6 col-7">
          <h6>Projects</h6>
          <p class="text-sm mb-0">
            <i class="fa fa-check text-info" aria-hidden="true"></i>
            <span class="font-weight-bold ms-1">{{ projects.length }} done</span> this month
          </p>
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
              <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Path</th>
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
              <td>{{ project.path }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <div v-if="showModal" class="modal-prompt">
    <div class="modal-content">
      <span class="close" @click="closeModal">&times;</span>
      <h2>Enter Project Name</h2>
      <input v-model="projectName" type="text" placeholder="Project Name">
      <button @click="saveProjectName">Save</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import setTooltip from "@/assets/js/tooltip.js";
const { ipcRenderer } = window.electron;
const path = require('path');

export default {
  name: "projects-card",
  data() {
    return {
      initial: null,
      projectName: '',
      showModal: false 
    };
  },
  computed: {
    ...mapState(["projects"]),
  },
  methods: {
    ...mapMutations(["addProjectToStore"]),
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
          if (stat.isFile && stat.isFile() && faviconFiles.includes(file)) {
            return filePath;
          } else if (stat.isDirectory && stat.isDirectory()) {
            const result = await searchFavicon(filePath);
            if (result) return result;
          }
        }
        return null;
      };

      faviconPath = await searchFavicon(folderPath);
      return faviconPath;
    },
    closeModal() {
      this.showModal = false;
    },
    saveProjectName() {
      this.showModal = false;
    }
  },
  components: {
    // SoftAvatar,
    // SoftProgress,
  },
  mounted() {
    setTooltip();
  },
};
</script>

<style>
.modal-prompt {
  display: block;
  position: fixed;
  z-index: 1;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgb(0,0,0);
  background-color: rgba(0,0,0,0.4);
}

.modal-content {
  background-color: #fefefe;
  margin: 15% auto;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
}

.close:hover,
.close:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}
</style>
