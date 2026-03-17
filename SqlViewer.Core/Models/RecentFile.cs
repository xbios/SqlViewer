using System;

namespace SqlViewer.Core.Models;

public class RecentFile
{
    public int Id { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public DateTime AccessedAt { get; set; }
}
