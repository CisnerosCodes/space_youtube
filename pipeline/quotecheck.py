#!/usr/bin/env python3
"""Check every quote in a Short's fact-check table against the live source page.

usage:
  python3 pipeline/quotecheck.py <short_dir>          # reads <short_dir>/factcheck.md

factcheck.md holds one Markdown table whose rows are:
  | Line | Claim | "exact quote" | https://source.url |
Each source URL is fetched now (pipeline/pagetext.py, saved to <short_dir>/work/sources/), and each quote must
appear in that page's text. Curly and straight quotes and apostrophes, dashes, non-breaking spaces and runs of
white space are treated as equal; nothing else is. Prints one line per row (MATCH or MISSING) and writes
<short_dir>/work/quotecheck.json. Exit 0 when every quote matches, 1 when any is missing (cut or rewrite that
claim, then run it again), 2 when a page cannot be fetched.
"""
import json, pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent


def norm(s):
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("—", "-").replace("‑", "-").replace(" ", " ").replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


def main():
    if len(sys.argv) != 2 or sys.argv[1].startswith("-"):
        print(__doc__)
        sys.exit(0 if len(sys.argv) == 2 else 2)
    d = pathlib.Path(sys.argv[1])
    rows = []
    for line in (d / "factcheck.md").read_text().splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) >= 4 and cells[3].startswith("http"):
            q = cells[2]
            if len(q) >= 2 and q[0] in "\"“" and q[-1] in "\"”":
                q = q[1:-1]
            rows.append({"line": cells[0], "claim": cells[1], "quote": q, "url": cells[3]})
    if not rows:
        sys.exit(f"no rows with a quote and a URL in {d / 'factcheck.md'}")
    pages, out_dir = {}, d / "work" / "sources"
    for i, url in enumerate(dict.fromkeys(r["url"] for r in rows)):
        f = out_dir / f"source{i + 1}.txt"
        r = subprocess.run([sys.executable, "-I", str(HERE / "pagetext.py"), url, str(f)], capture_output=True, text=True)
        if r.returncode:
            print(r.stderr.strip())
            sys.exit(2)
        pages[url] = (norm(f.read_text()), f.name)
    bad = 0
    for r in rows:
        text, fname = pages[r["url"]]
        r["match"] = norm(r["quote"]) in text
        r["page_file"] = fname
        bad += not r["match"]
        print(f"{'MATCH  ' if r['match'] else 'MISSING'} line {r['line']}: {r['quote'][:90]}")
    (d / "work").mkdir(exist_ok=True)
    (d / "work" / "quotecheck.json").write_text(json.dumps(rows, indent=1, ensure_ascii=False) + "\n")
    print(f"{len(rows) - bad}/{len(rows)} quotes matched")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
