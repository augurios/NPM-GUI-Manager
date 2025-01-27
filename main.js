const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { Client } = require('ssh2');
const ftp = require('basic-ftp');

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

ipcMain.handle('run-npm-script', async (event, { projectPath, scriptName }) => {
  const command = `npm --prefix ${projectPath} run ${scriptName}`;
  const childProcess = exec(command);

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