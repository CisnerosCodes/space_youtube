#!/usr/bin/env python3
"""Build the ultra-experiment style reel and the 17.5 s comparison grid.

Reads the seven entries' out/final.mp4 (never edits them) and writes:
  reel/style_reel.mp4  1080 x 1920, 60 fps, 7 x 5.0 s (14.8 to 19.8 s of each entry),
                       hard cuts, the entry's real audio, a style label top-left.
  reel/grid.png        4 x 2 grid of the frame at 17.5 s from every entry, labeled.

Usage: python3 lab/ultra/reel/build_reel.py [--grid-only]
"""
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ULTRA = os.path.dirname(HERE)
FONTS = os.path.join(HERE, "fonts")

ENTRIES = [
    ("cinematic3d", "Cinematic 3D"),
    ("claymation", "Claymation"),
    ("papercut", "Papercut"),
    ("riso", "Riso"),
    ("anime", "Anime"),
    ("pixel", "Pixel"),
    ("kinetic", "Kinetic"),
]

T0, T1 = 14.8, 19.8          # narration moment: "On Phobos, it weighs... 15 grams"
GRID_T = 17.5
FPS = 60                     # kinetic is 60 fps; the 30 fps entries are frame-doubled (no blending)
DECLICK = 0.010              # 10 ms fade at each audio cut so a hard cut does not click

INK = (11, 11, 12)
PAPER = (242, 239, 232)
AMBER = (245, 184, 61)
MUTED = (140, 138, 133)

# Label box sits at the top-left corner of the Shorts safe zone (x 80 to 900, y 260 to 1500).
LABEL_X, LABEL_Y = 80, 260


def archivo(size, wght=800, wdth=112):
    f = ImageFont.truetype(os.path.join(FONTS, "Archivo.ttf"), size)
    f.set_variation_by_axes([wght, wdth])
    return f


def plex(size):
    return ImageFont.truetype(os.path.join(FONTS, "IBMPlexMono-SemiBold.ttf"), size)


def text_w(draw, s, font, tracking=0):
    if not s:
        return 0
    w = 0
    for ch in s:
        w += draw.textlength(ch, font=font) + tracking
    return w - tracking


def draw_tracked(draw, xy, s, font, fill, tracking=0):
    x, y = xy
    for ch in s:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


def make_label(index, name, scale=1.0):
    """Ink box: amber index '01 / 07', a hairline divider, the style name in paper."""
    s = scale
    idx = f"{index:02d}"
    tot = f"/ {len(ENTRIES):02d}"
    f_idx = plex(round(28 * s))
    f_name = archivo(round(46 * s), 800, 112)
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    pad_x, h = round(26 * s), round(84 * s)
    gap = round(18 * s)
    w_idx = text_w(probe, idx, f_idx)
    w_tot = text_w(probe, tot, f_idx)
    w_name = text_w(probe, name.upper(), f_name, tracking=round(1.5 * s))
    w = int(pad_x + w_idx + round(8 * s) + w_tot + gap + round(2 * s) + gap + w_name + pad_x)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=round(12 * s), fill=INK + (240,))
    # amber hairline along the bottom edge of the box
    d.rounded_rectangle((0, h - round(5 * s), w - 1, h - 1), radius=round(2 * s), fill=AMBER + (255,))
    cy = (h - round(5 * s)) / 2
    x = pad_x
    # index (amber) and total (muted), mono, vertically centered
    asc, desc = f_idx.getmetrics()
    ty = cy - (asc + desc) / 2 + round(1 * s)
    d.text((x, ty), idx, font=f_idx, fill=AMBER)
    x += w_idx + round(8 * s)
    d.text((x, ty), tot, font=f_idx, fill=MUTED)
    x += w_tot + gap
    d.rectangle((x, cy - round(20 * s), x + round(2 * s) - 1, cy + round(20 * s)), fill=PAPER + (90,))
    x += round(2 * s) + gap
    bbox = f_name.getbbox("CINEMATIC")  # cap-height box for optical centering
    cap_top, cap_bot = bbox[1], bbox[3]
    ny = cy - (cap_top + cap_bot) / 2
    draw_tracked(d, (x, ny), name.upper(), f_name, PAPER, tracking=round(1.5 * s))
    return im


def fit(make, s, max_w, size, draw, tracking=0):
    """Largest font (from `size` down) whose tracked width of `s` fits in max_w."""
    while size > 8:
        f = make(size)
        if text_w(draw, s, f, tracking) <= max_w:
            return f
        size -= 1
    return make(size)


def run(cmd):
    print("+", " ".join(cmd[:6]), "...", flush=True)
    subprocess.run(cmd, check=True)


def build_reel(tmp):
    out = os.path.join(HERE, "style_reel.mp4")
    cmd = ["ffmpeg", "-v", "error", "-y"]
    for key, _ in ENTRIES:
        cmd += ["-ss", f"{T0:.3f}", "-t", f"{T1 - T0:.3f}", "-i", os.path.join(ULTRA, key, "out", "final.mp4")]
    labels = []
    for i, (key, name) in enumerate(ENTRIES, 1):
        p = os.path.join(tmp, f"label_{key}.png")
        make_label(i, name).save(p)
        labels.append(p)
        cmd += ["-i", p]
    n = len(ENTRIES)
    dur = T1 - T0
    nframes = round(dur * FPS)
    parts = []
    for i in range(n):
        li = n + i
        parts.append(
            f"[{i}:v]settb=AVTB,setpts=PTS-STARTPTS,fps={FPS}:round=near,scale=1080:1920:flags=lanczos,"
            f"setsar=1,format=yuv420p,trim=end_frame={nframes}[b{i}];"
            f"[b{i}][{li}:v]overlay=x={LABEL_X}:y={LABEL_Y}:format=auto,format=yuv420p[v{i}];"
            f"[{i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"asetpts=PTS-STARTPTS,atrim=end={dur:.6f},apad=whole_dur={dur:.6f},"
            f"afade=t=in:d={DECLICK},afade=t=out:st={dur - DECLICK:.6f}:d={DECLICK}[a{i}];"
        )
    concat_in = "".join(f"[v{i}][a{i}]" for i in range(n))
    fc = "".join(parts) + f"{concat_in}concat=n={n}:v=1:a=1[v][a]"
    cmd += [
        "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
        "-r", str(FPS), "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
        "-profile:v", "high", "-g", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-movflags", "+faststart", out,
    ]
    run(cmd)
    return out


def build_grid(tmp):
    cell_w, cell_h = 540, 960
    strip = 76
    gut, margin = 16, 28
    cols, rows = 4, 2
    W = margin * 2 + cols * cell_w + (cols - 1) * gut
    H = margin * 2 + rows * (cell_h + strip) + (rows - 1) * gut
    grid = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(grid)
    f_idx = plex(24)
    f_name = archivo(36, 800, 112)
    for i, (key, name) in enumerate(ENTRIES):
        png = os.path.join(tmp, f"grid_{key}.png")
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{GRID_T:.3f}", "-i",
             os.path.join(ULTRA, key, "out", "final.mp4"), "-frames:v", "1", png])
        fr = Image.open(png).convert("RGB").resize((cell_w, cell_h), Image.LANCZOS)
        c, r = i % cols, i // cols
        x = margin + c * (cell_w + gut)
        y = margin + r * (cell_h + strip + gut)
        # label strip above the frame
        d.rectangle((x, y, x + cell_w - 1, y + strip - 1), fill=(22, 22, 24))
        d.rectangle((x, y + strip - 4, x + cell_w - 1, y + strip - 1), fill=AMBER)
        cy = (strip - 4) / 2
        asc, desc = f_idx.getmetrics()
        d.text((x + 22, y + cy - (asc + desc) / 2 + 1), f"{i + 1:02d}", font=f_idx, fill=AMBER)
        bb = f_name.getbbox("CINEMATIC")
        nx = x + 22 + d.textlength("00", font=f_idx) + 18
        draw_tracked(d, (nx, y + cy - (bb[1] + bb[3]) / 2), name.upper(), f_name, PAPER, tracking=1)
        grid.paste(fr, (x, y + strip))
    # eighth cell: the legend
    c, r = 7 % cols, 7 // cols
    x = margin + c * (cell_w + gut)
    y = margin + r * (cell_h + strip + gut)
    d.rectangle((x, y, x + cell_w - 1, y + strip + cell_h - 1), fill=(22, 22, 24))
    px = x + 44
    inner = cell_w - 2 * 44
    yy = y + 120
    d.text((px, yy), "ULTRA EXPERIMENT", font=plex(26), fill=AMBER)
    yy += 56
    f_head = fit(lambda sz: archivo(sz, 800, 112), "SEVEN STYLES,", inner, 54, d, 1)
    for line in ("SEVEN STYLES,", "ONE SHORT"):
        draw_tracked(d, (px, yy), line, f_head, PAPER, tracking=1)
        yy += round(f_head.size * 1.22)
    yy += 40
    d.rectangle((px, yy, px + 120, yy + 3), fill=AMBER)
    yy += 44
    rows_txt = [
        ("FRAME", f"{GRID_T:.1f} s into every entry"),
        ("LINE", "\"On Phobos, it weighs...\n15 grams.\""),
        ("STORY", "MMX: Japan's heist to bring\nhome a piece of Phobos"),
        ("BUILT", "Oct 20, 2026"),
    ]
    f_k, f_v = plex(22), archivo(30, 500, 100)
    for k, v in rows_txt:
        d.text((px, yy), k, font=f_k, fill=MUTED)
        yy += 36
        for ln in v.split("\n"):
            d.text((px, yy), ln, font=f_v, fill=PAPER)
            yy += 40
        yy += 26
    # wordmark, led by the echo mark (solid amber dot, hollow amber ring)
    wy = y + strip + cell_h - 120
    rad = 12
    mark_w = 2 * rad + 10 + 2 * rad + 20
    f_wm = fit(lambda sz: archivo(sz, 800, 112), "DOWNLINK CAT", inner - mark_w, 40, d, 1)
    d.ellipse((px, wy - rad, px + 2 * rad, wy + rad), fill=AMBER)
    rx = px + 2 * rad + 10
    d.ellipse((rx, wy - rad, rx + 2 * rad, wy + rad), outline=AMBER, width=4)
    bb = f_wm.getbbox("DOWNLINK")
    tx = rx + 2 * rad + 20
    ty = wy - (bb[1] + bb[3]) / 2
    draw_tracked(d, (tx, ty), "DOWNLINK", f_wm, PAPER, tracking=1)
    tx += text_w(d, "DOWNLINK", f_wm, 1) + d.textlength(" ", font=f_wm)
    draw_tracked(d, (tx, ty), "CAT", f_wm, AMBER, tracking=1)
    out = os.path.join(HERE, "grid.png")
    grid.save(out, optimize=True)
    return out


def main():
    for key, _ in ENTRIES:
        p = os.path.join(ULTRA, key, "out", "final.mp4")
        if not os.path.exists(p):
            sys.exit(f"missing entry: {p}")
    grid_only = "--grid-only" in sys.argv
    with tempfile.TemporaryDirectory() as tmp:
        reel = os.path.join(HERE, "style_reel.mp4") if grid_only else build_reel(tmp)
        grid = build_grid(tmp)
    print(json.dumps({"style_reel": reel, "grid": grid}))


if __name__ == "__main__":
    main()
