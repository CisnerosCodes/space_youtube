# Replace frame ranges of a rendered video with patch renders (same page, same frames), re-encoding once.
# python3 tools/splice.py base.mp4 out.mp4 FROM:TO:patch.mp4 [...]
import sys, subprocess
import os
CRF = os.environ.get('CRF', '20')
base, out, *patches = sys.argv[1:]
P = sorted((int(a), int(b), f) for a, b, f in (p.split(':', 2) for p in patches))
inputs = ['-i', base]
for _, _, f in P: inputs += ['-i', f]
parts, filt, cur = [], [], 0
for k, (a, b, f) in enumerate(P):
    if a > cur:
        filt.append(f'[0:v]trim=start_frame={cur}:end_frame={a},setpts=PTS-STARTPTS[s{k}]'); parts.append(f'[s{k}]')
    filt.append(f'[{k + 1}:v]setpts=PTS-STARTPTS[p{k}]'); parts.append(f'[p{k}]')
    cur = b
filt.append(f'[0:v]trim=start_frame={cur},setpts=PTS-STARTPTS[tail]'); parts.append('[tail]')
filt.append(''.join(parts) + f'concat=n={len(parts)}:v=1:a=0[v]')
cmd = ['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[v]', '-r', '30',
       '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', CRF, '-preset', 'medium', '-movflags', '+faststart', out]
subprocess.run(cmd, check=True)
print('wrote', out)
