const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { Client } = require('ssh2');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 920,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Ensure nodeIntegration is disabled
      contextIsolation: true // Enable contextIsolation
    }
  });

  mainWindow.loadURL('http://localhost:8080'); // Assuming your Vue app runs on this port
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
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

ipcMain.handle('show-message-box', async (event, options) => {
  return dialog.showMessageBox(options);
});

ipcMain.handle('get-file-list', async (event, dirPath) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
});

ipcMain.handle('run-npm-command', async (event, command) => {
  return new Promise((resolve, reject) => {
    exec(`npm ${command}`, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
});

ipcMain.handle('push-to-remote', async (event, config) => {
  const { host, port, username, password, localPath, remotePath } = config;
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }
        sftp.fastPut(localPath, remotePath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve('File uploaded successfully');
          }
          conn.end();
        });
      });
    }).connect({
      host,
      port,
      username,
      password
    });
  });
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
  return new Promise((resolve, reject) => {
    const nvmPath = path.join(process.env.HOME, '.nvm/nvm.sh');
    const command = `. ${nvmPath} && nvm use default && node -v && npm -v`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        const [nodeComment, nodeVersion, npmVersion] = stdout.split('\n').filter(Boolean);
        resolve({ nodeVersion, npmVersion, nodeComment });
      }
    });
  });
});

ipcMain.handle('check-nvm-node', async () => {
  return new Promise((resolve, reject) => {
    exec('command -v nvm', (error, stdout, stderr) => {
      if (error) {
        // nvm is not installed, install it
        const installNvmCommand = `
          curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash && \
          export NVM_DIR="$HOME/.nvm" && \
          [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
          nvm install node
        `;
        exec(installNvmCommand, (installError, installStdout, installStderr) => {
          if (installError) {
            reject(installStderr);
          } else {
            resolve('nvm and node installed successfully');
          }
        });
      } else {
        // nvm is installed, check node
        exec('nvm use default && node -v', (nodeError, nodeStdout, nodeStderr) => {
          if (nodeError) {
            reject(nodeStderr);
          } else {
            resolve(`nvm and node are already installed: ${nodeStdout}`);
          }
        });
      }
    });
  });
});

ipcMain.handle('build-and-upload', async (event, config) => {
  const { host, port, username, password, localPath, remotePath } = config;
  return new Promise((resolve, reject) => {
    exec('npm run build', (buildError, buildStdout, buildStderr) => {
      if (buildError) {
        reject(buildStderr);
        return;
      }
      const conn = new Client();
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }
          sftp.fastPut(localPath, remotePath, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve('Build and upload successful');
            }
            conn.end();
          });
        });
      }).connect({
        host,
        port,
        username,
        password
      });
    });
  });
});