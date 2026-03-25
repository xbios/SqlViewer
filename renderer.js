const pickFolderButton = document.getElementById("pick-folder-button");
const appShellElement = document.querySelector(".app-shell");
const panelResizerElement = document.getElementById("panel-resizer");
const folderPathElement = document.getElementById("folder-path");
const folderListElement = document.getElementById("folder-list");
const fileCountElement = document.getElementById("file-count");
const fileListElement = document.getElementById("file-list");
const activeFileNameElement = document.getElementById("active-file-name");
const fileContentElement = document.getElementById("file-content");
const toggleCollapseButton = document.getElementById("toggle-collapse-button");
const openNotepadButton = document.getElementById("open-notepad-button");
const openSsmsButton = document.getElementById("open-ssms-button");
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
let originalSqlContent = "";
let isCollapsedView = false;
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short"
});
const sqlBlockPatterns = [
  { pattern: /\bWITH\b/gi, replacement: "\nWITH " },
  { pattern: /\bSELECT\b/gi, replacement: "\nSELECT " },
  { pattern: /\bFROM\b/gi, replacement: "\nFROM " },
  { pattern: /\bINNER\s+JOIN\b/gi, replacement: "\nINNER JOIN " },
  { pattern: /\bLEFT\s+JOIN\b/gi, replacement: "\nLEFT JOIN " },
  { pattern: /\bRIGHT\s+JOIN\b/gi, replacement: "\nRIGHT JOIN " },
  { pattern: /\bFULL\s+OUTER\s+JOIN\b/gi, replacement: "\nFULL OUTER JOIN " },
  { pattern: /\bFULL\s+JOIN\b/gi, replacement: "\nFULL JOIN " },
  { pattern: /\bCROSS\s+JOIN\b/gi, replacement: "\nCROSS JOIN " },
  { pattern: /\bJOIN\b/gi, replacement: "\nJOIN " },
  { pattern: /\bWHERE\b/gi, replacement: "\nWHERE " },
  { pattern: /\bGROUP\s+BY\b/gi, replacement: "\nGROUP BY " },
  { pattern: /\bORDER\s+BY\b/gi, replacement: "\nORDER BY " },
  { pattern: /\bHAVING\b/gi, replacement: "\nHAVING " },
  { pattern: /\bVALUES\b/gi, replacement: "\nVALUES " },
  { pattern: /\bSET\b/gi, replacement: "\nSET " },
  { pattern: /\bUNION\s+ALL\b/gi, replacement: "\nUNION ALL " },
  { pattern: /\bUNION\b/gi, replacement: "\nUNION " },
  { pattern: /\bON\b/gi, replacement: "\n  ON " },
  { pattern: /\bAND\b/gi, replacement: "\n    AND " },
  { pattern: /\bOR\b/gi, replacement: "\n    OR " }
];

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

function setToolButtonState(button, isActive) {
  button.classList.toggle("active", isActive);
}

function updateToolButtons() {
  const hasFile = Boolean(selectedFilePath);
  toggleCollapseButton.disabled = !hasFile;
  openNotepadButton.disabled = !hasFile;
  openSsmsButton.disabled = !hasFile;
  openFolderButton.disabled = !hasFile;
  setToolButtonState(toggleCollapseButton, hasFile && isCollapsedView);
  toggleCollapseButton.title = isCollapsedView
    ? "Normal gorunume don"
    : "Collapsed format";
  toggleCollapseButton.setAttribute(
    "aria-label",
    isCollapsedView ? "Normal gorunume don" : "Collapsed format"
  );
}

function setEmptyFileState(message) {
  originalSqlContent = "";
  isCollapsedView = false;
  activeFileNameElement.textContent = "Bir dosya sec";
  renderCodeContent(message);
  updateToolButtons();
}

function maskProtectedSegments(content) {
  const tokens = [];
  const masked = content.replace(
    /(--.*$|\/\*[\s\S]*?\*\/|'(?:''|[^'])*')/gm,
    (match) => {
      const token = `__SQL_TOKEN_${tokens.length}__`;
      tokens.push(match);
      return token;
    }
  );

  return { masked, tokens };
}

function unmaskProtectedSegments(content, tokens) {
  return tokens.reduce(
    (currentContent, token, index) =>
      currentContent.replaceAll(`__SQL_TOKEN_${index}__`, token),
    content
  );
}

function collapseSqlContent(content) {
  const { masked, tokens } = maskProtectedSegments(content);
  let collapsed = masked.replace(/\r\n/g, "\n");

  collapsed = collapsed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

  sqlBlockPatterns.forEach(({ pattern, replacement }) => {
    collapsed = collapsed.replace(pattern, replacement);
  });

  collapsed = collapsed
    .replace(/\n{2,}/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const normalized = line.trimStart();

      if (/^(ON|AND|OR)\b/i.test(normalized)) {
        return `  ${normalized}`;
      }

      return normalized;
    })
    .join("\n")
    .trim();

  return unmaskProtectedSegments(collapsed, tokens);
}

function renderSelectedSqlContent() {
  if (!originalSqlContent) {
    return;
  }

  if (!isCollapsedView) {
    renderCodeContent(originalSqlContent);
    return;
  }

  try {
    renderCodeContent(collapseSqlContent(originalSqlContent));
  } catch {
    isCollapsedView = false;
    renderCodeContent(originalSqlContent);
  } finally {
    updateToolButtons();
  }
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
      originalSqlContent = "";
      isCollapsedView = false;
      updateToolButtons();
      renderCodeContent("Yukleniyor...");

      try {
        const result = await window.sqlViewer.readSqlFile(file.path);
        originalSqlContent = result.content || "";
        isCollapsedView = false;
        renderSelectedSqlContent();
      } catch (error) {
        originalSqlContent = "";
        isCollapsedView = false;
        renderCodeContent("Dosya okunurken bir hata olustu: " + error.message);
        updateToolButtons();
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

toggleCollapseButton.addEventListener("click", () => {
  if (!selectedFilePath || !originalSqlContent) {
    return;
  }

  isCollapsedView = !isCollapsedView;
  renderSelectedSqlContent();
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

openSsmsButton.addEventListener("click", async () => {
  if (!selectedFilePath) {
    return;
  }

  try {
    await window.sqlViewer.openInSsms(selectedFilePath);
  } catch (error) {
    renderCodeContent("SSMS acilirken bir hata olustu: " + error.message);
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
