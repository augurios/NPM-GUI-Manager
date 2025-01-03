
<template>
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
        <button @click="$emit('add-project')" class="btn btn-primary">Add Project</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ProjectsCardHeader",
};
</script>