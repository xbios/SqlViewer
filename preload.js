const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sqlViewer", {
  loadLastSession: () => ipcRenderer.invoke("load-last-session"),
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  listFolders: (rootPath) => ipcRenderer.invoke("list-folders", rootPath),
  listFolderFiles: (folderPath) => ipcRenderer.invoke("list-folder-files", folderPath),
  saveSelectedFolder: (rootPath, selectedFolderPath) =>
    ipcRenderer.invoke("save-selected-folder", rootPath, selectedFolderPath),
  readSqlFile: (filePath) => ipcRenderer.invoke("read-sql-file", filePath),
  saveSqlFile: (filePath, content) => ipcRenderer.invoke("save-sql-file", filePath, content),
  openInNotepad: (filePath) => ipcRenderer.invoke("open-in-notepad", filePath),
  openInSsms: (filePath) => ipcRenderer.invoke("open-in-ssms", filePath),
  openContainingFolder: (filePath) =>
    ipcRenderer.invoke("open-containing-folder", filePath)
});
