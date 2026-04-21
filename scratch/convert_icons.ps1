
Add-Type -AssemblyName System.Drawing
$images = @{
    "C:\Users\gusta\.gemini\antigravity\brain\8188ea82-15ec-41fb-b7ac-f9a7c50f4621\caobapos_icon_png_24_1776663705365.png" = "g:\Projects\CaobaPOS\CaobaPOS\assets\icon.png";
    "C:\Users\gusta\.gemini\antigravity\brain\8188ea82-15ec-41fb-b7ac-f9a7c50f4621\caobapos_adaptive_foreground_png_24_1776663721662.png" = "g:\Projects\CaobaPOS\CaobaPOS\assets\adaptive-icon.png";
    "C:\Users\gusta\.gemini\antigravity\brain\8188ea82-15ec-41fb-b7ac-f9a7c50f4621\caobapos_splash_icon_png_24_1776663739720.png" = "g:\Projects\CaobaPOS\CaobaPOS\assets\splash-icon.png"
}

foreach ($src in $images.Keys) {
    $dest = $images[$src]
    Write-Host "Converting $src to $dest..."
    $img = [System.Drawing.Image]::FromFile($src)
    $img.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    Write-Host "Done."
}
