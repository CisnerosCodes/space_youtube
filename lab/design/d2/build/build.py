# Inlines the three Google Fonts latin woff2 files into anim.src.html -> ../anim.html
# Source CSS: https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=IBM+Plex+Mono:wght@500&family=Source+Serif+4:opsz,wght@8..60,600&display=block
import base64, pathlib
here = pathlib.Path(__file__).resolve().parent
b64 = lambda n: base64.b64encode((here / n).read_bytes()).decode()
src = (here / 'anim.src.html').read_text()
src = src.replace('{{FONT_BARLOW}}', b64('BarlowCondensed800-latin.woff2'))
src = src.replace('{{FONT_PLEX}}', b64('IBMPlexMono500-latin.woff2'))
src = src.replace('{{FONT_SERIF}}', b64('SourceSerif4-latin.woff2'))
assert '{{' not in src
(here.parent / 'anim.html').write_text(src)
print('wrote', here.parent / 'anim.html', len(src), 'bytes')
