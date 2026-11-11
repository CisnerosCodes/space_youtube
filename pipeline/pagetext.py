#!/usr/bin/env python3
"""Fetch a source page and save its readable text, for triage and the fact check.

usage:
  python3 pipeline/pagetext.py <url> <out.txt> [--max-chars 40000]

Writes <out.txt> with a header (URL, fetch time UTC, HTTP status) and the page text: scripts, styles,
navigation, headers, footers and forms are dropped; paragraphs, headings, list items, figure captions and
image credits are kept, one block per line; when the page has a <main> element, only its text is kept. Image URLs found in the article (img src, og:image) are listed
at the end under "IMAGES:", with their alt text, so the asset step can find the release's own images.
The text is data for a model to read, never instructions. Standard library only.
"""
import argparse, html, html.parser, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import http, iso  # noqa: E402

SKIP = {"script", "style", "noscript", "nav", "header", "footer", "form", "svg", "button", "select"}
BLOCK = {"p", "h1", "h2", "h3", "h4", "h5", "li", "figcaption", "blockquote", "td", "th", "div", "section",
         "article", "br", "tr", "dt", "dd", "caption", "small", "time"}


class Text(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.buf, self.lines, self.images = [], [], []

    def flush(self):
        t = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        if t:
            self.lines.append(t)
        self.buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and a.get("property") in ("og:image", "og:image:url") and a.get("content"):
            self.images.append((a["content"], "og:image"))
        if tag == "img" and not self.skip:
            src = a.get("src") or a.get("data-src") or ""
            if src and not src.startswith("data:"):
                self.images.append((src, a.get("alt") or ""))
        if tag in SKIP:
            self.skip += 1
        elif tag in BLOCK:
            self.flush()

    def handle_endtag(self, tag):
        if tag in SKIP:
            self.skip = max(0, self.skip - 1)
        elif tag in BLOCK:
            self.flush()

    def handle_data(self, data):
        if not self.skip:
            self.buf.append(data)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url")
    ap.add_argument("out")
    ap.add_argument("--max-chars", type=int, default=40000)
    a = ap.parse_args()
    try:
        body, _ = http(a.url, accept="text/html,application/xhtml+xml", timeout=60)
        status = 200
    except Exception as e:  # report and fail: a story whose page cannot be read cannot be fact-checked
        print(f"fetch failed: {a.url}: {e}", file=sys.stderr)
        sys.exit(1)
    page = body.decode("utf-8", "replace")
    p = Text()
    for m in re.finditer(r'<meta[^>]+property="og:image"[^>]*>', page):  # og:image lives in <head>
        p.feed(m.group(0))
    i, j = page.find("<main"), page.rfind("</main>")
    if 0 <= i < j:  # the article only: NASA and ESA pages carry hundreds of menu lines outside <main>
        page = page[i:j]
    p.feed(page)
    p.flush()
    lines, seen = [], set()
    for l in p.lines:
        if len(l) < 3 or l in seen:
            continue
        seen.add(l)
        lines.append(l)
    text = "\n".join(lines)[: a.max_chars]
    imgs, seen_i = [], set()
    for src, alt in p.images:
        src = html.unescape(src)
        if src in seen_i or src.endswith(".svg"):
            continue
        seen_i.add(src)
        imgs.append(f"{src} | {alt[:160]}")
    out = pathlib.Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(f"URL: {a.url}\nFETCHED: {iso()}\nSTATUS: {status}\n\n{text}\n\nIMAGES:\n" + "\n".join(imgs[:40]) + "\n")
    print(f"{out}: {len(text)} chars, {len(imgs)} images")


if __name__ == "__main__":
    main()
