import { createStore } from "vuex";
import bootstrap from "bootstrap/dist/js/bootstrap.min.js";
import createPersistedState from "vuex-persistedstate";

export default createStore({
  state: {
    hideConfigButton: false,
    isPinned: true,
    showConfig: false,
    isTransparent: "",
    isRTL: false,
    color: "",
    isNavFixed: false,
    isAbsolute: false,
    showNavs: true,
    showSidenav: true,
    showNavbar: true,
    showFooter: true,
    showMain: true,
    navbarFixed:
      "position-sticky blur shadow-blur left-auto top-1 z-index-sticky px-0 mx-4",
    absolute: "position-absolute px-4 mx-0 w-100 z-index-2",
    bootstrap,
    projects: [],
    logs: [], // Add logs array to state
  },
  mutations: {
    toggleConfigurator(state) {
      state.showConfig = !state.showConfig;
    },
    navbarMinimize(state) {
      const sidenav_show = document.querySelector(".g-sidenav-show");
      if (sidenav_show.classList.contains("g-sidenav-hidden")) {
        sidenav_show.classList.remove("g-sidenav-hidden");
        sidenav_show.classList.add("g-sidenav-pinned");
        state.isPinned = true;
      } else {
        sidenav_show.classList.add("g-sidenav-hidden");
        sidenav_show.classList.remove("g-sidenav-pinned");
        state.isPinned = false;
      }
    },
    sidebarType(state, payload) {
      state.isTransparent = payload;
    },
    cardBackground(state, payload) {
      state.color = payload;
    },
    navbarFixed(state) {
      if (state.isNavFixed === false) {
        state.isNavFixed = true;
      } else {
        state.isNavFixed = false;
      }
    },
    toggleEveryDisplay(state) {
      state.showNavbar = !state.showNavbar;
      state.showSidenav = !state.showSidenav;
      state.showFooter = !state.showFooter;
    },
    toggleHideConfig(state) {
      state.hideConfigButton = !state.hideConfigButton;
    },
    addProjectToStore(state, project) {
      state.projects.push(project);
    },
    removeProjectFromStore(state, project) {
      state.projects = state.projects.filter(p => p.name !== project.name);
    },
    addLog(state, log) {
      state.logs.push({
        ...log,
        duration: log.endTime ? (new Date(log.endTime) - new Date(log.timestamp)) / 1000 : null,
        status: log.result,
      });
    },
    updateProjectFtp(state, { project, ftpConfig }) {
      const proj = state.projects.find(p => p.name === project.name);
      if (proj) {
        proj.ftpConfig = ftpConfig;
      }
    },
    toggleScriptsMenu(state, project) {
      const proj = state.projects.find(p => p.name === project.name);
      if (proj) {
        proj.showScriptsMenu = !proj.showScriptsMenu;
      }
    },
    updateRunningStatus(state, { project, isRunning }) {
      const proj = state.projects.find(p => p.name === project.name);
      if (proj) {
        proj.isRunning = isRunning;
      }
    },
  },
  actions: {
    toggleSidebarColor({ commit }, payload) {
      commit("sidebarType", payload);
    },
    setCardBackground({ commit }, payload) {
      commit("cardBackground", payload);
    },
  },
  getters: {},
  plugins: [createPersistedState()],
});
