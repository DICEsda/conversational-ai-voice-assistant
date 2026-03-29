const { spawn } = require('child_process');
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
        resolve(true); // Port is in use
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
   * Find Python executable
   */
  getPythonCommand() {
    // Try common Python commands
    return process.platform === 'win32' ? 'python' : 'python3';
  }

  /**
   * Get the path to start_backend.py
   */
  getBackendPath() {
    if (isDev) {
      // In development, use the project root
      return path.join(__dirname, '..');
    } else {
      // In production, extraResources are unpacked next to app.asar
      return process.resourcesPath;
    }
  }

  /**
   * Start the backend process
   */
  async start() {
    // Check if backend is already running
    const portInUse = await this.isPortInUse(this.port);
    
    if (portInUse) {
      console.log('Backend already running on port', this.port);
      this.isExternalBackend = true;
      return { status: 'connected', message: 'Connected to existing backend' };
    }

    // Start new backend process
    const backendPath = this.getBackendPath();
    const scriptPath = path.join(backendPath, 'start_backend.py');
    const pythonCmd = this.getPythonCommand();

    console.log('Starting backend from:', scriptPath);
    console.log('Python command:', pythonCmd);

    try {
      this.process = spawn(pythonCmd, [scriptPath], {
        cwd: backendPath,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1', // Ensure real-time output
          PYTHONIOENCODING: 'utf-8', // Fix emoji encoding issue
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Handle stdout
      this.process.stdout.on('data', (data) => {
        console.log('[Backend]', data.toString().trim());
      });

      // Handle stderr
      this.process.stderr.on('data', (data) => {
        console.error('[Backend Error]', data.toString().trim());
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        console.log(`Backend process exited with code ${code}, signal ${signal}`);
        this.process = null;
      });

      // Handle process errors
      this.process.on('error', (error) => {
        console.error('Failed to start backend:', error);
        this.process = null;
      });

      // Wait for backend to be ready
      await this.waitForBackend(30000); // 30 second timeout

      return { status: 'started', message: 'Backend started successfully' };
    } catch (error) {
      console.error('Error starting backend:', error);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Wait for backend to be ready
   */
  async waitForBackend(timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const isReady = await this.isPortInUse(this.port);
      if (isReady) {
        console.log('Backend is ready!');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('Backend failed to start within timeout');
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
    };
  }
}

module.exports = BackendManager;
