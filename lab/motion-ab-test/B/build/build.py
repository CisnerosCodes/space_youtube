# Inlines the photo and the two Google font files into anim.src.html -> ../anim.html
import base64, pathlib
here = pathlib.Path(__file__).resolve().parent
b64 = lambda p: base64.b64encode(p.read_bytes()).decode()
src = (here / 'anim.src.html').read_text()
src = src.replace('{{FONT_INTER_TIGHT}}', b64(here / 'InterTight-latin.woff2'))
src = src.replace('{{FONT_JETBRAINS_MONO}}', b64(here / 'JetBrainsMono500-latin.woff2'))
src = src.replace('{{PHOTO}}', b64(here.parent.parent / 'assets' / 'webb_mirror_orig.jpg'))
assert '{{' not in src
(here.parent / 'anim.html').write_text(src)
print('wrote', here.parent / 'anim.html', len(src), 'bytes')
