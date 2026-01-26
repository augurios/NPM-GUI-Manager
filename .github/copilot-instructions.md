# NPM GUI Manager - AI Agent Instructions

## Project Overview
This is an **Electron + Vue.js 3** desktop application that provides a GUI for managing npm projects and Node.js versions. The app acts as a visual interface for running npm scripts, managing multiple projects, switching Node versions via NVM, and deploying builds via FTP/SFTP.

## Architecture

### Three-Layer Structure
1. **Electron Main Process** ([main.js](main.js)) - Handles system operations, file I/O, shell commands, and NVM integration
2. **Preload Script** ([preload.js](preload.js)) - Security bridge using `contextBridge` to expose IPC channels to renderer
3. **Vue.js Renderer** ([src/](src/)) - UI layer with Vuex state management for project data and logs

### Key Integration Pattern: IPC Communication
All system operations follow this pattern:
```javascript
// Renderer (Vue): src/views/components/ProjectsCard.vue
const { ipcRenderer } = window.electron;
const result = await ipcRenderer.invoke('run-npm-script', { projectPath, scriptName });

// Main Process: main.js
ipcMain.handle('run-npm-script', async (event, { projectPath, scriptName }) => {
  return execWithEnv(`npm --prefix ${projectPath} run ${scriptName}`);
});
```

## Critical Developer Workflows

### Development
```bash
npm run electron:serve  # Concurrent Vue dev server (port 8080) + Electron
```
- Vue app hot-reloads at `http://localhost:8080`
- Electron loads from localhost in dev mode (see [main.js](main.js#L48-L52))

### Production Build
```bash
npm run electron:build  # Vue production build → electron-builder packaging
```
- Output: `build/` directory with platform-specific installers
- Includes NVM binaries as `extraFiles` (see [package.json](package.json#L27-L41))

### Testing Individual Components
```bash
npm run serve  # Vue-only development (no Electron)
npm run start  # Launch Electron with existing dist/ build
```

## Project-Specific Conventions

### 1. Cross-Platform Shell Execution
**ALWAYS use `execWithEnv()` wrapper** ([main.js](main.js#L13-L42), [utils.js](utils.js#L5-L34)) for any shell commands:
- Automatically sources NVM for Unix shells (`/bin/zsh`)
- Handles Windows NVM path setup
- Maintains proper environment variables across Node version switches

```javascript
// ✅ Correct
execWithEnv('nvm use 16.20.2', (error, stdout) => { /* ... */ });

// ❌ Wrong - will break NVM commands
exec('nvm use 16.20.2', (error, stdout) => { /* ... */ });
```

### 2. State Management with Vuex Persistence
Projects and logs are stored in [src/store/index.js](src/store/index.js) with `vuex-persistedstate`:
- `state.projects[]` - Array of project configs (path, name, ftpConfig, showScriptsMenu, isRunning)
- `state.logs[]` - Timeline of npm command executions
- Persisted to localStorage automatically - **no manual save logic needed**

### 3. Node Version Management Architecture
Two-level version handling:
1. **Global NVM control** via [src/views/NodeVersions.vue](src/views/NodeVersions.vue) + [src/components/NodeVersionManager.vue](src/components/NodeVersionManager.vue)
2. **Project-specific `.nvmrc`** detection via `nvm-auto-switch` handler ([main.js](main.js#L397-L434))
   - Automatically reads `.nvmrc` when running scripts
   - Pre-pends `nvm use <version>` to npm commands

### 4. UI Component Library
Uses **Soft UI Dashboard** theme components:
- Custom components in [src/components/](src/components/) (SoftButton, SoftInput, etc.)
- Template parts in [src/templateParts/](src/templateParts/) (Sidenav, Navbar, Footer)
- Follow existing prop patterns: `color`, `variant="gradient"`, `full-width`

### 5. IPC Handler Naming Convention
Pattern: `<domain>-<action>` (e.g., `nvm-install-version`, `project-get-nvmrc`, `run-npm-script`)
- Defined in [main.js](main.js) as `ipcMain.handle()`
- Invoked via `window.electron.ipcRenderer.invoke()` in Vue components

## Key Files Reference

### Core Electron Files
- [main.js](main.js) - Main process, IPC handlers (430 lines)
- [preload.js](preload.js) - Security context bridge (26 lines)
- [utils.js](utils.js) - NVM installation/management utilities (445 lines)

### Vue Application Entry Points
- [src/main.js](src/main.js) - Vue app initialization
- [src/App.vue](src/App.vue) - Root component with sidenav/navbar layout
- [src/router/index.js](src/router/index.js) - Routes: `/dashboard`, `/node-versions`, etc.
- [src/store/index.js](src/store/index.js) - Vuex store with project/log state

### Primary Views
- [src/views/Dashboard.vue](src/views/Dashboard.vue) - Main view with projects grid + timeline
- [src/views/NodeVersions.vue](src/views/NodeVersions.vue) - NVM management interface
- [src/views/components/ProjectsCard.vue](src/views/components/ProjectsCard.vue) - Project grid, npm script execution (400+ lines)

### Essential Components
- [src/components/NodeVersionManager.vue](src/components/NodeVersionManager.vue) - NVM operations UI
- [src/components/VersionSelector.vue](src/components/VersionSelector.vue) - Per-project Node version picker
- [src/components/FtpModal.vue](src/components/FtpModal.vue) - FTP/SFTP deployment config

## External Dependencies & Integration

### NVM Integration
- **Bundled in build**: NVM binaries included via `extraFiles` in electron-builder config
- **Runtime detection**: Platform-specific checks (`plat === 'darwin'` vs `'win32'`)
- **Version switching**: Updates `process.env.PATH` dynamically ([utils.js](utils.js#L37-L76))

### Remote Deployment
- **FTP**: `basic-ftp` library ([main.js](main.js#L147-L171))
- **SFTP**: `ssh2` library ([main.js](main.js#L172-L227))
- Config stored per-project in Vuex: `project.ftpConfig = { host, port, username, password, protocol, localPath, remotePath }`

### Build System
- **Vue CLI 4.5** for Vue app compilation
- **electron-builder** for packaging (output: `build/` directory)
- **Cross-platform considerations**: Uses `cross-env` for environment variables

## Common Pitfalls

1. **Don't bypass `contextIsolation`**: Always use `window.electron.ipcRenderer.invoke()` - never try to require Node modules directly in Vue files
2. **Platform checks required**: Many features differ between macOS (`'darwin'`) and Windows (`'win32'`) - check [utils.js](utils.js) for patterns
3. **Async IPC handlers**: All `ipcRenderer.invoke()` calls return Promises - must use `await`
4. **NVM environment**: Commands run in child processes won't inherit NVM state unless using `execWithEnv()`
5. **Dev vs Production paths**: File paths differ (`http://localhost:8080` vs `file://` protocol) - see [main.js](main.js#L48-L52)

## Testing Changes

1. **Quick UI iteration**: `npm run serve` (Vue-only, no Electron restart needed)
2. **Full integration test**: `npm run electron:serve` (auto-reload on Vue changes)
3. **Production verification**: `npm run electron:build` then test the app in `build/mac-arm64/` or equivalent

## Debugging Tips

- **DevTools**: Electron opens Chrome DevTools in development mode automatically
- **Console logs**: Check both terminal (main process) and DevTools (renderer process)
- **IPC debugging**: Add `console.log()` in both main.js handlers and Vue components
- **NVM issues**: Check `process.env.NVM_DIR` and `process.env.PATH` in execWithEnv callbacks
