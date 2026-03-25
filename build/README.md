# Build Icons

Electron Builder bu klasorde uygulama ikonlarini otomatik arar.

Koyabilecegin dosyalar:

- `build/icon.ico` : Windows installer ve uygulama ikonu
- `build/icon.icns` : macOS uygulama ikonu
- `build/icon.png` : Genel kaynak ikon olarak kullanilabilir

Onerilen boyutlar:

- `icon.ico` : 256x256 iceren coklu boyutlu ico
- `icon.icns` : macOS icns formatinda
- `icon.png` : en az 512x512

Bu dosyalari ekledikten sonra:

```bash
npm run dist:win
npm run dist:mac
```

Not:

- `electron-builder` varsayilan olarak `build/` klasorunu taradigi icin ekstra ayar gerekmiyor.
- Ikon dosyalari eklenmezse builder varsayilan Electron ikonunu kullanir.

Windows .ico için, ImageMagick kuruluysa:

magick build/dt.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico

macOS .icns için, macOS üzerinde:

mkdir build/icon.iconset
sips -z 16 16 build/icon.png --out build/icon.iconset/icon_16x16.png
sips -z 32 32 build/icon.png --out build/icon.iconset/icon_16x16@2x.png
sips -z 32 32 build/icon.png --out build/icon.iconset/icon_32x32.png
sips -z 64 64 build/icon.png --out build/icon.iconset/icon_32x32@2x.png
sips -z 128 128 build/icon.png --out build/icon.iconset/icon_128x128.png
sips -z 256 256 build/icon.png --out build/icon.iconset/icon_128x128@2x.png
sips -z 256 256 build/icon.png --out build/icon.iconset/icon_256x256.png
sips -z 512 512 build/icon.png --out build/icon.iconset/icon_256x256@2x.png
sips -z 512 512 build/icon.png --out build/icon.iconset/icon_512x512.png
sips -z 1024 1024 build/icon.png --out build/icon.iconset/icon_512x512@2x.png
iconutil -c icns build/icon.iconset -o build/icon.icns
