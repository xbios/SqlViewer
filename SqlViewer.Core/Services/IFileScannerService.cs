using SqlViewer.Core.Models;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SqlViewer.Core.Services;

public interface IFileScannerService
{
    /// <summary>
    /// Asynchronously scans a directory for .sql files.
    /// </summary>
    /// <param name="rootPath">The root directory path.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A list of SqlFileItems.</returns>
    Task<List<SqlFileItem>> ScanDirectoryAsync(string rootPath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Asynchronously searches within a specific file collection.
    /// </summary>
    /// <param name="files">The list of files to search in.</param>
    /// <param name="query">The search text.</param>
    /// <param name="matchCase">Whether the search is case-sensitive.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A list of search results.</returns>
    Task<List<SearchResult>> SearchInFilesAsync(IEnumerable<SqlFileItem> files, string query, bool matchCase, CancellationToken cancellationToken = default);
}
