<template>
  <div class="py-4 container-fluid">
    <div class="row">
      <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
        <mini-statistics-card
          title="Node Version"
          :value="nodeVersion"
          :icon="{
            component: 'ni ni-check-bold',
            background: iconBackground,
          }"
          direction-reverse
        />
        
      </div>

      <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
        <mini-statistics-card
          title="NPM Version"
          :value="npmVersion"
          :icon="{
            component: 'ni ni-check-bold',
            background: iconBackground,
          }"
          direction-reverse
        />
    </div>
  </div>
    <div class="row my-4">
      <div class="col-lg-11 col-md-6 mb-md-0 mb-4">
        <projects-card />
      </div>
    </div>
    <div class="row my-4">
      <div class="col-lg-11 col-md-6">
        <timeline-log />
      </div>
    </div>
  </div>
</template>
<script>
import MiniStatisticsCard from "@/examples/Cards/MiniStatisticsCard.vue";
// import ReportsBarChart from "@/examples/Charts/ReportsBarChart.vue";
// import GradientLineChart from "@/examples/Charts/GradientLineChart.vue";
import TimelineLog from "./components/TimelineLog.vue";
import ProjectsCard from "./components/ProjectsCard.vue";
import {
  faHandPointer,
  faUsers,
  faCreditCard,
  faScrewdriverWrench,
} from "@fortawesome/free-solid-svg-icons";
export default {
  name: "dashboard-default",
  data() {
    return {
      iconBackground: "bg-gradient-success",
      faCreditCard,
      faScrewdriverWrench,
      faUsers,
      faHandPointer,
      nodeVersion: '',
      npmVersion: ''
    };
  },
  methods: {
    async getVersions() {
      const versions = await window.electronAPI.getVersions();
      this.nodeVersion = versions.nodeVersion;
      this.npmVersion = versions.npmVersion;
    }
  },
  mounted() {
    
    this.getVersions();
  },
  components: {
    MiniStatisticsCard,
    // ReportsBarChart,
    // GradientLineChart,
    ProjectsCard,
    TimelineLog,
  },
};
</script>
