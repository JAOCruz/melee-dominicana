#!/usr/bin/env python3
"""Convierte el volcado crudo de start.gg en el JSON público del sitio.

Uso: python3 scripts/startgg-to-json.py <raw.json> <salida.json> --name "Melee Dominicana #1" --slug melee-dominicana \
        [--replays <replays.json> --codes scripts/connect-codes.json]
Solo publica gamertags (nunca nombres reales). Un tag con forma de email se reemplaza por el prefijo.

Colores: con --replays (juegos .slp del día exportados del dashboard de Jarvis) y --codes (connect code -> tag)
cada personaje sale con su color (costume index de Slippi). Si los games de un set aparecen en los replays,
el color es exacto game por game; si no, se usa el color que ese jugador más usó con ese personaje.
"""
import json, re, sys, argparse
from collections import Counter

ap = argparse.ArgumentParser()
ap.add_argument("raw"); ap.add_argument("out")
ap.add_argument("--name", required=True); ap.add_argument("--slug", required=True)
ap.add_argument("--replays"); ap.add_argument("--codes")
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

# characterId de Slippi -> slug
SLP_CHARS = ["captain-falcon", "donkey-kong", "fox", "mr-game-and-watch", "kirby", "bowser", "link", "luigi", "mario",
             "marth", "mewtwo", "ness", "peach", "pikachu", "ice-climbers", "jigglypuff", "samus", "yoshi", "zelda",
             "sheik", "falco", "young-link", "dr-mario", "roy", "pichu", "ganondorf"]
replays = json.load(open(a.replays)) if a.replays else []
codes = {k: v for k, v in json.load(open(a.codes)).items() if not k.startswith("_")} if a.codes else {}
tag_code = {v.lower(): k for k, v in codes.items()}
fav = {}  # (code, slug) -> Counter(costume)
for r in replays:
    for p in r["players"]:
        if p.get("characterId") is not None and p["characterId"] < len(SLP_CHARS):
            fav.setdefault((p["connectCode"], SLP_CHARS[p["characterId"]]), Counter())[p.get("costumeId") or 0] += 1
def fav_costume(code, c):
    cnt = fav.get((code, c))
    return cnt.most_common(1)[0][0] if cnt else None

def match_replays(ea, eb, slots, games):
    """Costumes exactos game por game si el set completo aparece en los replays (1v1)."""
    ca, cb = ea["_codes"][0], eb["_codes"][0]
    if len(ea["_codes"]) != 1 or len(eb["_codes"]) != 1 or not ca or not cb or not games: return None
    rs = [r for r in replays if len(r["players"]) == 2 and {p["connectCode"] for p in r["players"]} == {ca, cb}]
    def fits(r, g):
        for eid, code in ((slots[0], ca), (slots[1], cb)):
            want = (g["chars"].get(str(eid)) or [None])[0]
            p = next(p for p in r["players"] if p["connectCode"] == code)
            if want and SLP_CHARS[p["characterId"]] != want: return False
        return True
    n = len(games)
    for start in range(len(rs) - n, -1, -1):  # la última ventana que encaja (los friendlies suelen ir antes)
        win = rs[start:start + n]
        if all(fits(r, g) for r, g in zip(win, games)):
            res = []
            for r in win:
                m = {}
                for eid, code in ((slots[0], ca), (slots[1], cb)):
                    p = next(p for p in r["players"] if p["connectCode"] == code)
                    m[(eid, SLP_CHARS[p["characterId"]])] = p.get("costumeId") or 0
                res.append(m)
            return res
    return None

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
                                       "players": ps, "chars": Counter(), "wins": 0, "losses": 0,
                                       "_codes": [tag_code.get(p["tag"].lower()) for p in ps]}
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
        exact = match_replays(entrants[slots[0]], entrants[slots[1]], slots, games)
        for gi, g in enumerate(games):
            for eid, cs in g["chars"].items():
                ent = entrants[int(eid)]
                g["chars"][eid] = [{"c": c, "k": exact[gi].get((int(eid), c)) if exact else None} for c in cs]
                for item in g["chars"][eid]:
                    if item["k"] is None:
                        for code in ent["_codes"]:
                            k = fav_costume(code, item["c"]) if code else None
                            if k is not None: item["k"] = k; break
        w = s["winnerId"]; l = slots[1] if slots[0] == w else slots[0]
        entrants[w]["wins"] += 1; entrants[l]["losses"] += 1
        sets.append({"round": s["fullRoundText"], "r": s["round"], "id": s["identifier"],
                     "a": slots[0], "b": slots[1], "sa": scores[0], "sb": scores[1], "w": w, "games": games})
    ents = sorted(entrants.values(), key=lambda e: (e["placement"], -e["wins"]))
    for e in ents:
        chars = []
        for c, _ in e["chars"].most_common(3):
            k = next((fav_costume(code, c) for code in e["_codes"] if code and fav_costume(code, c) is not None), None)
            chars.append({"c": c, "k": k})
        e["chars"] = chars
        del e["_codes"]
    out["events"].append({"key": key, "name": ev["name"], "entrants": ev["numEntrants"], "standings": ents, "sets": sets})

out["events"].sort(key=lambda e: "doubles" in e["key"])
json.dump(out, open(a.out, "w"), ensure_ascii=False, indent=1)
print("ok", a.out, [(e["name"], len(e["standings"]), len(e["sets"])) for e in out["events"]])
