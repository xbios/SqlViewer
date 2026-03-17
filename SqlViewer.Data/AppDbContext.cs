using Microsoft.EntityFrameworkCore;
using SqlViewer.Core.Models;
using System.IO;
using System;

namespace SqlViewer.Data;

public class AppDbContext : DbContext
{
    // These properties are required for EF Core migrations
    public DbSet<Category> Categories { get; set; }
    public DbSet<Favorite> Favorites { get; set; }
    public DbSet<FileCategory> FileCategories { get; set; }
    public DbSet<RecentFile> RecentFiles { get; set; }
    public DbSet<SearchHistory> SearchHistories { get; set; }

    public AppDbContext()
    {
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var dbPath = Path.Combine(localAppData, "SqlViewer", "sqlviewer.db");

        var directory = Path.GetDirectoryName(dbPath);
        if (!Directory.Exists(directory) && directory != null)
        {
            Directory.CreateDirectory(directory);
        }

        optionsBuilder.UseSqlite($"Data Source={dbPath}");
    }
}
