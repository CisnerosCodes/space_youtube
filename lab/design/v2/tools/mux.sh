#!/usr/bin/env bash
# mux.sh <narration.mp3> [video=out/video.mp4] [out=out/short_v2.mp4]
# Adds the narration to the rendered video, loudness-normalized to -14 LUFS integrated, -1.5 dBTP
# (two-pass loudnorm after a gentle peak limiter, so the gain is linear and reaches the target).
# The audio is padded to the video length, so the last frame (the finished wordmark) is kept.
set -euo pipefail
MP3="$1"; VID="${2:-out/video.mp4}"; OUT="${3:-out/short_v2.mp4}"
PRE="aresample=48000,volume=6dB,alimiter=limit=0.75:attack=3:release=60:level=disabled"
J=$(ffmpeg -hide_banner -i "$MP3" -af "$PRE,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
MI=$(echo "$J" | python3 -I -c "import json,sys;d=json.load(sys.stdin);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -y -loglevel error -i "$VID" -i "$MP3" -map 0:v -map 1:a -c:v copy \
  -af "$PRE,loudnorm=I=-14:TP=-1.5:LRA=11:$MI:linear=true,aresample=48000,apad" -c:a aac -b:a 192k -shortest "$OUT"
ffmpeg -hide_banner -i "$OUT" -af loudnorm=I=-14:TP=-1.5:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p' | grep -E '"input_(i|tp)"'
ffprobe -v error -select_streams v -show_entries stream=nb_frames -of csv=p=0 "$OUT" | sed 's/^/video frames: /'
