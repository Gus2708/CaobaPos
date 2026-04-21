
$assets = @('icon.png', 'adaptive-icon.png', 'splash-icon.png')
foreach ($f in $assets) {
    try {
        $path = "g:\Projects\CaobaPOS\CaobaPOS\assets\$f"
        if (Test-Path $path) {
            $bytes = [System.IO.File]::ReadAllBytes($path)
            $sig = [System.BitConverter]::ToString($bytes[0..3])
            $len = $bytes.Length
            Write-Host "$f | Signature: $sig | Size: $len bytes"
        } else {
            Write-Host "$f | File not found at $path"
        }
    } catch {
        Write-Host "$f | Error: $($_.Exception.Message)"
    }
}
