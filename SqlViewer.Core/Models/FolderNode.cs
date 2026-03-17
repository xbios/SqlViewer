using System;
using System.Collections.ObjectModel;

namespace SqlViewer.Core.Models;

public class FolderNode
{
    public string Name { get; set; } = string.Empty;
    public string FullPath { get; set; } = string.Empty;
    public bool IsFolder { get; set; }
    public DateTime? LastModified { get; set; }
    public string DateText => LastModified.HasValue
        ? LastModified.Value.ToString("dd.MM.yyyy HH:mm")
        : string.Empty;
    public SqlFileItem? FileItem { get; set; }
    public ObservableCollection<FolderNode> Children { get; set; } = new();
}
