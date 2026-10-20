#!/bin/bash
# contact.sh video.mp4 out.png : one frame per second (frame 0, 30, 60, ...), labeled with time and frame, 7 across
v=$1; out=$2
ffmpeg -y -loglevel error -i "$v" -vf "select='not(mod(n\,30))',scale=240:-1,drawtext=text='%{eif\:n*30/30\:d}s  f%{eif\:n*30\:d}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.65,tile=7x7:padding=4:color=0x222222" -frames:v 1 "$out"
