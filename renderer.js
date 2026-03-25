const pickFolderButton = document.getElementById("pick-folder-button");
const appShellElement = document.querySelector(".app-shell");
const panelResizerElement = document.getElementById("panel-resizer");
const folderPathElement = document.getElementById("folder-path");
const folderListElement = document.getElementById("folder-list");
const fileCountElement = document.getElementById("file-count");
const fileListElement = document.getElementById("file-list");
const activeFileNameElement = document.getElementById("active-file-name");
const fileContentElement = document.getElementById("file-content");
const openNotepadButton = document.getElementById("open-notepad-button");
const openFolderButton = document.getElementById("open-folder-button");
const sqlKeywords = new Set([
  "add",
  "alter",
  "and",
  "as",
  "asc",
  "begin",
  "between",
  "by",
  "case",
  "commit",
  "create",
  "delete",
  "desc",
  "distinct",
  "drop",
  "else",
  "end",
  "exec",
  "execute",
  "exists",
  "from",
  "group",
  "having",
  "in",
  "insert",
  "into",
  "is",
  "join",
  "left",
  "like",
  "limit",
  "not",
  "null",
  "on",
  "or",
  "order",
  "outer",
  "primary",
  "procedure",
  "right",
  "rollback",
  "select",
  "set",
  "table",
  "then",
  "top",
  "truncate",
  "union",
  "unique",
  "update",
  "values",
  "view",
  "when",
  "where"
]);

let selectedFilePath = null;
let selectedFolderPath = null;
let isResizingPanels = false;
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short"
});

function setSidebarWidth(nextWidth) {
  const minWidth = 250;
  const maxWidth = Math.min(640, window.innerWidth - 360);
  const safeWidth = Math.max(minWidth, Math.min(nextWidth, maxWidth));
  document.documentElement.style.setProperty("--sidebar-width", `${safeWidth}px`);
}

function handlePointerMove(event) {
  if (!isResizingPanels) {
    return;
  }

  setSidebarWidth(event.clientX);
}

function stopResizingPanels() {
  if (!isResizingPanels) {
    return;
  }

  isResizingPanels = false;
  document.body.classList.remove("is-resizing");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function highlightSql(content) {
  const escaped = escapeHtml(content);
  const tokenPattern =
    /(--.*$|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|\b\d+(?:\.\d+)?\b|\b[a-z_][a-z0-9_]*\b)/gim;

  return escaped.replace(tokenPattern, (token) => {
    if (token.startsWith("--") || token.startsWith("/*")) {
      return `<span class="sql-comment">${token}</span>`;
    }

    if (token.startsWith("'")) {
      return `<span class="sql-string">${token}</span>`;
    }

    if (/^\d/.test(token)) {
      return `<span class="sql-number">${token}</span>`;
    }

    if (sqlKeywords.has(token.toLowerCase())) {
      return `<span class="sql-keyword">${token}</span>`;
    }

    return token;
  });
}

function renderCodeContent(content) {
  const codeElement = fileContentElement.querySelector("code");
  codeElement.innerHTML = highlightSql(content);
}

function updateToolButtons() {
  const hasFile = Boolean(selectedFilePath);
  openNotepadButton.disabled = !hasFile;
  openFolderButton.disabled = !hasFile;
}

function setEmptyFileState(message) {
  activeFileNameElement.textContent = "Bir dosya sec";
  renderCodeContent(message);
  updateToolButtons();
}

async function loadFolderFiles(folderPath) {
  selectedFolderPath = folderPath;
  selectedFilePath = null;
  folderPathElement.textContent = folderPath;
  fileCountElement.textContent = "Yukleniyor...";
  renderFileList([]);
  setEmptyFileState("Listeden bir SQL dosyasina tiklayarak icerigini goruntule.");

  const result = await window.sqlViewer.listFolderFiles(folderPath);
  fileCountElement.textContent = `${result.files.length} dosya`;
  renderFileList(result.files);
  updateToolButtons();
}

function renderFolderList(folders) {
  folderListElement.innerHTML = "";
  folderListElement.classList.remove("empty");

  if (folders.length === 0) {
    folderListElement.classList.add("empty");
    folderListElement.textContent = "Alt klasor bulunamadi.";
    return;
  }

  folders.forEach((folder) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "folder-item";
    button.textContent = folder.name;

    if (folder.path === selectedFolderPath) {
      button.classList.add("active");
    }

    button.addEventListener("click", async () => {
      document
        .querySelectorAll(".folder-item.active")
        .forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      try {
        await loadFolderFiles(folder.path);
      } catch (error) {
        fileCountElement.textContent = "0 dosya";
        renderFileList([]);
        setEmptyFileState("Bir hata olustu.");
        folderPathElement.textContent =
          "Klasor okunurken bir hata olustu: " + error.message;
      }
    });

    folderListElement.appendChild(button);
  });
}

function renderFileList(files) {
  fileListElement.innerHTML = "";
  fileListElement.classList.remove("empty");

  if (files.length === 0) {
    fileListElement.classList.add("empty");
    fileListElement.textContent = "Bu klasorde `.sql` dosyasi bulunamadi.";
    return;
  }

  files.forEach((file) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "file-item";
    button.innerHTML = `
      <span class="file-item-name">${file.name}</span>
      <span class="file-item-date">${dateFormatter.format(new Date(file.modifiedAt))}</span>
    `;
    button.addEventListener("click", async () => {
      selectedFilePath = file.path;
      document
        .querySelectorAll(".file-item.active")
        .forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      activeFileNameElement.textContent = file.name;
      updateToolButtons();
      renderCodeContent("Yukleniyor...");

      try {
        const result = await window.sqlViewer.readSqlFile(file.path);
        renderCodeContent(result.content || "");
      } catch (error) {
        renderCodeContent("Dosya okunurken bir hata olustu: " + error.message);
      }
    });

    if (file.path === selectedFilePath) {
      button.classList.add("active");
    }

    fileListElement.appendChild(button);
  });
}

pickFolderButton.addEventListener("click", async () => {
  try {
    const result = await window.sqlViewer.pickFolder();

    if (!result) {
      return;
    }

    selectedFolderPath = result.selectedFolderPath;
    folderPathElement.textContent = result.selectedFolderPath;
    renderFolderList(result.folders);
    fileCountElement.textContent = `${result.files.length} dosya`;
    renderFileList(result.files);
    setEmptyFileState("Listeden bir SQL dosyasina tiklayarak icerigini goruntule.");
  } catch (error) {
    folderPathElement.textContent = "Klasor okunamadi.";
    folderListElement.classList.add("empty");
    folderListElement.textContent =
      "Klasor secilirken bir hata olustu: " + error.message;
    fileCountElement.textContent = "0 dosya";
    fileListElement.classList.add("empty");
    fileListElement.textContent =
      "Klasor secilirken bir hata olustu: " + error.message;
    setEmptyFileState("Bir hata olustu.");
  }
});

openNotepadButton.addEventListener("click", async () => {
  if (!selectedFilePath) {
    return;
  }

  try {
    await window.sqlViewer.openInNotepad(selectedFilePath);
  } catch (error) {
    renderCodeContent("Notepad acilirken bir hata olustu: " + error.message);
  }
});

openFolderButton.addEventListener("click", async () => {
  if (!selectedFilePath) {
    return;
  }

  try {
    await window.sqlViewer.openContainingFolder(selectedFilePath);
  } catch (error) {
    renderCodeContent("Klasor acilirken bir hata olustu: " + error.message);
  }
});

panelResizerElement.addEventListener("pointerdown", (event) => {
  isResizingPanels = true;
  document.body.classList.add("is-resizing");
  panelResizerElement.setPointerCapture(event.pointerId);
});

panelResizerElement.addEventListener("pointermove", handlePointerMove);
panelResizerElement.addEventListener("pointerup", stopResizingPanels);
panelResizerElement.addEventListener("pointercancel", stopResizingPanels);
window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", stopResizingPanels);
window.addEventListener("resize", () => {
  const sidebarWidth = Number.parseInt(
    getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width"),
    10
  );

  if (!Number.isNaN(sidebarWidth)) {
    setSidebarWidth(sidebarWidth);
  }
});

updateToolButtons();
