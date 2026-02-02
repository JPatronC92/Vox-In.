$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$apksigner = "$env:ANDROID_HOME\build-tools\35.0.0\apksigner.bat"
$keystore = "debug.keystore"
$pass = "android"
$unsignedApk = "src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk"
$signedApk = "vox-intelligence-pro-v2.apk"

# Check if apksigner exists, if not try older version
if (-not (Test-Path $apksigner)) {
    $apksigner = "$env:ANDROID_HOME\build-tools\34.0.0\apksigner.bat"
}
if (-not (Test-Path $apksigner)) {
    $apksigner = "$env:ANDROID_HOME\build-tools\33.0.1\apksigner.bat"
}

Write-Host "Signing APK..."
& $apksigner sign --ks $keystore --ks-key-alias androiddebugkey --ks-pass pass:$pass --key-pass pass:$pass --out $signedApk $unsignedApk

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! Signed APK created at: $signedApk"
}
else {
    Write-Host "Signing failed!"
}
