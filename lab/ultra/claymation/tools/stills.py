# Extract labelled stills from a video in one pass and tile them (for QA).
# python3 tools/stills.py video.mp4 out_dir frame1 frame2 ...   -> out_dir/s_FFFF.png + out_dir/sheet_K.png (6 per sheet)
import sys, subprocess, os, glob
from PIL import Image, ImageDraw
src, out, *fr = sys.argv[1:]
fr = sorted(set(int(f) for f in fr))
os.makedirs(out, exist_ok=True)
sel = '+'.join(f'eq(n\\,{f})' for f in fr)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', f"select='{sel}'", '-vsync', '0', f'{out}/tmp_%04d.png'], check=True)
files = sorted(glob.glob(f'{out}/tmp_*.png'))
for f, n in zip(files, fr): os.replace(f, f'{out}/s_{n:04d}.png')
w, h = 432, 768
for k in range(0, len(fr), 6):
    chunk = fr[k:k + 6]
    S = Image.new('RGB', (w * len(chunk), h + 26), (10, 10, 12)); d = ImageDraw.Draw(S)
    for i, n in enumerate(chunk):
        S.paste(Image.open(f'{out}/s_{n:04d}.png').convert('RGB').resize((w, h)), (i * w, 26))
        d.text((i * w + 6, 6), f'{n}  {n/30:.2f}s', fill=(245, 184, 61))
    S.save(f'{out}/sheet_{k//6:02d}.png')
print('wrote', len(fr), 'stills')
