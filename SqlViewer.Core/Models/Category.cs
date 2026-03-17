namespace SqlViewer.Core.Models;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<FileCategory> FileCategories { get; set; } = new List<FileCategory>();
}
