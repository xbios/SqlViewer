const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sqlViewer", {
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  listFolders: (rootPath) => ipcRenderer.invoke("list-folders", rootPath),
  listFolderFiles: (folderPath) => ipcRenderer.invoke("list-folder-files", folderPath),
  readSqlFile: (filePath) => ipcRenderer.invoke("read-sql-file", filePath),
  saveSqlFile: (filePath, content) => ipcRenderer.invoke("save-sql-file", filePath, content),
  openInNotepad: (filePath) => ipcRenderer.invoke("open-in-notepad", filePath),
  openInSsms: (filePath) => ipcRenderer.invoke("open-in-ssms", filePath),
  openContainingFolder: (filePath) =>
    ipcRenderer.invoke("open-containing-folder", filePath)
});
