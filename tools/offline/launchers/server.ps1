# A tiny static web server for the offline copy of missing.website (Windows).
# Started by "Play Offline (Windows).bat". Serves the site folder on http://localhost:8642/ only.
param([string]$Root = (Join-Path $PSScriptRoot '..\site'), [int]$Port = 8642)

$Root = [IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
$url = "http://localhost:$Port/"
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.htm' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.txt' = 'text/plain; charset=utf-8'
  '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.gif' = 'image/gif'
  '.webp' = 'image/webp'; '.ico' = 'image/x-icon'; '.mp3' = 'audio/mpeg'; '.ogg' = 'audio/ogg'; '.wav' = 'audio/wav'
  '.m4a' = 'audio/mp4'; '.mp4' = 'video/mp4'; '.webm' = 'video/webm'; '.glb' = 'model/gltf-binary'; '.gltf' = 'model/gltf+json'
  '.wasm' = 'application/wasm'; '.woff' = 'font/woff'; '.woff2' = 'font/woff2'; '.ttf' = 'font/ttf'; '.webmanifest' = 'application/manifest+json'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try { $listener.Start() } catch {
  # Already running (another launcher window is open): just open the browser.
  Start-Process $url; exit 0
}
Start-Process $url

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    $full = [IO.Path]::GetFullPath([IO.Path]::Combine($Root, ($path.TrimStart('/') -replace '/', '\')))
    if (-not ($full + '\').StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) { $res.StatusCode = 403; continue }
    if (Test-Path -LiteralPath $full -PathType Container) {
      if (-not $path.EndsWith('/')) { $res.Redirect($path + '/'); continue }
      $full = [IO.Path]::Combine($full, 'index.html')
    }
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $res.StatusCode = 404
      $body = [Text.Encoding]::UTF8.GetBytes('not found')
      $res.OutputStream.Write($body, 0, $body.Length)
      continue
    }
    $type = $types[[IO.Path]::GetExtension($full).ToLower()]
    $res.ContentType = if ($type) { $type } else { 'application/octet-stream' }
    $res.AddHeader('Cache-Control', 'no-cache')
    $bytes = [IO.File]::ReadAllBytes($full)
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    # The browser gave up on a request (closed tab, cancelled load): carry on.
  } finally {
    try { $res.Close() } catch {}
  }
}
