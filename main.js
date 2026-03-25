const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

async function getSqlFiles(folderPath) {
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
  return files;
}

async function getFolders(rootPath, currentPath = rootPath) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const folders = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const folderPath = path.join(currentPath, entry.name);
    folders.push({
      name: path.relative(rootPath, folderPath) || path.basename(folderPath),
      path: folderPath
    });

    const childFolders = await getFolders(rootPath, folderPath);
    folders.push(...childFolders);
  }

  folders.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return folders;
}

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
  const files = await getSqlFiles(folderPath);
  const folders = [
    { name: path.basename(folderPath) || folderPath, path: folderPath },
    ...(await getFolders(folderPath))
  ];

  return {
    rootPath: folderPath,
    selectedFolderPath: folderPath,
    folders,
    files
  };
});

ipcMain.handle("list-folder-files", async (_event, folderPath) => {
  const files = await getSqlFiles(folderPath);
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

ipcMain.handle("open-in-notepad", async (_event, filePath) => {
  await fs.access(filePath);

  return await new Promise((resolve, reject) => {
    const process = spawn("notepad.exe", [filePath], {
      detached: true,
      stdio: "ignore"
    });

    process.on("error", reject);
    process.unref();
    resolve({ ok: true });
  });
});

ipcMain.handle("open-containing-folder", async (_event, filePath) => {
  await fs.access(filePath);
  shell.showItemInFolder(filePath);
  return { ok: true };
});
