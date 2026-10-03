#!/usr/bin/env python3
"""Convierte el volcado crudo de start.gg en el JSON público del sitio.

Uso: python3 scripts/startgg-to-json.py <raw.json> <salida.json> --name "Melee Dominicana #1" --slug melee-dominicana
Solo publica gamertags (nunca nombres reales). Un tag con forma de email se reemplaza por el prefijo.
"""
import json, re, sys, argparse
from collections import Counter

ap = argparse.ArgumentParser()
ap.add_argument("raw"); ap.add_argument("out")
ap.add_argument("--name", required=True); ap.add_argument("--slug", required=True)
a = ap.parse_args()

raw = json.load(open(a.raw))
if isinstance(raw, str): raw = json.loads(raw)

EMAIL = re.compile(r"\S+@\S+")
def clean(s):
    s = (s or "").strip()
    return "" if EMAIL.search(s) else s
ALIAS = {"sheik-zelda": "sheik"}
def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("&", "and").replace(".", "")).strip("-")
    return ALIAS.get(s, s)

out = {"name": a.name, "url": f"https://www.start.gg/tournament/{a.slug}", "events": []}
for key, ev in raw.items():
    out.setdefault("startAt", ev.get("startAt"))
    entrants = {}
    for n in ev["standings"]["nodes"]:
        ps = []
        for p in n["entrant"]["participants"]:
            tag, pre = clean(p["gamerTag"]), clean(p.get("prefix"))
            ps.append({"tag": tag or pre or "?", "prefix": pre if tag else ""})
        team = clean(n["entrant"]["name"]) if len(ps) > 1 else ""
        entrants[n["entrant"]["id"]] = {"id": n["entrant"]["id"], "placement": n["placement"], "team": team,
                                       "players": ps, "chars": Counter(), "wins": 0, "losses": 0}
    sets = []
    for s in ev["sets"]:
        slots = [x["entrant"]["id"] if x.get("entrant") else None for x in s["slots"]]
        if None in slots or s.get("winnerId") is None: continue
        scores = [(x.get("standing") or {}).get("stats", {}).get("score", {}).get("value") for x in s["slots"]]
        games = []
        for g in sorted(s.get("games") or [], key=lambda g: g["orderNum"]):
            pick = {}
            for sel in g.get("selections") or []:
                c = (sel.get("character") or {}).get("name")
                if c:
                    pick.setdefault(sel["entrant"]["id"], []).append(slugify(c))
                    entrants[sel["entrant"]["id"]]["chars"][slugify(c)] += 1
            games.append({"w": g["winnerId"], "stage": (g.get("stage") or {}).get("name"), "chars": {str(k): v for k, v in pick.items()}})
        w = s["winnerId"]; l = slots[1] if slots[0] == w else slots[0]
        entrants[w]["wins"] += 1; entrants[l]["losses"] += 1
        sets.append({"round": s["fullRoundText"], "r": s["round"], "id": s["identifier"],
                     "a": slots[0], "b": slots[1], "sa": scores[0], "sb": scores[1], "w": w, "games": games})
    ents = sorted(entrants.values(), key=lambda e: (e["placement"], -e["wins"]))
    for e in ents: e["chars"] = [c for c, _ in e["chars"].most_common(3)]
    out["events"].append({"key": key, "name": ev["name"], "entrants": ev["numEntrants"], "standings": ents, "sets": sets})

out["events"].sort(key=lambda e: "doubles" in e["key"])
json.dump(out, open(a.out, "w"), ensure_ascii=False, indent=1)
print("ok", a.out, [(e["name"], len(e["standings"]), len(e["sets"])) for e in out["events"]])
