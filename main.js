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