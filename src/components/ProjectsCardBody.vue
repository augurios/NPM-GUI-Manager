<template>
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
                    <img :src="project.favicon || require('@/assets/img/small-logos/logo-webdev.svg')" alt="favicon" class="null null null">
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
            <td class="align-middle text-right">
              <button v-if="project.ftpConfig" class="btn btn-info ms-2" @click="$emit('upload-build', project)" :disabled="project.isBuilding || project.isUploading">
                <i v-if="!project.isUploading" class="fa fa-upload make-inline" aria-hidden="true"></i>
                <i v-else class="fa fa-spinner fa-spin make-inline" aria-hidden="true"></i>
              </button>
              <button class="btn btn-success ms-2" @click="$emit('run-npm-build', project)" :disabled="project.isBuilding || project.isUploading">
                <i v-if="!project.isBuilding" class="fa fa-hammer make-inline" aria-hidden="true"></i>
                <i v-else class="fa fa-spinner fa-spin make-inline" aria-hidden="true"></i>
              </button>
              
              <OptionsDropdown :project="project" @confirm-delete="$emit('confirm-delete', project)" @run-npm-install="$emit('run-npm-install', project)" @add-ftp="$emit('show-ftp-modal-action', project)" @edit-ftp="$emit('edit-ftp-details', project)" @toggle-options-menu="$emit('toggle-options-menu', project)"/>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import OptionsDropdown from "@/components/OptionsDropdown.vue";

export default {
  name: "ProjectsCardBody",
  props: {
    projects: Array
  },
  components: {
    OptionsDropdown
  }
};
</script>