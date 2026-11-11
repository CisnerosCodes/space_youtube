#!/bin/bash
# sheet.sh out.png cols width files...  : labeled contact sheet of stills
out=$1; cols=$2; w=$3; shift 3
args=(); filt=""; n=0
for f in "$@"; do args+=(-i "$f"); lbl=$(basename "$f" .png | sed 's/.*_//'); filt+="[$n]scale=$w:-1,drawtext=text='f$lbl':x=8:y=8:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6[v$n];"; n=$((n+1)); done
rows=$(( (n + cols - 1) / cols )); lay=""; for ((i=0;i<n;i++)); do c=$((i % cols)); r=$((i / cols)); lay+="${c}_${r}*0|"; done
inputs=""; for ((i=0;i<n;i++)); do inputs+="[v$i]"; done
# use xstack with explicit layout
lay=""; for ((i=0;i<n;i++)); do c=$((i % cols)); r=$((i / cols)); x=$((c*w)); hh=$((w*16/9)); y=$((r*hh)); lay+="${x}_${y}|"; done
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "${filt}${inputs}xstack=inputs=$n:layout=${lay%|}:fill=gray" -frames:v 1 "$out"
