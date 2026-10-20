#!/usr/bin/env python3
# contact.py <video.mp4> <out.png> [step=30] [cols=8] [tw=216]: labelled contact sheet straight from the video
import sys, subprocess, tempfile, glob, os
from PIL import Image, ImageDraw, ImageFont
vid, out = sys.argv[1], sys.argv[2]
step = int(sys.argv[3]) if len(sys.argv) > 3 else 30
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 8
tw = int(sys.argv[5]) if len(sys.argv) > 5 else 216
th = round(tw * 1920 / 1080)
with tempfile.TemporaryDirectory() as d:
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', vid, '-vf', f"select='not(mod(n\\,{step}))',scale={tw}:{th}", '-vsync', '0', os.path.join(d, 'c%04d.png')], check=True)
    files = sorted(glob.glob(os.path.join(d, 'c*.png')))
    rows = (len(files) + cols - 1) // cols
    S = Image.new('RGB', (cols * tw, rows * (th + 24)), (24, 24, 24))
    dr = ImageDraw.Draw(S)
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', 16)
    for i, f in enumerate(files):
        x, y = (i % cols) * tw, (i // cols) * (th + 24)
        S.paste(Image.open(f).convert('RGB'), (x, y + 24))
        dr.text((x + 5, y + 3), f'{i*step}  {i*step/30:.1f}s', fill=(255, 210, 110), font=font)
    S.save(out)
    print(out, S.size, len(files))
