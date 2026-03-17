using SqlViewer.Core.Models;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SqlViewer.Core.Services;

public class FileScannerService : IFileScannerService
{
    public async Task<List<SqlFileItem>> ScanDirectoryAsync(string rootPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rootPath) || !Directory.Exists(rootPath))
        {
            return new List<SqlFileItem>();
        }

        var results = new ConcurrentBag<SqlFileItem>();

        await Task.Run(() =>
        {
            try
            {
                var files = Directory.EnumerateFiles(rootPath, "*.sql", SearchOption.AllDirectories);
                
                // Using Parallel.ForEach for faster processing on large directories
                Parallel.ForEach(files, new ParallelOptions { CancellationToken = cancellationToken }, file =>
                {
                    results.Add(new SqlFileItem
                    {
                        FilePath = file,
                        Name = Path.GetFileName(file),
                        DirectoryName = Path.GetDirectoryName(file) ?? string.Empty,
                        LastModified = File.GetLastWriteTime(file)
                    });
                });
            }
            catch (OperationCanceledException)
            {
                // Task cancelled
            }
            catch (Exception)
            {
                // Suppress access denied exceptions for some folders if needed
            }
        }, cancellationToken);

        return results.OrderBy(f => f.Name).ToList();
    }

    public async Task<List<SearchResult>> SearchInFilesAsync(IEnumerable<SqlFileItem> files, string query, bool matchCase, CancellationToken cancellationToken = default)
    {
        var results = new ConcurrentBag<SearchResult>();
        var comparison = matchCase ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase;

        await Task.Run(() =>
        {
            Parallel.ForEach(files, new ParallelOptions { CancellationToken = cancellationToken }, file =>
            {
                try
                {
                    using var stream = new FileStream(file.FilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    using var reader = new StreamReader(stream);
                    
                    string? line;
                    int lineNumber = 1;
                    
                    while ((line = reader.ReadLine()) != null)
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                        
                        if (line.Contains(query, comparison))
                        {
                            results.Add(new SearchResult
                            {
                                File = file,
                                LineNumber = lineNumber,
                                LineContent = line.Trim(),
                                MatchText = query
                            });
                        }
                        lineNumber++;
                    }
                }
                catch (OperationCanceledException)
                {
                    throw;
                }
                catch
                {
                    // Ignore files that are locked or inaccessible
                }
            });
        }, cancellationToken);

        return results.OrderBy(r => r.File.Name).ThenBy(r => r.LineNumber).ToList();
    }
}
