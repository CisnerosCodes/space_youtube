# Assemble a video from a base render and patch renders, taking any frame sub-range of a patch; re-encodes once.
# python3 tools/splice2.py base.mp4 out.mp4 FROM:TO:patch.mp4:FIRST [...]
#   FROM:TO  global frame range [FROM, TO) taken from the patch; FIRST = the global frame index of the patch's frame 0.
#   Frames not covered by any range come from the base. Ranges must not overlap.
import sys, subprocess, os
CRF = os.environ.get('CRF', '20')
base, out, *specs = sys.argv[1:]
P = sorted((int(a), int(b), f, int(o)) for a, b, f, o in (s.split(':', 3) for s in specs))
for (a0, b0, _, _), (a1, b1, _, _) in zip(P, P[1:]):
    assert b0 <= a1, f'overlap {a0}:{b0} and {a1}:{b1}'
files = []
for _, _, f, _ in P:
    if f not in files: files.append(f)
inputs = ['-i', base]
for f in files: inputs += ['-i', f]
filt, parts, cur = [], [], 0
for k, (a, b, f, o) in enumerate(P):
    if a > cur:
        filt.append(f'[0:v]trim=start_frame={cur}:end_frame={a},setpts=PTS-STARTPTS[s{k}]'); parts.append(f'[s{k}]')
    filt.append(f'[{files.index(f) + 1}:v]trim=start_frame={a - o}:end_frame={b - o},setpts=PTS-STARTPTS[p{k}]'); parts.append(f'[p{k}]')
    cur = b
filt.append(f'[0:v]trim=start_frame={cur},setpts=PTS-STARTPTS[tail]'); parts.append('[tail]')
filt.append(''.join(parts) + f'concat=n={len(parts)}:v=1:a=0[v]')
cmd = ['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[v]', '-r', '30',
       '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', CRF, '-preset', 'medium', '-movflags', '+faststart', out]
subprocess.run(cmd, check=True)
print('wrote', out)
