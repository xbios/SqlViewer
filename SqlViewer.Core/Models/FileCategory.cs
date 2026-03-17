namespace SqlViewer.Core.Models;

public class FileCategory
{
    public int Id { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public int CategoryId { get; set; }

    public Category? Category { get; set; }
}
