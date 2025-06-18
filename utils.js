const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Enhanced exec function that ensures proper shell environment
function execWithEnv(command, options = {}, callback) {
  // If callback is the second parameter, adjust arguments
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  // Create enhanced environment
  const enhancedEnv = {
    ...process.env,
    // Ensure NVM environment variables are available
    NVM_DIR: process.env.NVM_DIR || `${process.env.HOME}/.nvm`,
    PATH: process.env.PATH,
    SHELL: process.env.SHELL || '/bin/zsh'
  };

  // Enhanced options with proper environment
  const enhancedOptions = {
    ...options,
    env: enhancedEnv,
    // For NVM commands, we need to ensure the shell loads NVM functions
    shell: options.shell || (process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh')
  };

  // For Unix systems, ensure NVM is properly loaded by wrapping the command
  if (process.platform !== 'win32' && command.includes('nvm')) {
    const nvmSetup = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`;
    command = `${nvmSetup} && ${command}`;
  }

  return exec(command, enhancedOptions, callback);
}

// Function to update the current Electron process environment with new Node version
async function updateElectronEnvironment(version) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' 
      ? `set NVM_HOME=%USERPROFILE%\\AppData\\Roaming\\nvm && %NVM_HOME%\\nvm.exe which ${version}`
      : `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm which ${version}`;
    
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
    
    exec(command, { shell }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        const nodePath = stdout.trim();
        const nodeDir = path.dirname(nodePath);
        const versionPath = path.dirname(nodeDir); // This gives us the version directory
        
        // Update the current process environment
        process.env.NVM_BIN = nodeDir;
        process.env.NVM_INC = path.join(versionPath, 'include', 'node');
        
        // Update PATH to point to the new Node version
        const currentPath = process.env.PATH;
        const pathSegments = currentPath.split(path.delimiter);
        
        // Remove existing NVM paths from PATH
        const filteredPaths = pathSegments.filter(segment => 
          !segment.includes('.nvm/versions/node/') || segment === nodeDir
        );
        
        // Add the new Node version path at the beginning
        if (!filteredPaths.includes(nodeDir)) {
          filteredPaths.unshift(nodeDir);
        }
        
        process.env.PATH = filteredPaths.join(path.delimiter);
        
        resolve({
          nodePath,
          nodeDir,
          versionPath,
          updatedPath: process.env.PATH
        });
      }
    });
  });
}

async function checkAndInstallNvmMAC() {
  return new Promise((resolve, reject) => {
    execWithEnv('command -v nvm', (error) => {
      if (error) {
        // Install nvm
        const installCommand = `
          curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          nvm install node
        `;
        execWithEnv(installCommand, { shell: '/bin/bash' }, (installError, installStdout, installStderr) => {
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
      execWithEnv('where nvm', (error) => {
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
          execWithEnv(installCommand, { shell: 'cmd.exe' }, (installError, installStdout, installStderr) => {
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
  
      execWithEnv(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
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
  
      execWithEnv(command, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
        if (error) {
          reject(stderr);
        } else {
          const versions = stdout.split('\n').filter(Boolean);
          resolve({ nodeVersion: versions[0], npmVersion: versions[1] });
        }
      });
    });
  }

// Get available Node versions from NVM
async function getAvailableNodeVersions() {
    return new Promise((resolve, reject) => {
        const command = process.platform === 'win32' 
            ? `set NVM_HOME=%USERPROFILE%\\AppData\\Roaming\\nvm && %NVM_HOME%\\nvm.exe list available`
            : `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm list-remote --lts`;
        
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
        
        execWithEnv(command, { shell }, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                const versions = parseVersionOutput(stdout, 'available');
                resolve(versions);
            }
        });
    });
}

// Get installed Node versions
async function getInstalledNodeVersions() {
    return new Promise((resolve, reject) => {
        const command = process.platform === 'win32' 
            ? `set NVM_HOME=%USERPROFILE%\\AppData\\Roaming\\nvm && %NVM_HOME%\\nvm.exe list`
            : `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm list`;
        
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
        
        execWithEnv(command, { shell }, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                const versions = parseVersionOutput(stdout, 'installed');
                resolve(versions);
            }
        });
    });
}

// Install a specific Node version
async function installNodeVersion(version) {
    return new Promise((resolve, reject) => {
        const command = process.platform === 'win32' 
            ? `set NVM_HOME=%USERPROFILE%\\AppData\\Roaming\\nvm && %NVM_HOME%\\nvm.exe install ${version}`
            : `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm install ${version}`;
        
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
        
        const childProcess = execWithEnv(command, { shell });
        
        let output = '';
        childProcess.stdout.on('data', (data) => {
            output += data;
        });
        
        childProcess.stderr.on('data', (data) => {
            output += data;
        });
        
        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve(`Node ${version} installed successfully`);
            } else {
                reject(`Failed to install Node ${version}: ${output}`);
            }
        });
        
        // Return process for progress tracking
        childProcess.version = version;
        return childProcess;
    });
}

// Switch to a specific Node version
async function switchNodeVersion(version) {
    return new Promise(async (resolve, reject) => {
        const command = process.platform === 'win32' 
            ? `set NVM_HOME=%USERPROFILE%\\AppData\\Roaming\\nvm && %NVM_HOME%\\nvm.exe use ${version}`
            : `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use ${version}`;
        
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
        
        execWithEnv(command, { shell }, async (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                try {
                    // Update the Electron process environment to use the new Node version
                    await updateElectronEnvironment(version);
                    resolve(`Switched to Node ${version}`);
                } catch (envError) {
                    // Command succeeded but environment update failed
                    console.warn('Node version switched but environment update failed:', envError);
                    resolve(`Switched to Node ${version} (restart recommended)`);
                }
            }
        });
    });
}

// Set default Node version
async function setDefaultNodeVersion(version) {
    return new Promise(async (resolve, reject) => {
        const command = process.platform === 'win32' 
            ? `set NVM_HOME=%USERPROFILE%\\AppData\\Roaming\\nvm && %NVM_HOME%\\nvm.exe use ${version} && %NVM_HOME%\\nvm.exe alias default ${version}`
            : `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use ${version} && nvm alias default ${version}`;
        
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
        
        execWithEnv(command, { shell }, async (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                try {
                    // Update the Electron process environment to use the new Node version
                    await updateElectronEnvironment(version);
                    resolve(`Set Node ${version} as default`);
                } catch (envError) {
                    // Command succeeded but environment update failed
                    console.warn('Node version set as default but environment update failed:', envError);
                    resolve(`Set Node ${version} as default (restart recommended)`);
                }
            }
        });
    });
}

// Uninstall a Node version
async function uninstallNodeVersion(version) {
    return new Promise((resolve, reject) => {
        const command = process.platform === 'win32' 
            ? `set NVM_HOME=%USERPROFILE%\\AppData\\Roaming\\nvm && %NVM_HOME%\\nvm.exe uninstall ${version}`
            : `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm uninstall ${version}`;
        
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
        
        execWithEnv(command, { shell }, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                resolve(`Uninstalled Node ${version}`);
            }
        });
    });
}

// Get current active Node version
async function getCurrentActiveVersion() {
    return new Promise((resolve, reject) => {
        const command = process.platform === 'win32' 
            ? `set NVM_HOME=%USERPROFILE%\\AppData\\Roaming\\nvm && %NVM_HOME%\\nvm.exe current`
            : `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm current`;
        
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
        
        execWithEnv(command, { shell }, (error, stdout, stderr) => {
            if (error) {
                // Fallback to checking node version directly
                execWithEnv('node -v', (nodeError, nodeStdout, nodeStderr) => {
                    if (nodeError) {
                        reject('No Node version active');
                    } else {
                        resolve(nodeStdout.trim());
                    }
                });
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// Check for .nvmrc file in project
async function checkNvmrcFile(projectPath) {
    try {
        const nvmrcPath = path.join(projectPath, '.nvmrc');
        const exists = await fs.promises.access(nvmrcPath).then(() => true).catch(() => false);
        
        if (exists) {
            const content = await fs.promises.readFile(nvmrcPath, 'utf-8');
            return {
                exists: true,
                version: content.trim(),
                path: nvmrcPath
            };
        } else {
            return { exists: false };
        }
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

// Create .nvmrc file for project
async function createNvmrcFile(projectPath, version) {
    try {
        const nvmrcPath = path.join(projectPath, '.nvmrc');
        await fs.promises.writeFile(nvmrcPath, version);
        return {
            success: true,
            path: nvmrcPath,
            version: version
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Helper function to parse version output
function parseVersionOutput(output, type) {
    const lines = output.split('\n').filter(line => line.trim());
    const versions = {};
    if (type === 'available') {
        // Parse available versions (different format for Windows/Mac)
        lines.forEach(line => {
            const match = line.match(/v?(\d+\.\d+\.\d+)/);
            const versionName = match ? match[1] : '';
            if (match && !versions[versionName]) {
                versions[versionName] = {
                    version: match[1],
                    lts: line.includes('LTS') || line.includes('lts'),
                    current: false
                };
            }
        });
    } else if (type === 'installed') {
        // Parse installed versions
        lines.forEach(line => {
            const match = line.match(/v?(\d+\.\d+\.\d+)/);
            const versionName = match ? match[1] : '';
            if (match && (!versions[versionName] && !line.includes('lts')) || (line.includes('default') && !line.includes('(default)'))) {
                versions[versionName] = {
                    version: versionName,
                    current: line.includes('->     '),
                    default: line.includes('default') && !line.includes('(default)')
                };
            }
        });
    }
    
    return Object.values(versions);
}

module.exports = {
    checkAndInstallNvmMAC,
    checkAndInstallNvmWIN,
    getVersionsMAC,
    getVersionsWIN,
    getAvailableNodeVersions,
    getInstalledNodeVersions,
    installNodeVersion,
    switchNodeVersion,
    setDefaultNodeVersion,
    uninstallNodeVersion,
    getCurrentActiveVersion,
    checkNvmrcFile,
    createNvmrcFile,
};
