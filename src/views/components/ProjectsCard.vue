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
              <td>{{ project.name }}</td>
              <td>{{ project.path }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <div v-if="showModal" class="modal">
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

export default {
  name: "projects-card",
  data() {
    return {
      initial: null,
      projectName: '', // Add a new data property for project name
      showModal: false // Add a new data property to control modal visibility
    };
  },
  computed: {
    ...mapState(["projects"]),
  },
  methods: {
    ...mapMutations(["addProjectToStore"]),
    async addProject() {
      const path = await this.browseFolder();
      this.showModal = true; // Show the modal to enter project name
      // Wait for the user to enter the project name
      const name = await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (!this.showModal) {
            clearInterval(interval);
            resolve(this.projectName);
          }
        }, 100);
      });
      console.log(name, path);
      if (name && path) {
        this.addProjectToStore({ name, path });
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
/* Add some basic styles for the modal */
.modal {
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
