using Microsoft.EntityFrameworkCore;
using SqlViewer.Core.Models;
using SqlViewer.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SqlViewer.Core.Services;

public class DatabaseService : IDatabaseService
{
    public async Task InitializeAsync()
    {
        using var db = new AppDbContext();
        await db.Database.EnsureCreatedAsync();
    }

    public async Task<List<Category>> GetCategoriesAsync()
    {
        using var db = new AppDbContext();
        return await db.Categories.OrderBy(c => c.Name).ToListAsync();
    }

    public async Task<Category> AddCategoryAsync(string name)
    {
        using var db = new AppDbContext();
        var category = new Category { Name = name };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return category;
    }

    public async Task DeleteCategoryAsync(int id)
    {
        using var db = new AppDbContext();
        var category = await db.Categories.FindAsync(id);
        if (category != null)
        {
            db.Categories.Remove(category);
            await db.SaveChangesAsync();
        }
    }

    public async Task AssignCategoryToFileAsync(string filePath, int categoryId)
    {
        using var db = new AppDbContext();
        var exists = await db.FileCategories.AnyAsync(fc => fc.FilePath == filePath && fc.CategoryId == categoryId);
        if (!exists)
        {
            db.FileCategories.Add(new FileCategory { FilePath = filePath, CategoryId = categoryId });
            await db.SaveChangesAsync();
        }
    }

    public async Task<List<Category>> GetCategoriesForFileAsync(string filePath)
    {
        using var db = new AppDbContext();
        var categoryIds = await db.FileCategories
            .Where(fc => fc.FilePath == filePath)
            .Select(fc => fc.CategoryId)
            .ToListAsync();
        
        return await db.Categories
            .Where(c => categoryIds.Contains(c.Id))
            .ToListAsync();
    }

    public async Task<List<Favorite>> GetFavoritesAsync()
    {
        using var db = new AppDbContext();
        return await db.Favorites.OrderBy(f => f.FilePath).ToListAsync();
    }

    public async Task<Favorite?> AddFavoriteAsync(string filePath)
    {
        using var db = new AppDbContext();
        var exists = await db.Favorites.AnyAsync(f => f.FilePath == filePath);
        if (!exists)
        {
            var fav = new Favorite { FilePath = filePath };
            db.Favorites.Add(fav);
            await db.SaveChangesAsync();
            return fav;
        }
        return null;
    }

    public async Task DeleteFavoriteAsync(string filePath)
    {
        using var db = new AppDbContext();
        var fav = await db.Favorites.FirstOrDefaultAsync(f => f.FilePath == filePath);
        if (fav != null)
        {
            db.Favorites.Remove(fav);
            await db.SaveChangesAsync();
        }
    }

    public async Task<List<RecentFile>> GetRecentFilesAsync()
    {
        using var db = new AppDbContext();
        return await db.RecentFiles.OrderByDescending(r => r.AccessedAt).Take(20).ToListAsync();
    }

    public async Task AddOrUpdateRecentFileAsync(string filePath)
    {
        using var db = new AppDbContext();
        var recent = await db.RecentFiles.FirstOrDefaultAsync(r => r.FilePath == filePath);
        if (recent != null)
        {
            recent.AccessedAt = DateTime.UtcNow;
        }
        else
        {
            recent = new RecentFile { FilePath = filePath, AccessedAt = DateTime.UtcNow };
            db.RecentFiles.Add(recent);
        }
        await db.SaveChangesAsync();
    }

    public async Task<List<SearchHistory>> GetSearchHistoryAsync()
    {
        using var db = new AppDbContext();
        return await db.SearchHistories.OrderByDescending(s => s.SearchedAt).Take(10).ToListAsync();
    }

    public async Task AddSearchHistoryAsync(string query)
    {
        using var db = new AppDbContext();
        var exists = await db.SearchHistories.FirstOrDefaultAsync(s => s.Query == query);
        if (exists != null)
        {
            exists.SearchedAt = DateTime.UtcNow;
        }
        else
        {
            var history = new SearchHistory { Query = query, SearchedAt = DateTime.UtcNow };
            db.SearchHistories.Add(history);
        }
        await db.SaveChangesAsync();
    }

    public async Task ClearSearchHistoryAsync()
    {
        using var db = new AppDbContext();
        db.SearchHistories.RemoveRange(db.SearchHistories);
        await db.SaveChangesAsync();
    }
}
