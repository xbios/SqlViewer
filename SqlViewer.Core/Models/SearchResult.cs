namespace SqlViewer.Core.Models;

public class SearchResult
{
    public SqlFileItem File { get; set; } = new();
    public int LineNumber { get; set; }
    public string LineContent { get; set; } = string.Empty;
    public string MatchText { get; set; } = string.Empty;
}
