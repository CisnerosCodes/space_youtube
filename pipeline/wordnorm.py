#!/usr/bin/env python3
"""Normalize script words and speech-to-text words, then diff them.

usage:
  python3 pipeline/wordnorm.py <script.md|text> <voice.words.json> [--alias meerkat=miracat ...] [--json]
  python3 pipeline/wordnorm.py --selftest

Normalization (applied to both sides):
- case, apostrophes and punctuation are dropped; hyphenated words split ("out-drove" = "out drove");
- numbers become digits: "fifteen" = "15", "one thousand" = "1,000" = "1000", "five and a half" = "5.5",
  "28.10" = "28.1" = "28" ".10" (Whisper splits decimals), "three billion" = "3000000000";
- ordinals become cardinals: "11th" = "eleventh" = "11" ("second" is left alone, it is usually time);
- word boundaries do not count: "Downlink Cat" = "down link cat" = "downlinkcat" = "down LinkCat".

Each difference is classified:
- "spelling": a proper noun (capitalized in the script) heard with a different spelling that sounds the same
  ("MeerKAT" heard as "Miracat"); accepted, reported;
- "minor": only function words differ ("the", "a", "of"); accepted, reported;
- "content": anything else ("checks" heard as "checked", a missing number). Content differences fail the take.
"""
import argparse, difflib, json, pathlib, re, sys

STOPWORDS = set("""a an the of to in on at by for from with and or but so as is are was were be been it its this that
these those there here then than up out into over under about just very also too do does did has have had will would
can could may might shall should not no yes we you they he she i our your their his her them us me my""".split())

UNITS = {w: i for i, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve thirteen "
                                     "fourteen fifteen sixteen seventeen eighteen nineteen".split())}
TENS = {w: 10 * i for i, w in enumerate("_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()) if w != "_"}
SCALES = {"thousand": 10**3, "million": 10**6, "billion": 10**9, "trillion": 10**12}
ORD_UNITS = {"first": 1, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9,
             "tenth": 10, "eleventh": 11, "twelfth": 12, "thirteenth": 13, "fourteenth": 14, "fifteenth": 15,
             "sixteenth": 16, "seventeenth": 17, "eighteenth": 18, "nineteenth": 19}
ORD_TENS = {"twentieth": 20, "thirtieth": 30, "fortieth": 40, "fiftieth": 50, "sixtieth": 60, "seventieth": 70,
            "eightieth": 80, "ninetieth": 90}
ORD_SCALES = {"hundredth": 100, "thousandth": 10**3, "millionth": 10**6, "billionth": 10**9}
NUM_LIT = re.compile(r"^\d+(?:\.\d+)?$")
DEC_TAIL = re.compile(r"^\.\d+$")


class Tok:
    __slots__ = ("n", "src", "brk", "raw")

    def __init__(self, n, src, brk, raw):
        self.n, self.src, self.brk, self.raw = n, src, brk, raw

    def __repr__(self):
        return f"Tok({self.n!r},{self.src})"


def _pieces(word):
    """Split one source word into normalized pieces. Returns (pieces, ends_with_break)."""
    w = word.replace("’", "'").replace("‘", "'").replace("—", " ").replace("–", " ")
    brk = bool(re.search(r"[.,;:!?)\"]$", w.strip()))
    out = []
    for part in re.split(r"[-/\s]+", w):
        p = part.lower().strip()
        p = p.replace("'", "")
        pct = p.endswith("%")
        p = re.sub(r"^[^\w.]+|[^\w%]+$", "", p)          # leading junk (keep a leading "." for ".10"), trailing punct
        p = p.rstrip("%")
        m = re.fullmatch(r"([\d,]+)(st|nd|rd|th)", p)     # 11th -> 11, 1,000th -> 1,000
        if m:
            p = m.group(1)
        if re.fullmatch(r"\d{1,3}(,\d{3})+(\.\d+)?", p):  # 600,000 -> 600000
            p = p.replace(",", "")
        p = re.sub(r"[^\w.]", "", p)
        p = p.strip(".") if not DEC_TAIL.match(p) and not NUM_LIT.match(p) else p
        if p:
            out.append(p)
        if pct:
            out.append("percent")
    return out, brk


def tokenize(words):
    """words: list of source word strings. Returns a list of Tok before number folding."""
    groups = []  # Whisper splits "600,000" into "600" ",000" and "28.10" into "28" ".10": join them first
    for i, w in enumerate(words):
        if groups and re.match(r"^[.,]\d", w.strip()) and re.search(r"\d$", groups[-1][0]):
            groups[-1] = (groups[-1][0] + w.strip(), groups[-1][1] + [i])
        else:
            groups.append((w, [i]))
    toks = []
    for w, src in groups:
        pieces, brk = _pieces(w)
        for j, p in enumerate(pieces):
            toks.append(Tok(p, list(src), brk and j == len(pieces) - 1, w))
    return toks


def _fmt(v):
    if abs(v - round(v)) < 1e-9:
        return str(int(round(v)))
    return ("%.6f" % v).rstrip("0").rstrip(".")


def _is_num_start(toks, i):
    t = toks[i].n
    if t in UNITS or t in TENS or t in ORD_UNITS or t in ORD_TENS or NUM_LIT.match(t) or t in ("hundred",) or t in SCALES:
        return True
    if t == "a" and i + 1 < len(toks) and toks[i + 1].n in ("hundred", "thousand", "million", "billion"):
        return True
    return False


def fold_numbers(toks):
    """Collapse runs of number words / literals into one digit token."""
    out, i, n = [], 0, len(toks)
    while i < n:
        if not _is_num_start(toks, i):
            out.append(toks[i]); i += 1; continue
        total, cur, last, j, src, dec = 0.0, 0.0, None, i, [], None
        while j < n:
            t = toks[j].n
            nxt = toks[j + 1].n if j + 1 < n else None
            if t == "a" and last is None and nxt in ("hundred", "thousand", "million", "billion"):
                cur, last = 1, "unit"
            elif NUM_LIT.match(t) and last in (None, "scale", "and"):
                cur += float(t); last = "lit"
            elif DEC_TAIL.match(t) and last == "lit" and "." not in toks[j - 1].n:
                cur = float(_fmt(cur) + t); last = "lit"
            elif t in TENS and last in (None, "hundred", "scale", "and"):
                cur += TENS[t]; last = "tens"
            elif t in UNITS and UNITS[t] < 10 and last in (None, "tens", "hundred", "scale", "and"):
                cur += UNITS[t]; last = "unit"
            elif t in UNITS and last in (None, "hundred", "scale", "and"):
                cur += UNITS[t]; last = "teen"
            elif t == "hundred" and last in (None, "unit", "teen", "tens", "lit"):
                cur = (cur or 1) * 100; last = "hundred"
            elif t in SCALES and last in (None, "unit", "teen", "tens", "lit", "hundred"):
                total += (cur or 1) * SCALES[t]; cur = 0; last = "scale"
            elif t in ORD_UNITS and last in (None, "tens", "hundred", "scale", "and"):
                cur += ORD_UNITS[t]; src += toks[j].src; j += 1; break
            elif t in ORD_TENS and last in (None, "hundred", "scale", "and"):
                cur += ORD_TENS[t]; src += toks[j].src; j += 1; break
            elif t in ORD_SCALES and last in (None, "unit", "teen", "tens", "lit", "hundred"):
                if ORD_SCALES[t] == 100:
                    cur = (cur or 1) * 100
                else:
                    total += (cur or 1) * ORD_SCALES[t]; cur = 0
                src += toks[j].src; j += 1; break
            elif t == "and" and last not in (None, "and") and nxt == "a" and j + 2 < n and toks[j + 2].n == "half":
                cur += 0.5; src += toks[j].src + toks[j + 1].src + toks[j + 2].src; j += 3; last = "half"; break
            elif t == "and" and last in ("hundred", "scale") and nxt is not None and (nxt in UNITS or nxt in TENS or NUM_LIT.match(nxt)):
                last = "and"
            elif t == "point" and last in ("unit", "teen", "tens", "lit") and nxt is not None and (nxt in UNITS or NUM_LIT.match(nxt)):
                digits, k = "", j + 1
                while k < n and (toks[k].n in UNITS and UNITS[toks[k].n] < 10 or re.fullmatch(r"\d+", toks[k].n)):
                    digits += str(UNITS[toks[k].n]) if toks[k].n in UNITS else toks[k].n
                    src += toks[k].src
                    if toks[k].brk:
                        k += 1; break
                    k += 1
                cur = float(_fmt(cur) + "." + digits)
                src += toks[j].src; j = k; last = "dec"; break
            else:
                break
            src += toks[j].src
            brk = toks[j].brk
            j += 1
            if brk:
                break
        if j == i:  # nothing consumed (should not happen), emit as is
            out.append(toks[i]); i += 1; continue
        val = total + cur
        out.append(Tok(_fmt(val), sorted(set(src)), toks[j - 1].brk, " ".join(t.raw for t in toks[i:j])))
        i = j
    return out


def normalize(words):
    return fold_numbers(tokenize(words))


def script_words(text):
    return text.split()


def phonetic(s):
    s = re.sub(r"[^a-z0-9]", "", s.lower())
    if s.isdigit():
        return s
    for a, b in (("ph", "f"), ("ch", "x"), ("sh", "x"), ("ck", "k"), ("gh", ""), ("wr", "r"), ("kn", "n"),
                 ("dg", "j"), ("q", "k"), ("c", "k"), ("z", "s"), ("v", "f"), ("ee", "i")):
        s = s.replace(a, b)
    head, rest = s[:1], s[1:]
    rest = re.sub(r"[aeiouyhw]", "", rest)
    if head in "aeiouy":
        head = ""
    key = re.sub(r"(.)\1+", r"\1", head + rest)
    return key


def _proper(raw_words):
    return any(re.search(r"[A-Z]", w[1:]) or (w[:1].isupper() and w.strip(".,!?").lower() not in STOPWORDS) for w in raw_words)


def diff(script_text, heard_words, aliases=None):
    """script_text: the narration text. heard_words: list of strings (the transcript words, in order).
    Returns a dict with ok, counts and a list of differences."""
    aliases = {k.lower(): v.lower() for k, v in (aliases or {}).items()}
    sw = script_words(script_text)
    S, H = normalize(sw), normalize(heard_words)
    sm = difflib.SequenceMatcher(None, [t.n for t in S], [t.n for t in H], autojunk=False)
    diffs, mapping = [], {}
    for op, a1, a2, b1, b2 in sm.get_opcodes():
        if op == "equal":
            for k in range(a2 - a1):
                mapping[a1 + k] = b1 + k
            continue
        s_chunk, h_chunk = S[a1:a2], H[b1:b2]
        sj, hj = "".join(t.n for t in s_chunk), "".join(t.n for t in h_chunk)
        s_raw = [sw[i] for t in s_chunk for i in t.src]
        h_raw = [heard_words[i] for t in h_chunk for i in t.src]
        rec = {"script": " ".join(dict.fromkeys(s_raw)), "heard": " ".join(dict.fromkeys(h_raw)),
               "script_index": [i for t in s_chunk for i in t.src][:1] or None,
               "heard_index": [i for t in h_chunk for i in t.src][:1] or None}
        if sj == hj or aliases.get(sj) == hj:
            kind = "joined"
        elif sj and hj and phonetic(sj) == phonetic(hj) and len(phonetic(sj)) >= 2 and _proper(s_raw):
            kind = "spelling"
        elif all(t.n in STOPWORDS for t in s_chunk + h_chunk):
            kind = "minor"
        else:
            kind = "content"
        rec["kind"] = kind
        if sj == hj or aliases.get(sj) == hj:
            for k in range(min(a2 - a1, b2 - b1)):
                mapping[a1 + k] = b1 + k
            mapping[a2 - 1] = b2 - 1
        diffs.append(rec)
    counts = {k: sum(1 for d in diffs if d["kind"] == k) for k in ("content", "spelling", "minor", "joined")}
    return {"ok": counts["content"] == 0, "counts": counts, "script_tokens": len(S), "heard_tokens": len(H),
            "differences": [d for d in diffs if d["kind"] != "joined"], "joined": [d for d in diffs if d["kind"] == "joined"],
            "_map": mapping, "_S": S, "_H": H}


def public(d):
    return {k: v for k, v in d.items() if not k.startswith("_")}


def format_diff(d):
    lines = [f"content {d['counts']['content']}, spelling {d['counts']['spelling']}, minor {d['counts']['minor']}"]
    for x in d["differences"]:
        lines.append(f"  [{x['kind']}] script: {x['script'] or '(nothing)'!r}  heard: {x['heard'] or '(nothing)'!r}")
    return "\n".join(lines)


def script_text_from_md(md):
    return " ".join(l[2:].strip() for l in md.splitlines() if l.startswith("> "))


def _selftest():
    cases = [
        ("Opportunity needed almost fifteen years.", "Opportunity needed almost 15 years.", True),
        ("On October 11 it passed 28.10 miles.", "On October 11th, it passed 28 .10 miles.", True),
        ("Perseverance checks 600,000.", "Perseverance checks 600 ,000.", True),
        ("Perseverance took five and a half.", "Perseverance took 5.5.", True),
        ("A dwarf, one thousand times less massive", "A dwarf 1,000 times less massive", True),
        ("only three billion years old", "only 3 billion years old", True),
        ("Perseverance checks 600,000.", "Perseverance checked 600,000.", False),
        ("Follow Downlink Cat to watch.", "Follow down LinkCat to watch.", True),
        ("Follow Downlink Cat to watch.", "Follow downlinkcat to watch.", True),
        ("Follow Downlink Cat to watch.", "Follow signal delay to watch.", False),
        ("MeerKAT may find several more every year.", "Miracat may find several more every year.", True),
        ("just out-drove every vehicle", "just outdrove every vehicle", True),
        ("In fifty million years, it either crashes", "In 50 million years, it either crashes", True),
        ("about six feet closer to Mars every hundred years", "about 6 feet closer to Mars every 100 years", True),
        ("one thousandth of a second", "1,000th of a second", True),
        ("on Japan's H3 rocket", "on Japan's H-3 rocket", True),
        ("Sojourner checked 20 points ahead.", "Sojourner checked twenty points ahead.", True),
        ("more than 90% of its distance", "more than 90 percent of its distance", True),
        ("Liftoff is Monday", "Lift off is on Monday", True),
    ]
    bad = 0
    for s, h, want in cases:
        d = diff(s, h.split())
        if d["ok"] != want:
            bad += 1
            print("FAIL", s, "|", h, "\n", format_diff(d))
    print(f"selftest: {len(cases) - bad}/{len(cases)} passed")
    return bad == 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script", nargs="?", help="script.md (narration lines start with '> ') or a plain text file")
    ap.add_argument("words", nargs="?", help="voice.words.json (align.py format)")
    ap.add_argument("--alias", action="append", default=[], help="script=heard, for a word Whisper always spells its own way")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        sys.exit(0 if _selftest() else 1)
    if not (a.script and a.words):
        ap.error("script and words are required")
    md = pathlib.Path(a.script).read_text()
    text = script_text_from_md(md) or md
    words = [w["w"] for w in json.loads(pathlib.Path(a.words).read_text())["words"]]
    d = diff(text, words, dict(x.split("=", 1) for x in a.alias))
    print(json.dumps(public(d), indent=1) if a.json else format_diff(d))
    sys.exit(0 if d["ok"] else 1)


if __name__ == "__main__":
    main()
