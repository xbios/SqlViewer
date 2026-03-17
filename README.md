# SqlViewer

SqlViewer, taşınabilir (portable) olarak geliştirilmiş gelişmiş bir Windows masaüstü yerel SQL dosyası görüntüleyici ve yöneticisidir. 
Uygulama, on binlerce .sql dosyasını performans kaybı olmadan içerik veya isme göre hızlıca tarayabilir ve okumanızı sağlar.

## Özellikler
- **Klasör Tabanlı Çalışma**: Seçtiğiniz bir kök klasördeki tüm `.sql` uzantılı dosyaları alt klasörler dahil bularak listeler.
- **Hızlı Arama**: Dosya isminde anlık kelime süzme (filtering).
- **Tam Metin (Full-Text) İçerik Arama**: Binlerce dosya içerisinde saniyeler içinde kod (içerik) araması. `SearchOption.AllDirectories` ve `Parallel.ForEach` ile çoklu iş parçacığı mimarisi sayesinde uygulama donmadan sonuç döner.
- **Favori Sistemi**: Sık kullandığınız .sql dosyalarını favorilere ekleyip sol menüden hızlıca ulaşabilirsiniz (SQLite ile kayıt edilir).
- **Son Açılan Dosyalar**: Geçmişte incelediğiniz dosyalara kolaylıkla geri dönebilirsiniz.
- **Kategori Sistemi**: Dosyalarınızı projelerinize özel kendi belirleyeceğiniz kategorilere etiketleyebilirsiniz.
- **Monaco SQL Editör**: VS Code ile aynı temele sahip `Monaco Editor` vasıtasıyla WebView2 üzerinden syntax highlighting destekli gelişmiş kod görünümü.
- **Dışa Aktarma (Export)**: İncelediğiniz SQL dosyalarını isterseniz tek tuşla txt olarak kaydedebilir ya da kod içeriğini panoya kopyalayabilirsiniz.
- **Portable / Kurulumsuz**: `SqlViewer.exe` dosyası .NET çalışma zamanı (Runtime) gerektirmeden `self-contained` (Tüm kütüphaneler EXE'ye gömülü) olarak çalışır.

## Nasıl Kullanılır?
1. `PublishOutput` içerisindeki `SqlViewer.exe` aracını çalıştırın.
2. Arayüzün sol üst bölümündeki **"Klasör Seç"** butonuna basarak taramak istediğiniz ana SQL klasörünü gösterin.
3. Listelenen dosyalara tıklayarak içeriğini sağ pencerede okuyup yönetebilirsiniz. 

## Teknik Altyapı
- **Platform**: C#, .NET 8, WinUI 3 (Windows App SDK)
- **Mimari**: Model-View-ViewModel (MVVM) - `CommunityToolkit.Mvvm` ve `Dependency Injection` kullanıldı.
- **Veritabanı**: Entity Framework Core 8, SQLite (`%localappdata%\SqlViewer` klasörüne kurulur)
- **Editör**: WebView2 + Monaco Editor
