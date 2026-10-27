#!/bin/bash
# Starts the offline copy of missing.website on http://localhost:8642/ and opens it.
# Keep this window open while you play; close it (or press Ctrl+C) to stop.
cd "$(dirname "$0")" || exit 1
echo
echo "  missing.website is running offline at http://localhost:8642/"
echo "  Keep this window open while you play. Close it to stop."
echo
if [ -x /usr/bin/perl ]; then
  exec /usr/bin/perl launcher/server.pl site 8642
elif command -v python3 >/dev/null 2>&1; then
  (sleep 1; open "http://localhost:8642/") &
  exec python3 -m http.server 8642 --bind 127.0.0.1 --directory site
else
  echo "Couldn't find perl or python3 to run the local server."
  read -r -p "Press Enter to close."
fi
