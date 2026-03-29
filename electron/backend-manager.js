const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');
const { app } = require('electron');

// Simple isDev check
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

class BackendManager {
  constructor() {
    this.process = null;
    this.port = 8000;
    this.host = '127.0.0.1';
    this.isExternalBackend = false;
    this.lastError = null;
  }

  /**
   * Check if a port is already in use
   */
  async isPortInUse(port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, this.host);
    });
  }

  /**
   * Find Python executable, throws if not found
   */
  getPythonCommand() {
    const candidates = process.platform === 'win32'
      ? ['python', 'python3', 'py']
      : ['python3', 'python'];

    for (const cmd of candidates) {
      try {
        const version = execSync(`${cmd} --version`, {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 5000,
        }).toString().trim();
        console.log(`Found ${cmd}: ${version}`);
        return cmd;
      } catch {
        // try next
      }
    }
    return null;
  }

  /**
   * Get the path to start_backend.py
   */
  getBackendPath() {
    if (isDev) {
      return path.join(__dirname, '..');
    } else {
      return process.resourcesPath;
    }
  }

  /**
   * Start the backend process
   */
  async start() {
    this.lastError = null;

    // Check if backend is already running
    const portInUse = await this.isPortInUse(this.port);

    if (portInUse) {
      console.log('Backend already running on port', this.port);
      this.isExternalBackend = true;
      return { status: 'connected', message: 'Connected to existing backend' };
    }

    // Check Python is installed
    const pythonCmd = this.getPythonCommand();
    if (!pythonCmd) {
      this.lastError = 'Python is not installed or not in PATH.\n\nInstall Python 3.10+ from python.org and make sure it is added to PATH.';
      return { status: 'error', message: this.lastError };
    }

    // Check that config.py exists
    const backendPath = this.getBackendPath();
    const fs = require('fs');
    const configPath = path.join(backendPath, 'config.py');
    if (!fs.existsSync(configPath)) {
      this.lastError = `config.py not found at:\n${configPath}\n\nCopy config.example.py to config.py and fill in your Porcupine access key.`;
      return { status: 'error', message: this.lastError };
    }

    const scriptPath = path.join(backendPath, 'start_backend.py');

    console.log('Starting backend from:', scriptPath);
    console.log('Python command:', pythonCmd);

    try {
      this.process = spawn(pythonCmd, [scriptPath], {
        cwd: backendPath,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          PYTHONIOENCODING: 'utf-8',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderrBuffer = '';

      this.process.stdout.on('data', (data) => {
        console.log('[Backend]', data.toString().trim());
      });

      this.process.stderr.on('data', (data) => {
        const text = data.toString().trim();
        console.error('[Backend Error]', text);
        stderrBuffer += text + '\n';
      });

      this.process.on('exit', (code, signal) => {
        console.log(`Backend process exited with code ${code}, signal ${signal}`);
        if (code !== 0 && code !== null) {
          // Parse common errors
          if (stderrBuffer.includes('ModuleNotFoundError') || stderrBuffer.includes('No module named')) {
            const match = stderrBuffer.match(/No module named '([^']+)'/);
            const mod = match ? match[1] : 'unknown';
            this.lastError = `Missing Python dependency: ${mod}\n\nRun: pip install -r requirements.txt`;
          } else if (stderrBuffer.includes('ImportError')) {
            this.lastError = `Import error in backend.\n\nRun: pip install -r requirements.txt\n\nDetails:\n${stderrBuffer.slice(-300)}`;
          } else {
            this.lastError = `Backend crashed (exit code ${code}).\n\n${stderrBuffer.slice(-500)}`;
          }
        }
        this.process = null;
      });

      this.process.on('error', (error) => {
        console.error('Failed to start backend:', error);
        this.lastError = `Failed to start Python: ${error.message}`;
        this.process = null;
      });

      // Wait for backend to be ready
      await this.waitForBackend(30000);

      return { status: 'started', message: 'Backend started successfully' };
    } catch (error) {
      console.error('Error starting backend:', error);
      // If process died during startup, use the captured error
      if (this.lastError) {
        return { status: 'error', message: this.lastError };
      }
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Wait for backend to be ready
   */
  async waitForBackend(timeout = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Check if process died
      if (this.process === null && this.lastError) {
        throw new Error(this.lastError);
      }
      const isReady = await this.isPortInUse(this.port);
      if (isReady) {
        console.log('Backend is ready!');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (this.lastError) {
      throw new Error(this.lastError);
    }
    throw new Error('Backend failed to start within 30 seconds.\n\nCheck that all Python dependencies are installed:\npip install -r requirements.txt');
  }

  /**
   * Stop the backend process
   */
  stop() {
    if (this.isExternalBackend) {
      console.log('Not stopping external backend');
      return { status: 'skipped', message: 'External backend not stopped' };
    }

    if (this.process) {
      console.log('Stopping backend process...');
      this.process.kill();
      this.process = null;
      return { status: 'stopped', message: 'Backend stopped' };
    }

    return { status: 'not_running', message: 'Backend was not running' };
  }

  /**
   * Check if backend is running
   */
  async isRunning() {
    return await this.isPortInUse(this.port);
  }

  /**
   * Get backend status
   */
  getStatus() {
    return {
      isRunning: this.process !== null || this.isExternalBackend,
      isExternal: this.isExternalBackend,
      port: this.port,
      host: this.host,
      url: `http://${this.host}:${this.port}`,
      lastError: this.lastError,
    };
  }
}

module.exports = BackendManager;
