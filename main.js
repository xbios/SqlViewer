const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs/promises");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f3efe6",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("pick-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const folderPath = result.filePaths[0];
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const sqlEntries = entries.filter(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql")
  );
  const files = await Promise.all(
    sqlEntries.map(async (entry) => {
      const filePath = path.join(folderPath, entry.name);
      const stats = await fs.stat(filePath);

      return {
        name: entry.name,
        path: filePath,
        modifiedAt: stats.mtime.toISOString()
      };
    })
  );

  files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

  return {
    folderPath,
    files
  };
});

ipcMain.handle("read-sql-file", async (_event, filePath) => {
  const content = await fs.readFile(filePath, "utf8");
  return {
    filePath,
    content
  };
});
