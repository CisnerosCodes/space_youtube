#!/bin/sh
# stills.sh <short_dir> <frames,comma,list> [sheet.png] [cols] [width]: renders those frames of
# <short_dir>/anim.html into <short_dir>/out/stills/ (cleared first) and tiles them into a sheet.
set -e
D="$(cd "$1" && pwd)"; FR="$2"; OUT="${3:-$D/out/qa_sheet.png}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
rm -rf "$D/out/stills"
SECS=$(python3 -c "print(max(int(x) for x in '$FR'.split(','))/30+1)")
( cd "$ROOT/lab/motion-ab-test" && node render.mjs "$D/anim.html" "$SECS" 30 "$D/out" "frames=$FR" )
python3 -I "$ROOT/pipeline/engine/tools/sheet.py" "$D/out/stills" "$OUT" "${4:-6}" "${5:-360}"
