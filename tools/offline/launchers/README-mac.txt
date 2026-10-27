missing.website - offline copy (Mac)

1. Double-click the .zip to unzip it, then open the "missing-website" folder.
2. Right-click (or Control-click) "Play Offline (Mac).command" and choose "Open", then "Open" again.
   - If macOS still refuses ("Apple could not verify..."), open System Settings > Privacy & Security,
     scroll down and click "Open Anyway" next to "Play Offline (Mac).command".
   - Or, in Terminal:  xattr -dr com.apple.quarantine ~/Downloads/missing-website
3. Your browser opens http://localhost:8642/ - the whole site, no internet needed.
   Keep the Terminal window open while you play. Close it to stop.

All pages: http://localhost:8642/pages.html
Arcade:    http://localhost:8642/play/public/

Saves and high scores are kept in your browser for http://localhost:8642, separately from the online site.
Nothing is uploaded: the launcher is a tiny web server that only your own computer can reach.
The music player and anything that talks to other websites still needs the internet.
