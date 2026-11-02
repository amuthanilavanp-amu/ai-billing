import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null

const BACKEND_PORT = 8765
const BACKEND_HOST = '127.0.0.1'

// ─── Backend Management ────────────────────────────────────────────────────────

function getBackendPath(): string {
  if (isDev) {
    return path.join(__dirname, '..', 'backend')
  }
  return path.join(process.resourcesPath, 'backend')
}

function getPythonPath(): string {
  // Check local venv first (development or unpacked release)
  const candidateVenvs = [
    path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe'),
    path.join(__dirname, '..', '..', '..', 'venv', 'Scripts', 'python.exe'),
    path.join(process.resourcesPath, 'python', 'python.exe'),
    path.join(process.resourcesPath, '..', '..', 'venv', 'Scripts', 'python.exe'),
  ];

  for (const candidate of candidateVenvs) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return process.platform === 'win32' ? 'python' : 'python3';
}

function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendPath = getBackendPath()
    const pythonPath = getPythonPath()
    const mainPy = path.join(backendPath, 'main.py')

    if (!fs.existsSync(mainPy)) {
      console.error('Backend main.py not found at:', mainPy)
      // Still resolve - we'll show an error in UI
      resolve()
      return
    }

    console.log('Starting backend:', pythonPath, mainPy)

    backendProcess = spawn(pythonPath, [
      '-u', mainPy,
      '--host', BACKEND_HOST,
      '--port', String(BACKEND_PORT),
    ], {
      cwd: backendPath,
      env: {
        ...process.env,
        SMARTBIZ_DATA_DIR: app.getPath('userData'),
        PYTHONUNBUFFERED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let started = false

    const checkStarted = (line: string) => {
      const lower = line.toLowerCase();
      if (!started && (lower.includes('application startup complete') || lower.includes('uvicorn running') || lower.includes('started server'))) {
        started = true;
        resolve();
      }
    };

    backendProcess.stdout?.on('data', (data: Buffer) => {
      const line = data.toString();
      console.log('[Backend]', line.trim());
      checkStarted(line);
    });

    backendProcess.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      console.log('[Backend]', line.trim());
      checkStarted(line);
    });

    backendProcess.on('error', (err) => {
      console.error('Backend process error:', err);
      if (!started) reject(err);
    });

    backendProcess.on('exit', (code) => {
      console.log('Backend exited with code:', code);
      backendProcess = null;
    });

    // Timeout fallback after 6 seconds
    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 6000);
  })
}

function stopBackend(): void {
  if (backendProcess) {
    backendProcess.kill('SIGTERM')
    backendProcess = null
  }
}

// ─── Window Management ─────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SmartBiz AI',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
    titleBarStyle: 'default',
    show: false,
  })

  // Load the app
  const distHtml = path.join(__dirname, '..', 'dist', 'index.html')
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else if (fs.existsSync(distHtml)) {
    mainWindow.loadFile(distHtml)
  } else {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const image = await mainWindow?.webContents.capturePage()
        if (image) {
          const previewDir = path.join(__dirname, '..', 'public')
          if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true })
          const previewPath = path.join(previewDir, 'preview.png')
          fs.writeFileSync(previewPath, image.toPNG())
          console.log('[Electron] Preview screenshot saved:', previewPath)

          const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\58d42da3-1cd9-45a7-85d3-efc75c886549'
          if (fs.existsSync(artifactDir)) {
            fs.writeFileSync(path.join(artifactDir, 'preview.png'), image.toPNG())
          }
        }
      } catch (err) {
        console.error('[Electron] capturePage error:', err)
      }
    }, 1500)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── IPC Handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('app:get-version', () => app.getVersion())
ipcMain.handle('app:get-backend-url', () => `http://${BACKEND_HOST}:${BACKEND_PORT}`)
ipcMain.handle('app:get-user-data-path', () => app.getPath('userData'))

ipcMain.handle('dialog:open-file', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  return result
})

ipcMain.handle('dialog:save-file', async (_event, options) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: options?.filters || [
      { name: 'Excel', extensions: ['xlsx'] },
      { name: 'CSV', extensions: ['csv'] },
    ],
    defaultPath: options?.defaultPath,
  })
  return result
})

ipcMain.handle('shell:open-external', (_event, url: string) => {
  // Only allow safe URLs
  if (url.startsWith('http://localhost') || url.startsWith('https://')) {
    shell.openExternal(url)
  }
})

ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
  try {
    const buffer = fs.readFileSync(filePath)
    return { success: true, data: Array.from(buffer) }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('fs:write-file', async (_event, filePath: string, data: number[]) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(data))
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// ─── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    await startBackend()
  } catch (err) {
    console.error('Failed to start backend:', err)
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopBackend()
})

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
      event.preventDefault()
    }
  })
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
})
