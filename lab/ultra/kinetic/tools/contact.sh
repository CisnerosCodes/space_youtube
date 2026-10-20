#!/bin/bash
# contact.sh <video.mp4> <out.png> [step_seconds] [cols] [width]
# Labeled contact sheet from a rendered video (frames go to a temp folder that is deleted).
set -e
V="$1"; OUT="$2"; STEP="${3:-1}"; COLS="${4:-7}"; WID="${5:-200}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
python3 - "$V" "$TMP" "$STEP" "$DUR" <<'EOF'
import sys, subprocess
v, tmp, step, dur = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
t = 0.0
while t < dur - 0.01:
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{t:.3f}', '-i', v, '-frames:v', '1', f'{tmp}/t{t:07.3f}.png'], check=True)
    t += step
EOF
python3 "$HERE/sheet.py" "$TMP" "$OUT" "$COLS" "$WID"
rm -rf "$TMP"
