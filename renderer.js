const pickFolderButton = document.getElementById("pick-folder-button");
const refreshFolderButton = document.getElementById("refresh-folder-button");
const appShellElement = document.querySelector(".app-shell");
const panelResizerElement = document.getElementById("panel-resizer");
const folderListElement = document.getElementById("folder-list");
const statusSelectedFolderElement = document.getElementById("status-selected-folder");
const fileCountElement = document.getElementById("file-count");
const fileSearchInput = document.getElementById("file-search-input");
const fileListElement = document.getElementById("file-list");
const activeFileNameElement = document.getElementById("active-file-name");
const fileContentElement = document.getElementById("file-content");
const toggleCollapseButton = document.getElementById("toggle-collapse-button");
const saveFormattedButton = document.getElementById("save-formatted-button");
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
let selectedRootPath = null;
let isResizingPanels = false;
let originalSqlContent = "";
let isCollapsedView = false;
let lastCollapsedSqlContent = "";
let currentFiles = [];
let currentSearchMatches = new Map();
let fileContentSearchCache = new Map();
let searchDebounceId = null;
let activeSearchRunId = 0;
const formatterIndent = "    ";
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short"
});
const sqlBlockPatterns = [
  { pattern: /\bWITH\b/gi, replacement: "\nWITH " },
  { pattern: /\bSELECT\b/gi, replacement: "\nSELECT" },
  { pattern: /\bFROM\b/gi, replacement: "\nFROM" },
  { pattern: /\bINNER\s+JOIN\b/gi, replacement: "\nINNER JOIN" },
  { pattern: /\bLEFT\s+OUTER\s+JOIN\b/gi, replacement: "\nLEFT OUTER JOIN" },
  { pattern: /\bLEFT\s+JOIN\b/gi, replacement: "\nLEFT JOIN" },
  { pattern: /\bRIGHT\s+OUTER\s+JOIN\b/gi, replacement: "\nRIGHT OUTER JOIN" },
  { pattern: /\bRIGHT\s+JOIN\b/gi, replacement: "\nRIGHT JOIN" },
  { pattern: /\bFULL\s+OUTER\s+JOIN\b/gi, replacement: "\nFULL OUTER JOIN" },
  { pattern: /\bFULL\s+JOIN\b/gi, replacement: "\nFULL JOIN" },
  { pattern: /\bCROSS\s+JOIN\b/gi, replacement: "\nCROSS JOIN" },
  { pattern: /\bJOIN\b/gi, replacement: "\nJOIN" },
  { pattern: /\bWHERE\b/gi, replacement: "\nWHERE" },
  { pattern: /\bGROUP\s+BY\b/gi, replacement: "\nGROUP BY" },
  { pattern: /\bORDER\s+BY\b/gi, replacement: "\nORDER BY" },
  { pattern: /\bHAVING\b/gi, replacement: "\nHAVING" },
  { pattern: /\bVALUES\b/gi, replacement: "\nVALUES" },
  { pattern: /\bSET\b/gi, replacement: "\nSET" },
  { pattern: /\bUNION\s+ALL\b/gi, replacement: "\nUNION ALL" },
  { pattern: /\bUNION\b/gi, replacement: "\nUNION" }
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

function normalizeSearch(value) {
  return value.toLocaleLowerCase("tr").trim();
}

function getSearchRank(fileName, query) {
  const normalizedFileName = normalizeSearch(fileName);

  if (!query) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (normalizedFileName.startsWith(query)) {
    return 0;
  }

  const includesIndex = normalizedFileName.indexOf(query);
  if (includesIndex !== -1) {
    return 100 + includesIndex;
  }

  return Number.MAX_SAFE_INTEGER;
}

function getFileNameSearchMatch(fileName, query) {
  return getSearchRank(fileName, query) !== Number.MAX_SAFE_INTEGER;
}

async function getNormalizedFileContent(file) {
  if (fileContentSearchCache.has(file.path)) {
    return fileContentSearchCache.get(file.path);
  }

  try {
    const result = await window.sqlViewer.readSqlFile(file.path);
    const normalizedContent = normalizeSearch(result.content || "");
    fileContentSearchCache.set(file.path, normalizedContent);
    return normalizedContent;
  } catch {
    fileContentSearchCache.set(file.path, "");
    return "";
  }
}

async function buildSearchMatches(files, query, runId) {
  const entries = await Promise.all(
    files.map(async (file) => {
      const nameMatch = getFileNameSearchMatch(file.displayName || file.name, query);
      const normalizedContent = await getNormalizedFileContent(file);
      const contentMatch = normalizedContent.includes(query);

      return [file.path, { nameMatch, contentMatch }];
    })
  );

  if (runId !== activeSearchRunId) {
    return null;
  }

  return new Map(entries);
}

function getSearchMatchLabel(match) {
  if (!match) {
    return "";
  }

  if (match.nameMatch && match.contentMatch) {
    return "Ad + Icerik";
  }

  if (match.contentMatch) {
    return "Icerik";
  }

  if (match.nameMatch) {
    return "Ad";
  }

  return "";
}

function getSearchMatchClass(match) {
  if (!match) {
    return "";
  }

  if (match.nameMatch && match.contentMatch) {
    return "match-both";
  }

  if (match.contentMatch) {
    return "match-content";
  }

  if (match.nameMatch) {
    return "match-name";
  }

  return "";
}

function scheduleFileSearch(shouldFocusMatch = false) {
  window.clearTimeout(searchDebounceId);
  searchDebounceId = window.setTimeout(() => {
    runFileSearch(shouldFocusMatch);
  }, 180);
}

async function runFileSearch(shouldFocusMatch = false) {
  const query = normalizeSearch(fileSearchInput.value);
  const runId = activeSearchRunId + 1;
  activeSearchRunId = runId;

  if (!query) {
    currentSearchMatches = new Map();
    renderFileList(currentFiles, shouldFocusMatch);
    return;
  }

  fileCountElement.textContent = "Araniyor...";
  const matches = await buildSearchMatches(currentFiles, query, runId);

  if (!matches) {
    return;
  }

  currentSearchMatches = matches;
  renderFileList(currentFiles, shouldFocusMatch);
}

function focusClosestSearchMatch(shouldFocus = false) {
  const query = normalizeSearch(fileSearchInput.value);

  if (!query || currentFiles.length === 0) {
    document
      .querySelectorAll(".file-item.search-match")
      .forEach((item) => item.classList.remove("search-match"));
    return;
  }

  const rankedFiles = [...currentFiles]
    .map((file) => {
      const match = currentSearchMatches.get(file.path);
      const nameRank = getSearchRank(file.displayName || file.name, query);
      const rank =
        nameRank !== Number.MAX_SAFE_INTEGER
          ? nameRank
          : match?.contentMatch
            ? 10000
            : Number.MAX_SAFE_INTEGER;

      return { file, rank };
    })
    .filter((entry) => entry.rank !== Number.MAX_SAFE_INTEGER)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        (a.file.displayName || a.file.name).localeCompare(
          b.file.displayName || b.file.name,
          "tr"
        )
    );

  const bestMatch = rankedFiles[0]?.file;
  const buttons = document.querySelectorAll(".file-item");

  buttons.forEach((button) => {
    const isMatch = button.dataset.filePath === bestMatch?.path;
    button.classList.toggle("search-match", isMatch);

    if (isMatch && shouldFocus) {
      button.focus({ preventScroll: false });
      button.scrollIntoView({ block: "nearest" });
    }
  });
}

function updateStatusBar() {
  const statusText = selectedFolderPath || "Henuz klasor secilmedi.";
  statusSelectedFolderElement.textContent = `Secilen klasor: ${statusText}`;
}

function updateToolButtons() {
  const hasFile = Boolean(selectedFilePath);
  const canSaveFormatted = hasFile && isCollapsedView && Boolean(lastCollapsedSqlContent);
  refreshFolderButton.disabled = !selectedRootPath;
  toggleCollapseButton.disabled = !hasFile;
  saveFormattedButton.disabled = !canSaveFormatted;
  openNotepadButton.disabled = !hasFile;
  openSsmsButton.disabled = !hasFile;
  openFolderButton.disabled = !hasFile;
  setToolButtonState(toggleCollapseButton, hasFile && isCollapsedView);
  setToolButtonState(saveFormattedButton, canSaveFormatted);
  toggleCollapseButton.title = isCollapsedView
    ? "Normal gorunume don"
    : "SQL formatla";
  toggleCollapseButton.setAttribute(
    "aria-label",
    isCollapsedView ? "Normal gorunume don" : "SQL formatla"
  );
}

function setEmptyFileState(message) {
  originalSqlContent = "";
  isCollapsedView = false;
  lastCollapsedSqlContent = "";
  activeFileNameElement.textContent = "Bir dosya sec";
  renderCodeContent(message);
  updateStatusBar();
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

function formatSqlContent(content) {
  const { masked, tokens } = maskProtectedSegments(content);
  let formatted = masked.replace(/\r\n/g, "\n");

  formatted = formatted
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s*=\s*/g, " = ")
    .replace(/\s*<>\s*/g, " <> ")
    .replace(/\s*>=\s*/g, " >= ")
    .replace(/\s*<=\s*/g, " <= ")
    .replace(/\s*>\s*/g, " > ")
    .replace(/\s*<\s*/g, " < ")
    .trim();

  sqlBlockPatterns.forEach(({ pattern, replacement }) => {
    formatted = formatted.replace(pattern, replacement);
  });

  formatted = formatted
    .replace(/\bON\b/gi, `\n${formatterIndent}ON`)
    .replace(/\bAND\b/gi, `\n${formatterIndent.repeat(2)}AND`)
    .replace(/\bOR\b/gi, `\n${formatterIndent.repeat(2)}OR`)
    .replace(/,\s*/g, ",\n")
    .replace(/\n{2,}/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^SELECT\b/i.test(line)) {
        return line;
      }

      if (/^FROM\b|^WHERE\b|^GROUP BY\b|^ORDER BY\b|^HAVING\b|^VALUES\b|^SET\b|^UNION\b|^WITH\b/i.test(line)) {
        return line;
      }

      if (/^(INNER JOIN|LEFT JOIN|LEFT OUTER JOIN|RIGHT JOIN|RIGHT OUTER JOIN|FULL JOIN|FULL OUTER JOIN|CROSS JOIN|JOIN)\b/i.test(line)) {
        return line;
      }

      if (/^ON\b/i.test(line)) {
        return `${formatterIndent}${line}`;
      }

      if (/^(AND|OR)\b/i.test(line)) {
        return `${formatterIndent.repeat(2)}${line}`;
      }

      return `${formatterIndent}${line}`;
    })
    .join("\n")
    .trim();

  return unmaskProtectedSegments(formatted, tokens);
}

function renderSelectedSqlContent() {
  if (!originalSqlContent) {
    return;
  }

  if (!isCollapsedView) {
    lastCollapsedSqlContent = "";
    renderCodeContent(originalSqlContent);
    updateToolButtons();
    return;
  }

  try {
    lastCollapsedSqlContent = formatSqlContent(originalSqlContent);
    renderCodeContent(lastCollapsedSqlContent);
  } catch {
    isCollapsedView = false;
    lastCollapsedSqlContent = "";
    renderCodeContent(originalSqlContent);
  } finally {
    updateToolButtons();
  }
}

async function loadFolderFiles(folderPath) {
  selectedFolderPath = folderPath;
  selectedFilePath = null;
  activeSearchRunId += 1;
  updateStatusBar();
  await window.sqlViewer.saveSelectedFolder(selectedRootPath, selectedFolderPath);
  fileCountElement.textContent = "Yukleniyor...";
  currentSearchMatches = new Map();
  fileContentSearchCache = new Map();
  renderFileList([]);
  setEmptyFileState("Listeden bir SQL dosyasina tiklayarak icerigini goruntule.");

  const result = await window.sqlViewer.listFolderFiles(folderPath);
  currentFiles = result.files;
  if (normalizeSearch(fileSearchInput.value)) {
    await runFileSearch();
  } else {
    fileCountElement.textContent = `${result.files.length} dosya`;
    renderFileList(result.files);
  }
  updateToolButtons();
}

async function refreshCurrentFolderFileList() {
  if (!selectedFolderPath) {
    return;
  }

  const result = await window.sqlViewer.listFolderFiles(selectedFolderPath);
  currentFiles = result.files;
  currentSearchMatches = new Map();
  fileContentSearchCache = new Map();
  fileCountElement.textContent = `${result.files.length} dosya`;
  renderFileList(result.files);
  runFileSearch();
}

async function refreshSelectedFolderContext() {
  if (!selectedRootPath || !selectedFolderPath) {
    return;
  }

  updateStatusBar();
  fileCountElement.textContent = "Yukleniyor...";
  fileListElement.classList.remove("empty");
  fileListElement.textContent = "Dosyalar yenileniyor...";

  const folderResult = await window.sqlViewer.listFolders(selectedRootPath);
  renderFolderList(folderResult.folders);
  await loadFolderFiles(selectedFolderPath);
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
      }
    });

    folderListElement.appendChild(button);
  });
}

function renderFileList(files, shouldFocusMatch = false) {
  currentFiles = files;
  fileListElement.innerHTML = "";
  fileListElement.classList.remove("empty");
  const query = normalizeSearch(fileSearchInput.value);
  const visibleFiles = query
    ? files.filter((file) => {
        const match = currentSearchMatches.get(file.path);
        return Boolean(match?.nameMatch || match?.contentMatch);
      })
    : files;
  fileCountElement.textContent = query
    ? `${visibleFiles.length} sonuc`
    : `${files.length} dosya`;

  if (visibleFiles.length === 0) {
    fileListElement.classList.add("empty");
    fileListElement.textContent = query
      ? "Dosya adinda veya icerikte sonuc bulunamadi."
      : "Bu klasorde `.sql` dosyasi bulunamadi.";
    return;
  }

  visibleFiles.forEach((file) => {
    const match = currentSearchMatches.get(file.path);
    const matchLabel = getSearchMatchLabel(match);
    const matchClass = getSearchMatchClass(match);
    const displayName = file.displayName || file.name;
    const button = document.createElement("button");
    button.type = "button";
    button.className = ["file-item", matchClass].filter(Boolean).join(" ");
    button.dataset.filePath = file.path;
    button.innerHTML = `
      <span class="file-item-topline">
        <span class="file-item-name">${escapeHtml(displayName)}</span>
        ${
          matchLabel
            ? `<span class="file-match-badge">${matchLabel}</span>`
            : ""
        }
      </span>
      <span class="file-item-date">${dateFormatter.format(new Date(file.modifiedAt))}</span>
    `;
    button.addEventListener("click", async () => {
      selectedFilePath = file.path;
      document
        .querySelectorAll(".file-item.active")
        .forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      activeFileNameElement.textContent = displayName;
      originalSqlContent = "";
      isCollapsedView = false;
      lastCollapsedSqlContent = "";
      updateToolButtons();
      renderCodeContent("Yukleniyor...");

      try {
        const result = await window.sqlViewer.readSqlFile(file.path);
        originalSqlContent = result.content || "";
        isCollapsedView = false;
        lastCollapsedSqlContent = "";
        renderSelectedSqlContent();
      } catch (error) {
        originalSqlContent = "";
        isCollapsedView = false;
        lastCollapsedSqlContent = "";
        renderCodeContent("Dosya okunurken bir hata olustu: " + error.message);
        updateToolButtons();
      }
    });

    if (file.path === selectedFilePath) {
      button.classList.add("active");
    }

    fileListElement.appendChild(button);
  });

  focusClosestSearchMatch(shouldFocusMatch);
}

pickFolderButton.addEventListener("click", async () => {
  try {
    const result = await window.sqlViewer.pickFolder();

    if (!result) {
      return;
    }

    selectedRootPath = result.rootPath;
    selectedFolderPath = result.selectedFolderPath;
    updateStatusBar();
    await window.sqlViewer.saveSelectedFolder(selectedRootPath, selectedFolderPath);
    renderFolderList(result.folders);
    currentSearchMatches = new Map();
    fileContentSearchCache = new Map();
    if (normalizeSearch(fileSearchInput.value)) {
      currentFiles = result.files;
      await runFileSearch();
    } else {
      fileCountElement.textContent = `${result.files.length} dosya`;
      renderFileList(result.files);
    }
    setEmptyFileState("Listeden bir SQL dosyasina tiklayarak icerigini goruntule.");
  } catch (error) {
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

fileSearchInput.addEventListener("input", () => {
  scheduleFileSearch(false);
});

fileSearchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  runFileSearch(true);
});

refreshFolderButton.addEventListener("click", async () => {
  if (!selectedRootPath || !selectedFolderPath) {
    return;
  }

  try {
    await refreshSelectedFolderContext();
  } catch (error) {
    fileCountElement.textContent = "0 dosya";
    renderFileList([]);
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

saveFormattedButton.addEventListener("click", async () => {
  if (!selectedFilePath || !isCollapsedView || !lastCollapsedSqlContent) {
    return;
  }

  try {
    const result = await window.sqlViewer.saveSqlFile(
      selectedFilePath,
      lastCollapsedSqlContent
    );
    selectedFilePath = result.filePath;
    originalSqlContent = lastCollapsedSqlContent;
    isCollapsedView = false;
    lastCollapsedSqlContent = "";
    activeFileNameElement.textContent = result.fileName;
    await refreshCurrentFolderFileList();
    renderSelectedSqlContent();
  } catch (error) {
    renderCodeContent("Formatli icerik kaydedilirken bir hata olustu: " + error.message);
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

async function restoreLastSession() {
  try {
    const lastSession = await window.sqlViewer.loadLastSession();

    if (!lastSession) {
      return;
    }

    selectedRootPath = lastSession.rootPath;
    selectedFolderPath = lastSession.selectedFolderPath;
    updateStatusBar();
    renderFolderList(lastSession.folders);
    currentSearchMatches = new Map();
    fileContentSearchCache = new Map();
    if (normalizeSearch(fileSearchInput.value)) {
      currentFiles = lastSession.files;
      await runFileSearch();
    } else {
      fileCountElement.textContent = `${lastSession.files.length} dosya`;
      renderFileList(lastSession.files);
    }
    setEmptyFileState("Listeden bir SQL dosyasina tiklayarak icerigini goruntule.");
    updateToolButtons();
  } catch {
    // Ignore restore errors and let the app start with empty state.
  }
}

updateToolButtons();
updateStatusBar();
restoreLastSession();
