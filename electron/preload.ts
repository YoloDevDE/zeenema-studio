import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('zeenema', {
  // Legacy persistence (auto-save)
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data: unknown) => ipcRenderer.invoke('save-data', data),
  // Project file operations
  newProject: () => ipcRenderer.invoke('project-new'),
  openProject: () => ipcRenderer.invoke('project-open'),
  saveProject: (data: unknown) => ipcRenderer.invoke('project-save', data),
  saveProjectAs: (data: unknown) => ipcRenderer.invoke('project-save-as', data),
  chooseDirectory: () => ipcRenderer.invoke('choose-directory'),
  getDefaultProjectsDir: () => ipcRenderer.invoke('get-default-projects-dir'),
  saveProjectToDir: (data: unknown, dirPath: string, fileName: string) => ipcRenderer.invoke('project-save-to-dir', data, dirPath, fileName),
})
