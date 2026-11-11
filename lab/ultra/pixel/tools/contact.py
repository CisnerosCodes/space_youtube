#!/usr/bin/env python3
"""contact.py video.mp4 out.png [step] [cols]: labelled contact sheet (native 270x480 per frame)."""
import subprocess, sys, os, tempfile, glob
from PIL import Image, ImageDraw
v, out = sys.argv[1], sys.argv[2]
step = int(sys.argv[3]) if len(sys.argv) > 3 else 30
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 8
with tempfile.TemporaryDirectory() as td:
    subprocess.run(['ffmpeg', '-v', 'error', '-i', v, '-vf', f"select='not(mod(n\\,{step}))',scale=270:480:flags=neighbor", '-vsync', '0', os.path.join(td, 'f_%04d.png')], check=True)
    fs = sorted(glob.glob(os.path.join(td, 'f_*.png')))
    rows = (len(fs) + cols - 1) // cols
    g = Image.new('RGB', (cols * 270, rows * 494), (30, 30, 30))
    d = ImageDraw.Draw(g)
    for k, f in enumerate(fs):
        x, y = (k % cols) * 270, (k // cols) * 494
        g.paste(Image.open(f).convert('RGB'), (x, y + 14))
        d.text((x + 3, y + 1), f'{k * step}  ({k * step / 30:.1f} s)', fill=(245, 184, 61))
    g.save(out)
    print(out, g.size, len(fs), 'frames')
