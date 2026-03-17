using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SqlViewer.Core.Models;
using SqlViewer.Core.Services;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SqlViewer.Core.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly IFileScannerService _fileScanner;
    private readonly IDatabaseService _database;

    public MainViewModel(IFileScannerService fileScanner, IDatabaseService database)
    {
        _fileScanner = fileScanner;
        _database = database;
        
        Files = new ObservableCollection<SqlFileItem>();
        FilteredFiles = new ObservableCollection<SqlFileItem>();
        FolderTree = new ObservableCollection<FolderNode>();
        SearchHistory = new ObservableCollection<SearchHistory>();
        RecentFiles = new ObservableCollection<RecentFile>();
        Favorites = new ObservableCollection<Favorite>();
        Categories = new ObservableCollection<Category>();
    }

    public ObservableCollection<SqlFileItem> Files { get; }
    public ObservableCollection<SqlFileItem> FilteredFiles { get; }
    public ObservableCollection<FolderNode> FolderTree { get; }
    public ObservableCollection<SearchHistory> SearchHistory { get; }
    public ObservableCollection<RecentFile> RecentFiles { get; }
    public ObservableCollection<Favorite> Favorites { get; }
    public ObservableCollection<Category> Categories { get; }

    [ObservableProperty]
    private string title = "SQL Viewer";

    [ObservableProperty]
    private string rootFolderPath = string.Empty;

    [ObservableProperty]
    private string searchQuery = string.Empty;

    [ObservableProperty]
    private string contentSearchQuery = string.Empty;

    [ObservableProperty]
    private SqlFileItem? selectedFile;

    [ObservableProperty]
    private FolderNode? selectedFolder;

    public bool HasSelectedFile => SelectedFile != null;

    partial void OnSelectedFolderChanged(FolderNode? value)
    {
        UpdateFilesForSelectedFolder();
    }

    private void UpdateFilesForSelectedFolder()
    {
        FilteredFiles.Clear();
        if (SelectedFolder != null)
        {
            foreach (var file in SelectedFolder.Children
                .Where(c => !c.IsFolder)
                .OrderByDescending(c => c.LastModified)
                .Select(c => c.FileItem)
                .Where(f => f != null))
            {
                FilteredFiles.Add(file!);
            }
        }
    }

    [ObservableProperty]
    private bool isLoading;

    [ObservableProperty]
    private string loadedFileContent = string.Empty;

    private CancellationTokenSource? _searchCts;

    [RelayCommand]
    public async Task InitializeAsync()
    {
        IsLoading = true;
        await _database.InitializeAsync();
        await LoadDatabaseDataAsync();
        IsLoading = false;
    }

    private async Task LoadDatabaseDataAsync()
    {
        Favorites.Clear();
        foreach (var item in await _database.GetFavoritesAsync()) Favorites.Add(item);

        RecentFiles.Clear();
        foreach (var item in await _database.GetRecentFilesAsync()) RecentFiles.Add(item);

        SearchHistory.Clear();
        foreach (var item in await _database.GetSearchHistoryAsync()) SearchHistory.Add(item);

        Categories.Clear();
        foreach (var item in await _database.GetCategoriesAsync()) Categories.Add(item);
    }

    [RelayCommand]
    public async Task ToggleFavoriteAsync()
    {
        if (SelectedFile == null) return;
        
        var isFav = Favorites.Any(f => f.FilePath == SelectedFile.FilePath);
        if (isFav)
        {
            await _database.DeleteFavoriteAsync(SelectedFile.FilePath);
        }
        else
        {
            await _database.AddFavoriteAsync(SelectedFile.FilePath);
        }
        
        await LoadDatabaseDataAsync();
    }

    [RelayCommand]
    public async Task LoadFolderAsync(string folderPath)
    {
        if (string.IsNullOrWhiteSpace(folderPath)) return;

        IsLoading = true;
        RootFolderPath = folderPath;
        Files.Clear();
        FilteredFiles.Clear();
        SelectedFolder = null;

        var files = await _fileScanner.ScanDirectoryAsync(folderPath);
        foreach (var f in files)
        {
            Files.Add(f);
        }

        BuildFolderTree();
        IsLoading = false;
    }

    private void BuildFolderTree()
    {
        FolderTree.Clear();
        var groups = Files
            .GroupBy(f => f.DirectoryName)
            .OrderBy(g => g.Key);

        foreach (var group in groups)
        {
            var folderNode = new FolderNode
            {
                Name = System.IO.Path.GetFileName(group.Key) is { Length: > 0 } n ? n : group.Key,
                FullPath = group.Key,
                IsFolder = true
            };

            // Dosyaları children'a ekle ama TreeView'da gösterme
            foreach (var file in group.OrderByDescending(f => f.LastModified))
            {
                folderNode.Children.Add(new FolderNode
                {
                    Name = file.Name,
                    FullPath = file.FilePath,
                    IsFolder = false,
                    LastModified = file.LastModified,
                    FileItem = file
                });
            }

            FolderTree.Add(folderNode);
        }
    }

    partial void OnSearchQueryChanged(string value)
    {
        FilterFiles(value);
    }

    private void FilterFiles(string query)
    {
        FilteredFiles.Clear();
        IEnumerable<SqlFileItem> files = string.IsNullOrWhiteSpace(query) 
            ? Files 
            : Files.Where(f => f.Name.Contains(query, StringComparison.OrdinalIgnoreCase));

        foreach (var file in files)
        {
            FilteredFiles.Add(file);
        }
    }

    [RelayCommand]
    public async Task OpenFileAsync(SqlFileItem file)
    {
        if (file == null) return;
        SelectedFile = file;
        
        try
        {
            LoadedFileContent = await System.IO.File.ReadAllTextAsync(file.FilePath);
            await _database.AddOrUpdateRecentFileAsync(file.FilePath);
            await LoadDatabaseDataAsync();
        }
        catch (Exception ex)
        {
            LoadedFileContent = $"Error reading file: {ex.Message}";
        }
    }

    [RelayCommand]
    public async Task ContentSearchAsync()
    {
        if (string.IsNullOrWhiteSpace(ContentSearchQuery) || !Files.Any()) return;

        IsLoading = true;
        
        _searchCts?.Cancel();
        _searchCts = new CancellationTokenSource();

        try
        {
            await _database.AddSearchHistoryAsync(ContentSearchQuery);
            var results = await _fileScanner.SearchInFilesAsync(Files, ContentSearchQuery, false, _searchCts.Token);
            
            // In a real app we might show these results in a separate list or tree
            // For now let's just update the list to show matching files
            var matchingFiles = results.Select(r => r.File).Distinct().ToList();
            FilteredFiles.Clear();
            foreach (var f in matchingFiles) FilteredFiles.Add(f);
            
            await LoadDatabaseDataAsync();
        }
        catch (OperationCanceledException) { }
        finally
        {
            IsLoading = false;
        }
    }

    [ObservableProperty]
    private string newCategoryName = string.Empty;

    [RelayCommand]
    public async Task AddCategoryAsync()
    {
        if (SelectedFile == null || string.IsNullOrWhiteSpace(NewCategoryName)) return;
        
        // Ensure category exists
        var cat = Categories.FirstOrDefault(c => c.Name.Equals(NewCategoryName, StringComparison.OrdinalIgnoreCase));
        if (cat == null)
        {
            cat = await _database.AddCategoryAsync(NewCategoryName);
            Categories.Add(cat);
        }

        await _database.AssignCategoryToFileAsync(SelectedFile.FilePath, cat.Id);

        NewCategoryName = string.Empty;
    }

    [RelayCommand]
    public async Task CopyToClipboardAsync()
    {
        if (string.IsNullOrEmpty(LoadedFileContent)) return;
        await Task.CompletedTask; // Placeholder for clipboard logic
    }

    [RelayCommand]
    public async Task ExportToTxtAsync()
    {
        if (SelectedFile == null || string.IsNullOrEmpty(LoadedFileContent)) return;
        await Task.CompletedTask; // Placeholder for export logic
    }
}
