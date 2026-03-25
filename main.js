const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const settingsFilePath = () => path.join(app.getPath("userData"), "settings.ini");

async function findSsmsExecutable() {
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 =
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const candidates = [
    path.join(programFilesX86, "Microsoft SQL Server Management Studio 20", "Common7", "IDE", "Ssms.exe"),
    path.join(programFiles, "Microsoft SQL Server Management Studio 20", "Common7", "IDE", "Ssms.exe"),
    path.join(programFilesX86, "Microsoft SQL Server Management Studio 19", "Common7", "IDE", "Ssms.exe"),
    path.join(programFiles, "Microsoft SQL Server Management Studio 19", "Common7", "IDE", "Ssms.exe"),
    path.join(programFilesX86, "Microsoft SQL Server Management Studio 18", "Common7", "IDE", "Ssms.exe"),
    path.join(programFiles, "Microsoft SQL Server Management Studio 18", "Common7", "IDE", "Ssms.exe"),
    "ssms.exe"
  ];

  for (const candidate of candidates) {
    if (candidate.toLowerCase() === "ssms.exe") {
      return candidate;
    }

    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next common SSMS install location.
    }
  }

  throw new Error("SSMS bulunamadi. SQL Server Management Studio kurulu olmayabilir.");
}

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

async function getNextAvailableSqlPath(filePath) {
  const parsedPath = path.parse(filePath);
  let index = 1;

  while (true) {
    const candidatePath = path.join(
      parsedPath.dir,
      `${parsedPath.name} (${index})${parsedPath.ext}`
    );

    try {
      await fs.access(candidatePath);
      index += 1;
    } catch {
      return candidatePath;
    }
  }
}

function parseIni(content) {
  const result = {};

  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(";") && !line.startsWith("#"))
    .forEach((line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      result[key] = value;
    });

  return result;
}

async function readSettings() {
  try {
    const content = await fs.readFile(settingsFilePath(), "utf8");
    return parseIni(content);
  } catch {
    return {};
  }
}

async function writeSettings(settings) {
  const content = Object.entries(settings)
    .map(([key, value]) => `${key}=${value ?? ""}`)
    .join("\n");
  await fs.writeFile(settingsFilePath(), content, "utf8");
}

async function buildFolderPayload(rootPath, selectedFolderPath = rootPath) {
  const files = await getSqlFiles(selectedFolderPath);
  const folders = [
    { name: path.basename(rootPath) || rootPath, path: rootPath },
    ...(await getFolders(rootPath))
  ];

  return {
    rootPath,
    selectedFolderPath,
    folders,
    files
  };
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
  await writeSettings({
    rootPath: folderPath,
    selectedFolderPath: folderPath
  });

  return buildFolderPayload(folderPath, folderPath);
});

ipcMain.handle("list-folder-files", async (_event, folderPath) => {
  const files = await getSqlFiles(folderPath);
  return {
    folderPath,
    files
  };
});

ipcMain.handle("list-folders", async (_event, rootPath) => {
  const folders = [
    { name: path.basename(rootPath) || rootPath, path: rootPath },
    ...(await getFolders(rootPath))
  ];

  return {
    rootPath,
    folders
  };
});

ipcMain.handle("save-selected-folder", async (_event, rootPath, selectedFolderPath) => {
  await writeSettings({
    rootPath,
    selectedFolderPath
  });

  return { ok: true };
});

ipcMain.handle("load-last-session", async () => {
  const settings = await readSettings();
  const rootPath = settings.rootPath;
  const selectedFolderPath = settings.selectedFolderPath || rootPath;

  if (!rootPath) {
    return null;
  }

  try {
    await fs.access(rootPath);
    await fs.access(selectedFolderPath);
    return await buildFolderPayload(rootPath, selectedFolderPath);
  } catch {
    return null;
  }
});

ipcMain.handle("read-sql-file", async (_event, filePath) => {
  const content = await fs.readFile(filePath, "utf8");
  return {
    filePath,
    content
  };
});

ipcMain.handle("save-sql-file", async (_event, filePath, content) => {
  const nextFilePath = await getNextAvailableSqlPath(filePath);
  await fs.writeFile(nextFilePath, content, "utf8");
  const stats = await fs.stat(nextFilePath);

  return {
    filePath: nextFilePath,
    fileName: path.basename(nextFilePath),
    modifiedAt: stats.mtime.toISOString()
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

ipcMain.handle("open-in-ssms", async (_event, filePath) => {
  await fs.access(filePath);
  const ssmsPath = await findSsmsExecutable();

  return await new Promise((resolve, reject) => {
    const process = spawn(ssmsPath, [filePath], {
      detached: true,
      stdio: "ignore"
    });

    process.on("error", (error) => {
      reject(
        new Error(
          `SSMS acilamadi. ${error.message || "Program baslatilamadi."}`
        )
      );
    });

    process.unref();
    resolve({ ok: true });
  });
});
