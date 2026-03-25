const pickFolderButton = document.getElementById("pick-folder-button");
const folderPathElement = document.getElementById("folder-path");
const fileCountElement = document.getElementById("file-count");
const fileListElement = document.getElementById("file-list");
const activeFileNameElement = document.getElementById("active-file-name");
const fileContentElement = document.getElementById("file-content");
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
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short"
});

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

function setEmptyFileState(message) {
  activeFileNameElement.textContent = "Bir dosya sec";
  renderCodeContent(message);
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

    selectedFilePath = null;
    folderPathElement.textContent = result.folderPath;
    fileCountElement.textContent = `${result.files.length} dosya`;
    renderFileList(result.files);
    setEmptyFileState("Listeden bir SQL dosyasina tiklayarak icerigini goruntule.");
  } catch (error) {
    folderPathElement.textContent = "Klasor okunamadi.";
    fileCountElement.textContent = "0 dosya";
    fileListElement.classList.add("empty");
    fileListElement.textContent =
      "Klasor secilirken bir hata olustu: " + error.message;
    setEmptyFileState("Bir hata olustu.");
  }
});
