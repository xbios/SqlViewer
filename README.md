# SQL Viewer Desktop

Basit bir Electron masaustu uygulamasi:

- Klasor secersin
- Klasor icindeki `.sql` dosyalari listelenir
- Bir dosyaya tiklayinca icerigi ekranda gorulur

## Calistirma

```bash
npm install
npm start
```

Windows icin init dosyasi:

```powershell
.\init.ps1
.\init.ps1 -Task start -SkipInstall
```

PowerShell script calistirmayi engellerse:

```powershell
powershell -ExecutionPolicy Bypass -File .\init.ps1
powershell -ExecutionPolicy Bypass -File .\init.ps1 -Task start -SkipInstall
```

## Build Alma

Windows paketi:

```bash
npm run dist:win
```

macOS paketi:

```bash
npm run dist:mac
```

Tum aktif platform hedefleri:

```bash
npm run dist
```

Not:

- Windows build'ini Windows'ta alabilirsin.
- macOS `.dmg/.app` build'i gercekten uretmek icin genelde macOS ortaminda calisman gerekir.
- Paket ciktilari `dist/` klasorune yazilir.
