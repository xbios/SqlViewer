namespace SqlViewer.Core.Models;

public class SqlFileItem
{
    public string Name { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string DirectoryName { get; set; } = string.Empty;
    public bool IsFavorite { get; set; }
    public DateTime LastModified { get; set; }
}
