const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { Client } = require('ssh2');
const ftp = require('basic-ftp');
const isDev = process.env.NODE_ENV === "development";
const { checkAndInstallNvmMAC, checkAndInstallNvmWIN, getVersionsMAC, getVersionsWIN, getAvailableNodeVersions, getInstalledNodeVersions, installNodeVersion, switchNodeVersion, setDefaultNodeVersion, uninstallNodeVersion, getCurrentActiveVersion, checkNvmrcFile, createNvmrcFile } = require('./utils'); // Import utility functions
const plat = process.platform;

function createWindow() {
  console.log("Running on " + plat);
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 920,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Ensure nodeIntegration is disabled
      contextIsolation: true // Enable contextIsolation
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:8080"); // Development mode
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, "dist", "index.html")}`);
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (plat !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('show-open-dialog', async (event, options) => {
   return dialog.showOpenDialog(options);
});

ipcMain.handle('run-npm-command', async (event, command) => {
    try {
      return new Promise((resolve, reject) => {
        exec(`npm ${command}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`NPM Command Error: ${stderr}`);
            reject(stderr);
          } else {
            console.log(`NPM Command Output: ${stdout}`);
            resolve(stdout);
          }
        });
      });
    } catch (err) {
      console.error(`Unexpected Error: ${err}`);
      throw err;
    }
});

ipcMain.handle('run-npm-script', async (event, { projectPath, scriptName, useProjectNodeVersion = true }) => {
  try {
    let command = `npm --prefix ${projectPath} run ${scriptName}`;
    let execOptions = {};
    
    // Check for project-specific Node version
    if (useProjectNodeVersion) {
      const nvmrcInfo = await checkNvmrcFile(projectPath);
      if (nvmrcInfo.exists) {
        const requiredVersion = nvmrcInfo.version;
        
        // Prepare environment with correct Node version
        if (plat === 'win32') {
          command = `set NVM_HOME=%USERPROFILE%\\AppData\\Roaming\\nvm && %NVM_HOME%\\nvm.exe use ${requiredVersion} && ${command}`;
          execOptions.shell = 'cmd.exe';
        } else {
          command = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use ${requiredVersion} && ${command}`;
          execOptions.shell = '/bin/zsh';
        }
      }
    }
    
    const childProcess = exec(command, execOptions);

    childProcess.stdout.on('data', (data) => {
      // console.log(`childProcess stdout: ${data}`);
      event.sender.send('npm-script-output', { projectPath, scriptName, data });
    });

    childProcess.stderr.on('data', (data) => {
      event.sender.send('npm-script-error', { projectPath, scriptName, data });
    });

    childProcess.on('close', (code) => {
      event.sender.send('npm-script-close', { projectPath, scriptName, code });
    });

    return childProcess.pid;
  } catch (error) {
    console.error('Error running npm script:', error);
    throw error;
  }
});

ipcMain.handle('stop-npm-script', async (event, pid) => {
  process.kill(pid);
});

ipcMain.handle('push-to-remote', async (event, config) => {
  const { host, port, username, password, localPath, remotePath, protocol } = config;
  console.log('Starting push-to-remote with config:', config);

  if (protocol === 'ftp') {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
      await client.access({
        host,
        port,
        user: username,
        password,
        secure: false
      });
      console.log('FTP connection established.');
      await client.ensureDir(remotePath);
      await client.clearWorkingDir();
      await client.uploadFromDir(localPath);
      console.log('All files uploaded successfully.');
      return 'All files uploaded successfully';
    } catch (err) {
      console.error('FTP error:', err);
      throw err;
    } finally {
      client.close();
    }
  } else if (protocol === 'sftp') {
    const conn = new Client();
    return new Promise((resolve, reject) => {
      conn.on('ready', () => {
        console.log('SSH connection ready.');
        conn.sftp((err, sftp) => {
          if (err) {
            console.error('SFTP error:', err);
            reject(err);
            return;
          }
          console.log('SFTP connection established. Uploading files...');
          const uploadDir = async (localDir, remoteDir) => {
            const files = await fs.promises.readdir(localDir);
            for (const file of files) {
              const localFilePath = path.join(localDir, file);
              const remoteFilePath = path.join(remoteDir, file);
              const stats = await fs.promises.stat(localFilePath);
              if (stats.isDirectory()) {
                await sftp.mkdir(remoteFilePath, true);
                await uploadDir(localFilePath, remoteFilePath);
              } else {
                await new Promise((res, rej) => {
                  sftp.fastPut(localFilePath, remoteFilePath, (err) => {
                    if (err) rej(err);
                    else res();
                  });
                });
              }
            }
          };
          uploadDir(localPath, remotePath).then(() => {
            console.log('All files uploaded successfully.');
            resolve('All files uploaded successfully');
            conn.end();
          }).catch((err) => {
            console.error('File upload error:', err);
            reject(err);
            conn.end();
          });
        });
      }).on('error', (err) => {
        console.error('SSH connection error:', err);
        reject(err);
      }).connect({
        host,
        port,
        username,
        password
      });
    });
  } else {
    throw new Error('Unsupported protocol');
  }
});

ipcMain.handle('custom-readdir', async (event, dir) => {
  return fs.promises.readdir(dir);
});

ipcMain.handle('custom-stat', async (event, filePath) => {
  const stats = await fs.promises.stat(filePath);
  return {
    isDirectory: stats.isDirectory(),
  };
});

ipcMain.handle('read-file', async (event, filePath) => {
  const data = await fs.promises.readFile(filePath, { encoding: 'base64' });
  return `data:image/${path.extname(filePath).slice(1)};base64,${data}`;
});

ipcMain.handle('get-versions', async () => {
  if (plat === 'win32') {
      return await getVersionsWIN();
  } else if (plat === 'darwin') {
      return await getVersionsMAC();
  } 
  
});

ipcMain.handle('check-nvm-node', async () => {  
  if (plat === 'win32') {
      return await checkAndInstallNvmWIN();
  } else if (plat === 'darwin') {
      return await checkAndInstallNvmMAC();
  } 
  
});

ipcMain.handle('get-npm-scripts', async (event, projectPath) => {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf-8'));
    return packageJson.scripts || {};
  } catch (error) {
    console.error('Failed to read package.json:', error);
    throw error;
  }
});

ipcMain.handle('open-url', async (event, url) => {
  await shell.openExternal(url);
});

// Enhanced Node Version Management IPC Handlers

ipcMain.handle('nvm-list-available', async () => {
  try {
    return await getAvailableNodeVersions();
  } catch (error) {
    console.error('Failed to get available Node versions:', error);
    throw error;
  }
});

ipcMain.handle('nvm-list-installed', async () => {
  try {
    return await getInstalledNodeVersions();
  } catch (error) {
    console.error('Failed to get installed Node versions:', error);
    throw error;
  }
});

ipcMain.handle('nvm-install-version', async (event, version) => {
  try {
    const result = await installNodeVersion(version);
    return result;
  } catch (error) {
    console.error(`Failed to install Node ${version}:`, error);
    throw error;
  }
});

ipcMain.handle('nvm-switch-version', async (event, version) => {
  try {
    return await switchNodeVersion(version);
  } catch (error) {
    console.error(`Failed to switch to Node ${version}:`, error);
    throw error;
  }
});

ipcMain.handle('nvm-set-default', async (event, version) => {
  try {
    return await setDefaultNodeVersion(version);
  } catch (error) {
    console.error(`Failed to set Node ${version} as default:`, error);
    throw error;
  }
});

ipcMain.handle('nvm-uninstall-version', async (event, version) => {
  try {
    return await uninstallNodeVersion(version);
  } catch (error) {
    console.error(`Failed to uninstall Node ${version}:`, error);
    throw error;
  }
});

ipcMain.handle('nvm-get-current', async () => {
  try {
    return await getCurrentActiveVersion();
  } catch (error) {
    console.error('Failed to get current Node version:', error);
    throw error;
  }
});

ipcMain.handle('project-get-nvmrc', async (event, projectPath) => {
  try {
    return await checkNvmrcFile(projectPath);
  } catch (error) {
    console.error('Failed to check .nvmrc file:', error);
    throw error;
  }
});

ipcMain.handle('project-set-nvmrc', async (event, { projectPath, version }) => {
  try {
    return await createNvmrcFile(projectPath, version);
  } catch (error) {
    console.error('Failed to create .nvmrc file:', error);
    throw error;
  }
});

// Add handler to remove .nvmrc file
ipcMain.handle('project-remove-nvmrc', async (event, projectPath) => {
  try {
    const nvmrcPath = path.join(projectPath, '.nvmrc');
    await fs.promises.unlink(nvmrcPath);
    return { success: true, message: 'Successfully removed .nvmrc file' };
  } catch (error) {
    console.error('Failed to remove .nvmrc file:', error);
    if (error.code === 'ENOENT') {
      return { success: false, message: '.nvmrc file not found' };
    }
    throw new Error(`Failed to remove .nvmrc file: ${error.message}`);
  }
});

ipcMain.handle('nvm-auto-switch', async (event, projectPath) => {
  try {
    const nvmrcInfo = await checkNvmrcFile(projectPath);
    
    if (nvmrcInfo.exists) {
      const currentVersion = await getCurrentActiveVersion();
      const requiredVersion = nvmrcInfo.version;
      
      if (currentVersion !== `v${requiredVersion}` && currentVersion !== requiredVersion) {
        // Check if required version is installed
        const installedVersions = await getInstalledNodeVersions();
        const isInstalled = installedVersions.some(v => 
          v.version === requiredVersion || `v${v.version}` === requiredVersion
        );
        
        if (isInstalled) {
          await switchNodeVersion(requiredVersion);
          return {
            switched: true,
            version: requiredVersion,
            message: `Switched to Node ${requiredVersion} as required by .nvmrc`
          };
        } else {
          return {
            switched: false,
            version: requiredVersion,
            message: `Node ${requiredVersion} is required but not installed`,
            needsInstall: true
          };
        }
      } else {
        return {
          switched: false,
          version: requiredVersion,
          message: `Already using required Node ${requiredVersion}`,
          alreadyActive: true
        };
      }
    } else {
      return {
        switched: false,
        message: 'No .nvmrc file found in project',
        noNvmrc: true
      };
    }
  } catch (error) {
    console.error('Failed to auto-switch Node version:', error);
    throw error;
  }
});