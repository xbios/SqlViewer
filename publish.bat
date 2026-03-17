@echo off
echo SqlViewer projesini tek dosya (portable) olarak yayinliyor...

dotnet publish SqlViewer\SqlViewer.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:PublishReadyToRun=true -p:WindowsPackageType=None -p:WindowsAppSDKSelfContained=true -o PublishOutput

echo Yayinlama islemi tamamlandi. Ciktilar PublishOutput klasorunde bulunmaktadir.
pause
