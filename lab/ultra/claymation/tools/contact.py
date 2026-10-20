# Labelled contact sheet of a video: every Nth frame (default 30) plus the last, 8 across.
# python3 tools/contact.py out/final.mp4 out/contact.png [N]
import sys, subprocess, tempfile, os, glob
from PIL import Image, ImageDraw, ImageFont
src, dst = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 30
nf = int(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', src]).decode().strip())
frames = list(range(0, nf, N)) + ([nf - 1] if (nf - 1) % N else [])
tmp = tempfile.mkdtemp(dir='/tmp/claude-0/-home-user-space-youtube/727c5319-2fae-5079-a2c4-4b28200d872a/scratchpad')
sel = '+'.join(f'eq(n\\,{f})' for f in frames)
subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f"select='{sel}',scale=216:384", '-vsync', '0', f'{tmp}/c_%04d.png'], check=True)
files = sorted(glob.glob(f'{tmp}/c_*.png'))
cols = 8; w, h = 216, 384; lab = 22
rows = (len(files) + cols - 1) // cols
S = Image.new('RGB', (cols * w, rows * (h + lab)), (12, 12, 14))
d = ImageDraw.Draw(S)
try: font = ImageFont.truetype('/home/user/space_youtube/lab/ultra/claymation/fonts/IBMPlexMono-SemiBold.ttf', 15)
except Exception: font = None
for i, (f, fr) in enumerate(zip(files, frames)):
    x, y = (i % cols) * w, (i // cols) * (h + lab)
    S.paste(Image.open(f), (x, y + lab))
    d.text((x + 4, y + 3), f'{fr}  {fr/30:.1f}s', fill=(245, 184, 61), font=font)
S.save(dst)
for f in files: os.remove(f)
os.rmdir(tmp)
print('wrote', dst, len(files), 'tiles')
