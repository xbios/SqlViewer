using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using SqlViewer.Core.Models;
using SqlViewer.Core.ViewModels;
using System;

namespace SqlViewer.Views
{
    public sealed partial class MainPage : Page
    {
        public MainViewModel ViewModel { get; }

        public MainPage()
        {
            ViewModel = App.Current.Services.GetRequiredService<MainViewModel>();
            this.InitializeComponent();
            this.DataContext = ViewModel;

            this.Loaded += MainPage_Loaded;
        }

        private async void MainPage_Loaded(object sender, RoutedEventArgs e)
        {
            try
            {
                await EditorWebView.EnsureCoreWebView2Async();
                
                var htmlPath = System.IO.Path.Combine(System.AppContext.BaseDirectory, "Assets", "monaco.html");
                if (System.IO.File.Exists(htmlPath))
                {
                    var html = await System.IO.File.ReadAllTextAsync(htmlPath);
                    EditorWebView.NavigateToString(html);
                }

                ViewModel.PropertyChanged += async (s, args) =>
                {
                    if (args.PropertyName == nameof(MainViewModel.LoadedFileContent))
                    {
                        if (EditorWebView.CoreWebView2 != null)
                        {
                            var jsonString = System.Text.Json.JsonSerializer.Serialize(ViewModel.LoadedFileContent);
                            await EditorWebView.ExecuteScriptAsync($"setContent({jsonString});");
                        }
                    }
                };
            }
            catch (Exception ex)
            {
                // Handle WebView2 initialization error
                System.Diagnostics.Debug.WriteLine($"WebView2 initialization error: {ex.Message}");
            }

            await ViewModel.InitializeAsync();
        }

        private async void SelectFolder_Click(object sender, RoutedEventArgs e)
        {
            var folderPicker = new Windows.Storage.Pickers.FolderPicker();
            
            var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.MainWindow);
            WinRT.Interop.InitializeWithWindow.Initialize(folderPicker, hwnd);
            
            folderPicker.FileTypeFilter.Add("*");

            var folder = await folderPicker.PickSingleFolderAsync();
            if (folder != null)
            {
                await ViewModel.LoadFolderAsync(folder.Path);
            }
        }

        private void CopyToClipboard_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(ViewModel.LoadedFileContent)) return;
            var dataPackage = new Windows.ApplicationModel.DataTransfer.DataPackage();
            dataPackage.SetText(ViewModel.LoadedFileContent);
            Windows.ApplicationModel.DataTransfer.Clipboard.SetContent(dataPackage);
        }

        public static Visibility BoolToVisible(bool value) => value ? Visibility.Visible : Visibility.Collapsed;
        public static Visibility BoolToCollapsed(bool value) => value ? Visibility.Collapsed : Visibility.Visible;

        private void FolderTreeView_ItemInvoked(TreeView sender, TreeViewItemInvokedEventArgs args)
        {
            if (args.InvokedItem is FolderNode node && node.IsFolder)
            {
                ViewModel.SelectedFolder = node;
            }
            else if (args.InvokedItem is FolderNode fileNode && !fileNode.IsFolder && fileNode.FileItem != null)
            {
                ViewModel.SelectedFile = fileNode.FileItem;
            }
        }

        private async void ExportToTxt_Click(object sender, RoutedEventArgs e)
        {
            if (ViewModel.SelectedFile == null || string.IsNullOrEmpty(ViewModel.LoadedFileContent)) return;

            var savePicker = new Windows.Storage.Pickers.FileSavePicker();
            var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.MainWindow);
            WinRT.Interop.InitializeWithWindow.Initialize(savePicker, hwnd);
            
            savePicker.SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary;
            savePicker.FileTypeChoices.Add("Text File", new System.Collections.Generic.List<string>() { ".txt" });
            savePicker.SuggestedFileName = ViewModel.SelectedFile.Name.Replace(".sql", ".txt");

            Windows.Storage.StorageFile file = await savePicker.PickSaveFileAsync();
            if (file != null)
            {
                Windows.Storage.CachedFileManager.DeferUpdates(file);
                await Windows.Storage.FileIO.WriteTextAsync(file, ViewModel.LoadedFileContent);
                await Windows.Storage.CachedFileManager.CompleteUpdatesAsync(file);
            }
        }
    }

    public class DateTimeToStringConverter : Microsoft.UI.Xaml.Data.IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            if (value is DateTime dt)
            {
                return dt.ToString("dd.MM.yyyy HH:mm");
            }
            return string.Empty;
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            throw new NotImplementedException();
        }
    }
}
