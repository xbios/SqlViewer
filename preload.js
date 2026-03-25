const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sqlViewer", {
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  listFolderFiles: (folderPath) => ipcRenderer.invoke("list-folder-files", folderPath),
  readSqlFile: (filePath) => ipcRenderer.invoke("read-sql-file", filePath)
});
