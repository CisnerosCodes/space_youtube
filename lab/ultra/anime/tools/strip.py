# strip.py: tile chosen frames of a video (labelled) into one image. usage: strip.py video.mp4 out.png f1,f2,... [cols] [scale]
import sys, subprocess, tempfile, os
from PIL import Image, ImageDraw
vid, out, fl = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(',')]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 8
sc = float(sys.argv[5]) if len(sys.argv) > 5 else 0.2
td = tempfile.mkdtemp()
sel = '+'.join(f'eq(n\\,{f})' for f in fl)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', vid, '-vf', f"select='{sel}',scale={int(1080*sc)}:-1", '-vsync', '0', os.path.join(td, 'f%04d.png')], check=True)
files = sorted(os.listdir(td))
ims = [Image.open(os.path.join(td, f)) for f in files]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (60, 60, 60))
for k, (im, f) in enumerate(zip(ims, fl)):
    x, y = (k % cols) * w, (k // cols) * h
    sheet.paste(im, (x, y)); d = ImageDraw.Draw(sheet); d.rectangle([x, y, x + 46, y + 16], fill=(0, 0, 0)); d.text((x + 3, y + 2), str(f), fill=(255, 255, 255))
sheet.save(out)
for f in files: os.remove(os.path.join(td, f))
os.rmdir(td)
print(out, len(ims))
