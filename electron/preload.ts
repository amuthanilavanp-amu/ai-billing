import { contextBridge, ipcRenderer } from 'electron'

// Expose a safe, typed API to the renderer process
const api = {
  // App info
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  getBackendUrl: (): Promise<string> => ipcRenderer.invoke('app:get-backend-url'),
  getUserDataPath: (): Promise<string> => ipcRenderer.invoke('app:get-user-data-path'),

  // Dialogs
  openFileDialog: (options?: {
    filters?: { name: string; extensions: string[] }[]
  }): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:open-file', options),

  saveFileDialog: (options?: {
    filters?: { name: string; extensions: string[] }[]
    defaultPath?: string
  }): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke('dialog:save-file', options),

  // Shell
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('shell:open-external', url),

  // Filesystem (restricted)
  readFile: (filePath: string): Promise<{ success: boolean; data?: number[]; error?: string }> =>
    ipcRenderer.invoke('fs:read-file', filePath),

  writeFile: (filePath: string, data: number[]): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('fs:write-file', filePath, data),
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
