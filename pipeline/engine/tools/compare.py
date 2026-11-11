"""compare.py: side-by-side contact sheet of two videos at the same timestamps (a hand-built pilot and
the engine's rebuild). Each cell is a pair: A (left) and B (right), labelled with the frame number.
usage: python3 -I compare.py <a.mp4> <b.mp4> <out.png> [every=45] [labelA=pilot] [labelB=engine]"""
import sys, os, subprocess, tempfile, glob
from PIL import Image, ImageDraw, ImageFont
a, b, out = sys.argv[1:4]
opts = dict(x.split('=', 1) for x in sys.argv[4:] if '=' in x)
every = int(opts.get('every', 45)); la, lb = opts.get('labelA', 'pilot'), opts.get('labelB', 'engine')
W = 180; H = W * 16 // 9
def grab(video, d):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', video, '-vf', f"select='not(mod(n\\,{every}))',scale={W}:{H}", '-vsync', '0', os.path.join(d, '%05d.png')], check=True)
    return sorted(glob.glob(os.path.join(d, '*.png')))
with tempfile.TemporaryDirectory() as ta, tempfile.TemporaryDirectory() as tb:
    A, B = grab(a, ta), grab(b, tb)
    n = max(len(A), len(B)); cols = 5; rows = (n + cols - 1) // cols
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
    except Exception: font = ImageFont.load_default()
    sheet = Image.new('RGB', (cols * (2 * W + 12), rows * (H + 22)), (45, 45, 45))
    d = ImageDraw.Draw(sheet)
    for i in range(n):
        x = (i % cols) * (2 * W + 12); y = (i // cols) * (H + 22)
        d.text((x + 4, y + 3), f'{i * every}  {la} | {lb}', fill=(245, 184, 61), font=font)
        for j, L in enumerate((A, B)):
            if i < len(L): sheet.paste(Image.open(L[i]).convert('RGB'), (x + j * (W + 4), y + 22))
    sheet.save(out); print(out, n, 'pairs')
