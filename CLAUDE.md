# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**NPM GUI Manager** — an Electron + Vue 3 desktop app that provides a GUI for running npm scripts, managing multiple local projects, switching Node versions via NVM, and deploying builds via FTP/SFTP.

## Commands

```bash
npm run electron:dev     # Full dev mode: Vue dev server (port 8080) + Electron + Vue DevTools
npm run electron:serve   # Same but without Vue DevTools
npm run serve            # Vue-only dev server (no Electron, faster UI iteration)
npm run start            # Launch Electron against existing dist/ build
npm run electron:build   # Production: Vue build → electron-builder packaging → build/
npm run build            # Vue build only (CI=false to suppress warnings as errors)
npm run lint             # ESLint
```

There are no automated tests in this project.

## Architecture

### Three-Layer Structure

```
Electron Main Process (main.js)
  ↕ IPC via ipcMain.handle / ipcRenderer.invoke
Preload Script (preload.js)   ← contextBridge security boundary
  ↕ window.electron.ipcRenderer
Vue 3 Renderer (src/)
```

**All system operations must go through IPC.** Vue components never access Node.js APIs directly — `contextIsolation: true` and `nodeIntegration: false` are enforced in the BrowserWindow config.

### IPC Call Pattern

```javascript
// Vue component (renderer)
const result = await window.electron.ipcRenderer.invoke('channel-name', payload);

// main.js
ipcMain.handle('channel-name', async (event, payload) => { ... });
```

IPC channel naming: `<domain>-<action>` (e.g., `nvm-install-version`, `project-get-nvmrc`, `run-npm-script`).

### State Management

Vuex store (`src/store/index.js`) persists to localStorage via `vuex-persistedstate` — no manual save logic needed.

Key state:
- `state.projects[]` — array of `{ name, path, ftpConfig, showScriptsMenu, isRunning }`
- `state.logs[]` — timeline of npm script executions

### Shell Execution: Always Use `execWithEnv()`

Both `main.js` and `utils.js` export an `execWithEnv()` wrapper. **Use it for any shell command** — it ensures NVM is sourced correctly on Unix (prepends `export NVM_DIR && . "$NVM_DIR/nvm.sh"`) and sets the correct shell (`/bin/zsh` on Mac, `cmd.exe` on Windows). Using the bare `exec()` will break any NVM-related command.

### NVM Integration

Two levels of Node version management:
1. **Global** — `src/views/NodeVersions.vue` + `src/components/NodeVersionManager.vue` for install/switch/uninstall via NVM
2. **Per-project `.nvmrc`** — when running a script, `main.js` checks for `.nvmrc` via `checkNvmrcFile()` and prepends `nvm use <version>` to the npm command automatically

All NVM utility functions live in `utils.js` and are imported into `main.js`.

### Cross-Platform

Many handlers branch on `process.platform === 'win32'` vs `'darwin'`. Check `utils.js` for established patterns before adding new shell commands.

### Dev vs Production Paths

`main.js` loads `http://localhost:8080/#/dashboard` in development and `file://.../dist/index.html#/dashboard` in production. The router uses hash history (`createWebHashHistory`) to support the `file://` protocol.

### UI Components

Built on the **Soft UI Dashboard** theme. Reusable primitives are in `src/components/` (prefixed `Soft*`). Layout chrome (sidenav, navbar, footer) is in `src/templateParts/`. Follow existing prop conventions: `color`, `variant="gradient"`, `full-width`.

### Remote Deployment

FTP via `basic-ftp`, SFTP via `ssh2`. Config is stored per-project in Vuex as `project.ftpConfig = { host, port, username, password, protocol, localPath, remotePath }` and edited through `src/components/FtpModal.vue`.

### Build Output

`electron-builder` outputs to `build/`. The config in `package.json` bundles NVM binaries from the local machine as `extraFiles` — the hardcoded NVM paths there are machine-specific and may need updating when building on a different machine.
