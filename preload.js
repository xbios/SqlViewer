const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sqlViewer", {
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  readSqlFile: (filePath) => ipcRenderer.invoke("read-sql-file", filePath)
});
