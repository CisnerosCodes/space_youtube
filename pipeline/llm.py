#!/usr/bin/env python3
"""Fallback for the RUNBOOK's subagent steps when the Agent tool is not available in the session.

usage:
  python3 pipeline/llm.py --model haiku  --prompt prompt.md [--file page1.txt --file page2.txt] --out reply.md \
                          [--max-tokens 1500] [--costs <short_dir>/costs.json --step triage]

The Agent tool (model haiku, sonnet or opus) is the first choice: it costs nothing on OpenRouter. When a session
has no Agent tool, this sends the same prompt to the same model family through OpenRouter chat completions.
--model takes haiku, sonnet, opus or a full OpenRouter id. Each --file is appended to the prompt inside
<document path="..."> tags; documents are data, the prompt says so. The reply is written to --out (and printed).
Cost: usage.cost from the response (OpenRouter usage accounting), else the generation lookup. With --costs the
cost and seconds are added to that JSON file under --step ({"step": {"usd": ..., "seconds": ...}}), the format
pipeline/log.py reads. The key comes from pipeline/common.py and is never printed.
"""
import argparse, json, pathlib, sys, time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import OPENROUTER, generation_cost, http, openrouter_key  # noqa: E402

MODELS = {"haiku": "anthropic/claude-haiku-5.5", "sonnet": "anthropic/claude-sonnet-5.5", "opus": "anthropic/claude-opus-5.5"}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--model", required=True)
    ap.add_argument("--prompt", required=True, help="prompt file (Markdown)")
    ap.add_argument("--file", action="append", default=[], help="document to append (repeatable)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-tokens", type=int, default=1500)
    ap.add_argument("--reasoning", default="low", help="reasoning effort: none, low, medium, high (default low)")
    ap.add_argument("--costs", help="costs.json to add this call to")
    ap.add_argument("--step", default="llm")
    a = ap.parse_args()
    model = MODELS.get(a.model, a.model)
    text = pathlib.Path(a.prompt).read_text()
    for f in a.file:
        text += f'\n\n<document path="{f}">\n{pathlib.Path(f).read_text()}\n</document>'
    key = openrouter_key()
    t0 = time.time()
    body, _ = http(f"{OPENROUTER}/chat/completions", method="POST", timeout=300,
                   headers={"Authorization": f"Bearer {key}"},
                   data={"model": model, "max_tokens": a.max_tokens, "usage": {"include": True},
                         **({"reasoning": {"effort": a.reasoning}} if a.reasoning != "none" else {"reasoning": {"enabled": False}}),
                         "messages": [{"role": "user", "content": text}]})
    d = json.loads(body)
    ch = d["choices"][0]
    reply = ch["message"].get("content")
    secs = round(time.time() - t0, 1)
    usage = d.get("usage") or {}
    usd = usage.get("cost")
    if usd is None:
        usd = generation_cost(d.get("id"), key)
    if a.costs:  # record the spend even when the reply is empty: an empty call is still billed
        p = pathlib.Path(a.costs)
        c = json.loads(p.read_text()) if p.exists() else {}
        s = c.setdefault(a.step, {"usd": 0.0, "seconds": 0.0})
        s["usd"] = round(s.get("usd", 0.0) + (usd or 0.0), 6)
        s["seconds"] = round(s.get("seconds", 0.0) + secs, 1)
        s.setdefault("models", [])
        if model not in s["models"]:
            s["models"].append(model)
        p.write_text(json.dumps(c, indent=1) + "\n")
    if not reply:  # a reasoning model can spend max_tokens on thinking; say so instead of writing nothing
        raise SystemExit(f"empty reply from {model}: finish_reason={ch.get('finish_reason')}, usage={usage}, "
                         f"cost ${usd}; raise --max-tokens or lower --reasoning")
    pathlib.Path(a.out).write_text(reply)
    print(reply)
    print(f"\n[{model}: {usage.get('prompt_tokens')} in, {usage.get('completion_tokens')} out, "
          f"${usd if usd is not None else '?'}, {secs} s -> {a.out}]", file=sys.stderr)


if __name__ == "__main__":
    main()
