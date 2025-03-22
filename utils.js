const { exec } = require('child_process');

async function checkAndInstallNvmMAC() {
  return new Promise((resolve, reject) => {
    exec('command -v nvm', (error) => {
      if (error) {
        // Install nvm
        const installCommand = `
          curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          nvm install node
        `;
        exec(installCommand, { shell: '/bin/bash' }, (installError, installStdout, installStderr) => {
          if (installError) {
            reject(installStderr);
          } else {
            resolve('nvm and node installed successfully');
          }
        });
      } else {
        resolve('nvm is already installed');
      }
    });
  });
}

async function checkAndInstallNvmWIN() {
    return new Promise((resolve, reject) => {
      exec('where nvm', (error) => {
        if (error) {
          // Download and install nvm for Windows
          const installCommand = `
            powershell Invoke-WebRequest -Uri "https://github.com/coreybutler/nvm-windows/releases/latest/download/nvm-setup.exe" -OutFile "$env:TEMP\\nvm-setup.exe"
            start /wait "$env:TEMP\\nvm-setup.exe" /S
            setx NVM_HOME "%USERPROFILE%\\AppData\\Roaming\\nvm"
            setx NVM_SYMLINK "%ProgramFiles%\\nodejs"
            refreshenv
            nvm install latest
            nvm use latest
          `;
          exec(installCommand, { shell: 'cmd.exe' }, (installError, installStdout, installStderr) => {
            if (installError) {
              reject(installStderr);
            } else {
              resolve('nvm and node installed successfully');
            }
          });
        } else {
          resolve('nvm is already installed');
        }
      });
    });
}

async function getVersionsMAC() {
    return new Promise((resolve, reject) => {
      const nvmPath = path.join(process.env.HOME, '.nvm/nvm.sh');
  
      // Ensure the shell properly loads nvm
      const command = `
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
        nvm use default
        node -v && npm -v
      `;
  
      exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
        if (error) {
          reject(stderr);
        } else {
          const versions = stdout.split('\n').filter(Boolean);
          resolve({ nodeVersion: versions[0], npmVersion: versions[1] });
        }
      });
    });
}

async function getVersionsWIN() {
    return new Promise((resolve, reject) => {
      const command = `
        set NVM_HOME=%USERPROFILE%\\AppData\\Roaming\\nvm
        set NVM_SYMLINK=%ProgramFiles%\\nodejs
        %NVM_HOME%\\nvm.exe use default
        node -v && npm -v
      `;
  
      exec(command, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
        if (error) {
          reject(stderr);
        } else {
          const versions = stdout.split('\n').filter(Boolean);
          resolve({ nodeVersion: versions[0], npmVersion: versions[1] });
        }
      });
    });
  }

module.exports = {
    checkAndInstallNvmMAC,
    checkAndInstallNvmWIN,
    getVersionsMAC,
    getVersionsWIN,
};
