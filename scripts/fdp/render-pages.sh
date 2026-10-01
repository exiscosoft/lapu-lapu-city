#!/usr/bin/env bash
# Renders FDP PDFs to page images for transcription.
# Usage: scripts/fdp/render-pages.sh [id-pattern]   (default: all documents)
# Output: downloads/fdp-pages/{id}/p-{n}.jpg
set -euo pipefail
cd "$(dirname "$0")/../.."
pattern="${1:-.}"
node -e '
const c = require("./data/fdp/catalog.json");
for (const d of c.documents) if (new RegExp(process.argv[1]).test(d.id)) console.log(d.id + "\t" + d.file);
' "$pattern" | while IFS=$'\t' read -r id file; do
  out="downloads/fdp-pages/$id"
  [ -d "$out" ] && continue
  mkdir -p "$out"
  pdftoppm -scale-to 2400 -jpeg -jpegopt quality=85 "downloads/fdp/$file" "$out/p"
  echo "$id: $(ls "$out" | wc -l | tr -d ' ') pages"
done
