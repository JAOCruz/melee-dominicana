#!/usr/bin/env python3
"""Genera /noticias/ (índice + una página por artículo), sitemap.xml y robots.txt.

Uso: python3 scripts/build-noticias.py
Fuente: content/noticias/*.md con front-matter (title, date, summary, image, torneo opcional).
Solo librería estándar. Todo texto se escapa antes de entrar al HTML o al JSON-LD.
"""
import html, json, os, re, shutil, sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, PUB = ROOT / "content" / "noticias", ROOT / "public"
SITE = os.environ.get("SITE_URL", "https://melee-rd.netlify.app").rstrip("/")
NAME = "Melee Dominicana"
DEFAULT_IMG = "og.png"
esc = lambda s: html.escape(str(s), quote=True)


def parse(path):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"---\s*\n(.*?)\n---\s*\n(.*)", raw, re.S)
    if not m:
        sys.exit(f"{path.name}: falta el front-matter (--- ... ---)")
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line and not line.startswith("#"):
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip("\"'")
    for k in ("title", "date", "summary"):
        if not meta.get(k):
            sys.exit(f"{path.name}: falta '{k}' en el front-matter")
    try:
        date.fromisoformat(meta["date"])
    except ValueError:
        sys.exit(f"{path.name}: 'date' debe ser AAAA-MM-DD")
    meta["slug"] = path.stem
    meta["image"] = meta.get("image") or DEFAULT_IMG
    return meta, m.group(2)


def safe_url(u):
    u = html.unescape(u).strip()
    return u if re.match(r"(https?://|/|#|mailto:)", u) else "#"


def inline(text):
    t = esc(text)  # primero escapar, luego aplicar formato
    t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)",
               lambda m: f'<a href="{esc(safe_url(m.group(2)))}"'
               + (' target="_blank" rel="noopener"' if m.group(2).startswith("http") else "")
               + f">{m.group(1)}</a>", t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])", r"<em>\1</em>", t)
    return re.sub(r"`(.+?)`", r"<code>\1</code>", t)


def markdown(body):
    """Subconjunto: ## ###, párrafos, listas (- / 1.), > cita, ---, **negrita**, *cursiva*, [txt](url)."""
    out, para, lst = [], [], None

    def flush():
        nonlocal para, lst
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")
            para = []
        if lst:
            out.append(f"</{lst}>")
            lst = None

    for line in body.splitlines():
        s = line.strip()
        h = re.match(r"(#{2,3})\s+(.*)", s)
        li = re.match(r"([-*]|\d+\.)\s+(.*)", s)
        if not s:
            flush()
        elif h:
            flush()
            n = len(h.group(1))
            out.append(f"<h{n}>{inline(h.group(2))}</h{n}>")
        elif s == "---":
            flush(); out.append("<hr>")
        elif s.startswith(">"):
            flush(); out.append(f"<blockquote><p>{inline(s[1:].strip())}</p></blockquote>")
        elif li:
            kind = "ol" if li.group(1)[0].isdigit() else "ul"
            if lst != kind:
                flush(); out.append(f"<{kind}>"); lst = kind
            out.append(f"<li>{inline(li.group(2))}</li>")
        else:
            if lst:
                flush()
            para.append(s)
    flush()
    return "\n".join(out)


def fecha_es(iso):
    d = date.fromisoformat(iso)
    meses = "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split()
    return f"{d.day} de {meses[d.month - 1]} de {d.year}"


def abs_url(path):
    return path if path.startswith("http") else f"{SITE}/{path.lstrip('/')}"


NAV = """<nav class="nav">
    <a href="/#top" class="brand"><img src="/favicon.svg" alt="" width="20" height="20" /><span>MELEE RD</span></a>
    <div class="nav-links">
      <a href="/#lounge">Clips</a>
      <a href="/#torneos">Torneos</a>
      <a href="/#escena">Escena</a>
      <a href="/#hub">Empieza</a>
      <a href="/#envia">Envía</a>
      <a href="/noticias/" aria-current="page">Noticias</a>
      <a class="btn-yt" href="https://www.youtube.com/channel/UC3pTL3ikdL8_8REeSHtinSQ" target="_blank" rel="noopener">YouTube</a>
    </div>
  </nav>"""

FOOT = """<footer class="footer">
    <div class="stripe" aria-hidden="true"></div>
    <p class="motto">Nuestra escena · Nuestra pasión · Nuestro juego</p>
    <p class="links">
      <a href="/noticias/">Noticias</a>
      <a href="https://www.youtube.com/channel/UC3pTL3ikdL8_8REeSHtinSQ" target="_blank" rel="noopener">YouTube</a>
      <a href="https://www.start.gg" target="_blank" rel="noopener">start.gg</a>
    </p>
    <p class="fine">© 2026 Melee Dominicana · Sitio de fans, sin afiliación con Nintendo. Hecho por <a href="https://arcovaco.com" target="_blank" rel="noopener">Arcova</a>.</p>
  </footer>"""


def page(*, title, desc, path, img, og_type, main, jsonld, extra_meta=""):
    url = abs_url(path)
    ld = json.dumps(jsonld, ensure_ascii=False).replace("<", "\\u003c")
    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}" />
  <link rel="canonical" href="{esc(url)}" />
  <meta property="og:site_name" content="{NAME}" />
  <meta property="og:locale" content="es_DO" />
  <meta property="og:type" content="{og_type}" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(desc)}" />
  <meta property="og:url" content="{esc(url)}" />
  <meta property="og:image" content="{esc(abs_url(img))}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{esc(title)}" />
  <meta name="twitter:description" content="{esc(desc)}" />
  <meta name="twitter:image" content="{esc(abs_url(img))}" />{extra_meta}
  <meta name="theme-color" content="#07080f" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/noticias.css" />
  <script type="application/ld+json">{ld}</script>
</head>
<body>
  <a class="skip" href="#contenido">Saltar al contenido</a>
  {NAV}
  <main id="contenido" class="nw{' nw--wide' if og_type == 'website' else ''}">
{main}
  </main>
  {FOOT}
</body>
</html>
"""


def article_page(meta, body):
    slug, d = meta["slug"], meta["date"]
    path = f"noticias/{slug}/"
    img = meta["image"]
    tail = ""
    if meta.get("torneo"):
        tail = '\n<p><a href="/#torneos">Ver bracket y resultados en Torneos →</a></p>'
    main = f"""    <article>
      <p class="kicker">Noticias</p>
      <h1>{esc(meta['title'])}</h1>
      <p class="meta"><time datetime="{esc(d)}">{fecha_es(d)}</time> · {NAME}</p>
      <img class="cover" src="/{esc(img.lstrip('/'))}" alt="" width="1200" height="630" />
{markdown(body)}{tail}
    </article>
    <a class="back" href="/noticias/">← Todas las noticias</a>"""
    ld = {
        "@context": "https://schema.org", "@type": "NewsArticle",
        "headline": meta["title"], "description": meta["summary"],
        "datePublished": d, "dateModified": d, "inLanguage": "es-DO",
        "image": [abs_url(img)],
        "keywords": [t.strip() for t in meta.get("tags", "").split(",") if t.strip()] or DEFAULT_TAGS,
        "about": GAME,
        "mainEntityOfPage": {"@type": "WebPage", "@id": abs_url(path)},
        "author": {"@type": "Organization", "name": NAME, "url": SITE + "/"},
        "publisher": {"@type": "Organization", "name": NAME, "url": SITE + "/",
                      "logo": {"@type": "ImageObject", "url": abs_url("apple-touch-icon.png")}},
    }
    extra = f'\n  <meta property="article:published_time" content="{esc(d)}" />'
    return page(title=f"{meta['title']} | {NAME}", desc=meta["summary"], path=path, img=img,
                og_type="article", main=main, jsonld=ld, extra_meta=extra)


DEFAULT_TAGS = ["Super Smash Bros. Melee", "Esports", "Nintendo GameCube", "Slippi", "República Dominicana", "Torneos"]
GAME = {"@type": "VideoGame", "name": "Super Smash Bros. Melee", "gamePlatform": "Nintendo GameCube",
        "publisher": {"@type": "Organization", "name": "Nintendo"}}


def index_page(items):
    cards = "\n".join(f"""        <li><article class="ncard"><a href="/noticias/{esc(m['slug'])}/">
          <img src="/{esc(m['image'].lstrip('/'))}" alt="" width="1200" height="630" loading="lazy" />
          <div><time datetime="{esc(m['date'])}">{fecha_es(m['date'])}</time>
          <h2>{esc(m['title'])}</h2><p>{esc(m['summary'])}</p></div></a></article></li>""" for m in items)
    main = f"""    <p class="kicker">Blog de la comunidad</p>
    <h1>Noti<span class="gold">cias</span></h1>
    <p class="lede">Resúmenes de torneos, novedades y lo que pasa en la escena de Melee en República Dominicana.</p>
    <ul class="nlist">
{cards}
    </ul>"""
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": f"Noticias | {NAME}",
          "url": abs_url("noticias/"), "inLanguage": "es-DO",
          "hasPart": [{"@type": "NewsArticle", "headline": m["title"], "url": abs_url(f"noticias/{m['slug']}/"),
                       "datePublished": m["date"]} for m in items]}
    desc = "Noticias de Melee Dominicana: resúmenes de torneos, novedades y comunidad de Super Smash Bros. Melee en RD."
    return page(title=f"Noticias | {NAME}", desc=desc, path="noticias/", img=DEFAULT_IMG,
                og_type="website", main=main, jsonld=ld)


def sitemap(items):
    urls = [("", None)] + [("noticias/", max((m["date"] for m in items), default=None))]
    urls += [(f"noticias/{m['slug']}/", m["date"]) for m in items]
    rows = "".join(f"  <url><loc>{esc(abs_url(p))}</loc>" + (f"<lastmod>{d}</lastmod>" if d else "") + "</url>\n"
                   for p, d in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}</urlset>\n'


def main():
    items = [parse(p) for p in sorted(SRC.glob("*.md"))]
    items.sort(key=lambda x: (x[0]["date"], x[0]["slug"]), reverse=True)
    metas = [m for m, _ in items]
    out = PUB / "noticias"
    if out.exists():
        shutil.rmtree(out)  # solo contiene páginas generadas
    for meta, body in items:
        (out / meta["slug"]).mkdir(parents=True)
        (out / meta["slug"] / "index.html").write_text(article_page(meta, body), encoding="utf-8")
    (out / "index.html").write_text(index_page(metas), encoding="utf-8")
    (PUB / "sitemap.xml").write_text(sitemap(metas), encoding="utf-8")
    (PUB / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\nDisallow: /enviado.html\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    print(f"OK: {len(metas)} artículo(s), índice, sitemap.xml y robots.txt")


if __name__ == "__main__":
    main()
