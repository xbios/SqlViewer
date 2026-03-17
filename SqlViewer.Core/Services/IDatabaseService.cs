using SqlViewer.Core.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SqlViewer.Core.Services;

public interface IDatabaseService
{
    Task InitializeAsync();

    Task<List<Category>> GetCategoriesAsync();
    Task<Category> AddCategoryAsync(string name);
    Task DeleteCategoryAsync(int id);
    Task AssignCategoryToFileAsync(string filePath, int categoryId);
    Task<List<Category>> GetCategoriesForFileAsync(string filePath);

    Task<List<Favorite>> GetFavoritesAsync();
    Task<Favorite?> AddFavoriteAsync(string filePath);
    Task DeleteFavoriteAsync(string filePath);

    Task<List<RecentFile>> GetRecentFilesAsync();
    Task AddOrUpdateRecentFileAsync(string filePath);

    Task<List<SearchHistory>> GetSearchHistoryAsync();
    Task AddSearchHistoryAsync(string query);
    Task ClearSearchHistoryAsync();
}
